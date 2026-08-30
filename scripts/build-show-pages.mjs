#!/usr/bin/env node
/* Prerenders /show/<slug>.html for every show in the Mixcloud archive, so a
 * link to a show unfurls on Facebook, X, WhatsApp, Slack, etc. with that
 * show's own artwork, title and selector - static crawlers do not run the
 * SPA, so the site-wide card is all they would otherwise see.
 *
 * Each file is index.html with only its <head> social tags rewritten; the
 * app still boots and opens the show exactly as the /show/** rewrite does.
 *
 * Also writes sitemap.xml, listing every one of those pages plus the site's
 * static routes, so crawlers are actually pointed at what this script just
 * built - see robots.txt, which already refers to it.
 *
 * Also writes assets/archive.json, a prebuilt snapshot of the whole
 * normalised archive the client can boot from instantly instead of paging
 * the Mixcloud API live on a cold visit - see sync() in src/app.jsx.
 *
 * Output (show/, sitemap.xml, assets/archive.json) is git-ignored and
 * regenerated in CI right before every deploy - see .github/workflows/*.yml
 * and the firebase.json predeploy hook.
 *
 *     node scripts/build-show-pages.mjs
 */
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { selector } from './lib/selector.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.monkeyradio.in';
const API = 'https://api.mixcloud.com/monkeyradioindia/cloudcasts/?limit=100';
const OUT = join(ROOT, 'show');

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Mirrors norm() in src/app.jsx field-for-field - this is what ships as
// assets/archive.json, and the client's localStorage cache (mri.cloudcasts.v7)
// is expected to be interchangeable with it. Keep the two in step.
function norm(c) {
  const pics = c.pictures || {};
  return {
    key: c.key, name: c.name || '', url: c.url, dj: selector(c),
    pic: pics.extra_large || pics.large || pics['640wx640h'] || 'assets/logo.png',
    created: c.created_time, len: c.audio_length || 0,
    plays: c.play_count || 0, favs: c.favorite_count || 0,
    tags: (c.tags || []).map((t) => (t.name || '').toLowerCase())
  };
}

// ---- Mixcloud archive -----------------------------------------------------
async function fetchAll() {
  const out = [];
  let next = API, guard = 0;
  while (next && guard++ < 60) {
    const res = await fetch(next);
    if (!res.ok) throw new Error(`Mixcloud API ${res.status} at ${next}`);
    const page = await res.json();
    const rows = page.data || [];
    if (!rows.length) break;
    out.push(...rows);
    next = page.paging && page.paging.next;
  }
  return out;
}

// ---- head rewrite -------------------------------------------------------
const slugOf = (key) => (key || '').replace(/^\/+|\/+$/g, '').split('/').pop();

function render(tpl, c) {
  const slug = slugOf(c.key);
  const dj = selector(c);
  const url = `${SITE}/show/${slug}`;
  const title = `${c.name}, selected by ${dj} · Monkey Radio India`;
  const tags = (c.tags || []).map((t) => (t.name || '').toLowerCase()).filter(Boolean).slice(0, 4);
  const desc = `${dj} on Monkey Radio India.` + (tags.length ? ` ${tags.join(', ')}.` : '') + ' Listen in the in-page player.';
  const pics = c.pictures || {};
  const img = pics.extra_large || pics.large || pics['640wx640h'] || `${SITE}/assets/og-image.png`;
  const alt = `${c.name} cover art`;
  const sub = (re, val) => { tpl = tpl.replace(re, val); };

  sub(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  sub(/(<meta name="description" content=")[^"]*(">)/, `$1${esc(desc)}$2`);
  sub(/(<link rel="canonical" href=")[^"]*(">)/, `$1${esc(url)}$2`);
  sub(/(<meta property="og:type" content=")[^"]*(">)/, `$1music.radio_station$2`);
  sub(/(<meta property="og:url" content=")[^"]*(">)/, `$1${esc(url)}$2`);
  sub(/(<meta property="og:title" content=")[^"]*(">)/, `$1${esc(title)}$2`);
  sub(/(<meta property="og:description" content=")[^"]*(">)/, `$1${esc(desc)}$2`);
  sub(/(<meta property="og:image" content=")[^"]*(">)/, `$1${esc(img)}$2`);
  // Mixcloud art is square, not the site card's 1200x630 - drop the hints
  // so each network measures the real file.
  sub(/<meta property="og:image:type"[^>]*>\n/, '');
  sub(/<meta property="og:image:width"[^>]*>\n/, '');
  sub(/<meta property="og:image:height"[^>]*>\n/, '');
  sub(/(<meta property="og:image:alt" content=")[^"]*(">)/, `$1${esc(alt)}$2`);
  sub(/(<meta name="twitter:title" content=")[^"]*(">)/, `$1${esc(title)}$2`);
  sub(/(<meta name="twitter:description" content=")[^"]*(">)/, `$1${esc(desc)}$2`);
  sub(/(<meta name="twitter:image" content=")[^"]*(">)/, `$1${esc(img)}$2`);
  sub(/(<meta name="twitter:image:alt" content=")[^"]*(">)/, `$1${esc(alt)}$2`);
  return { slug, html: tpl };
}

// ---- sitemap.xml ----------------------------------------------------------
// The station's own client-side-only pages (/saved) are left out - they
// show per-visitor localStorage state, not content a crawler should index.
const STATIC_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/archive', changefreq: 'daily', priority: '0.8' },
  { path: '/selectors', changefreq: 'weekly', priority: '0.6' },
  { path: '/about', changefreq: 'monthly', priority: '0.5' }
];

function buildSitemap(shows, slugFor) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = STATIC_ROUTES.map((r) => `  <url>\n    <loc>${SITE}${r.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`);
  for (const c of shows) {
    const slug = slugFor(c);
    if (!slug) continue;
    const lastmod = (c.updated_time || c.created_time || '').slice(0, 10) || today;
    urls.push(`  <url>\n    <loc>${SITE}/show/${slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

// ---- run ----------------------------------------------------------------
const tpl = readFileSync(join(ROOT, 'index.html'), 'utf8');
const raw = await fetchAll();
const seen = new Set();
const shows = raw.filter((c) => c && c.key && c.name && !seen.has(c.key) && seen.add(c.key));

if (shows.length < 50) throw new Error(`Only ${shows.length} shows returned; refusing to prune show/ pages.`);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let n = 0;
for (const c of shows) {
  const { slug, html } = render(tpl, c);
  if (!slug) continue;
  writeFileSync(join(OUT, `${slug}.html`), html);
  n++;
}
console.log(`Prerendered ${n} show pages into show/`);

writeFileSync(join(ROOT, 'sitemap.xml'), buildSitemap(shows, (c) => slugOf(c.key)));
console.log(`Wrote sitemap.xml (${STATIC_ROUTES.length} static routes + ${n} shows)`);

// ---- prebuilt archive index -----------------------------------------------
// Ships the whole normalised archive as a same-origin static file, in the
// exact shape the client's own localStorage cache uses (mri.cloudcasts.v7 -
// see CACHE_KEY in src/app.jsx), so a first-ever visit paints instantly from
// one fast request instead of paging the Mixcloud API ~10 times live. The
// client still checks Mixcloud for anything published after this build and
// only fetches the delta - see sync() in src/app.jsx.
const archiveItems = shows.map(norm);
writeFileSync(join(ROOT, 'assets', 'archive.json'), JSON.stringify({ ts: Date.now(), complete: true, items: archiveItems }));
console.log(`Wrote assets/archive.json (${archiveItems.length} shows)`);
