#!/usr/bin/env node
/* Prerenders /show/<slug>.html for every show in the Mixcloud archive, so a
 * link to a show unfurls on Facebook, X, WhatsApp, Slack, etc. with that
 * show's own artwork, title and selector - static crawlers do not run the
 * SPA, so the site-wide card is all they would otherwise see.
 *
 * Each file is index.html with its <head> social tags rewritten, a per-show
 * AudioObject JSON-LD block added, and a block of real crawlable content
 * (title, selector, date, runtime, genres, artwork, Mixcloud link) placed
 * inside #root - which the SPA clears on mount, so a visitor never dwells on
 * it but a non-JS crawler (most AI crawlers; Googlebot pre-render) reads it.
 * The app still boots and opens the show exactly as the /show/** rewrite does.
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
// assets/archive.json, and the client's localStorage cache (mri.cloudcasts.v8)
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

// "2026-08-01T14:16:32Z" -> "1 August 2026". Crawler-facing prose only; the
// machine-readable date goes in <time datetime> and JSON-LD untouched.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
function fmtDate(iso) {
  const d = new Date(iso || '');
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// audio_length (seconds) -> ISO 8601 duration ("PT1H38M") + a "98 min" label.
function durationParts(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  const iso = 'PT' + (h ? `${h}H` : '') + (m || !h ? `${m}M` : '');
  const label = h ? `${h} hr ${m} min` : `${m} min`;
  return { iso, label, minutes: Math.round(s / 60) };
}

// Real, crawlable page content injected inside #root. The SPA mounts with
// ReactDOM.createRoot(...).render(), which clears these children on boot, so
// this is what a non-JS crawler (most AI crawlers, and Googlebot before it
// renders) reads, and nothing a visitor sees for more than a blink.
function bodyBlock(c, { dj, url, img, alt, tags, desc }) {
  const when = fmtDate(c.created_time);
  const dur = durationParts(c.audio_length);
  const plays = Number(c.play_count) || 0;
  const favs = Number(c.favorite_count) || 0;
  const plural = (n, word) => `${n.toLocaleString('en-IN')} ${word}${n === 1 ? '' : 's'}`;
  const meta = [
    when && `<time datetime="${esc((c.created_time || '').slice(0, 10))}">${esc(when)}</time>`,
    dur.minutes && `${esc(dur.label)}`,
    plays && plural(plays, 'play'),
    favs && plural(favs, 'favourite')
  ].filter(Boolean).join(' &middot; ');
  const tagList = tags.length
    ? `<p class="pr-tags">Genres: ${tags.map((t) => esc(t)).join(', ')}</p>` : '';
  return `<div id="prerender" style="max-width:680px;margin:0 auto;padding:32px 20px;font-family:'Archivo',system-ui,sans-serif;color:#201e1d">
  <p style="font:600 11px/1 sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#6a6666;margin:0 0 16px">
    <a href="/" style="color:#ae1800">Monkey Radio India</a> &rsaquo; <a href="/archive" style="color:#ae1800">Archive</a>
  </p>
  <img src="${esc(img)}" alt="${esc(alt)}" width="600" height="600" style="max-width:100%;height:auto;border:1px solid #d7d3d3">
  <h1 style="font-weight:800;font-size:clamp(24px,5vw,38px);line-height:1.1;letter-spacing:-.03em;margin:20px 0 8px">${esc(c.name)}</h1>
  <p style="font-size:15px;margin:0 0 4px">${dj ? `Selected by <strong>${esc(dj)}</strong> for Monkey Radio India.` : 'Aired on <strong>Monkey Radio India</strong>.'}</p>
  <p style="font:600 12px/1.5 sans-serif;color:#6a6666;margin:0 0 16px">${meta}</p>
  <p style="font-size:15px;line-height:1.6;margin:0 0 16px">${esc(desc)}</p>
  ${tagList}
  <p style="margin:20px 0 0"><a href="${esc(c.url || url)}" rel="noopener" style="color:#ae1800;font-weight:600">Listen to this show on Mixcloud</a></p>
</div>`;
}

// Per-show JSON-LD. The template already carries a site-wide RadioStation
// block; this adds an AudioObject for the show itself so it can surface as
// its own result / be cited on its own.
function showLd(c, { dj, url, img, tags }) {
  const dur = durationParts(c.audio_length);
  const node = {
    '@context': 'https://schema.org',
    '@type': 'AudioObject',
    name: c.name,
    url,
    contentUrl: c.url,
    embedUrl: `https://www.mixcloud.com/widget/iframe/?feed=${encodeURIComponent(c.key)}`,
    thumbnailUrl: img,
    uploadDate: c.created_time,
    duration: dur.iso,
    inLanguage: 'en',
    isPartOf: {
      '@type': 'RadioStation',
      name: 'Monkey Radio India',
      url: `${SITE}/`
    },
    publisher: { '@type': 'Organization', name: 'Monkey Foundation' }
  };
  if (dj) node.creator = { '@type': 'Person', name: dj };
  if (tags.length) node.genre = tags;
  if (Number(c.play_count)) {
    node.interactionStatistic = {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/ListenAction',
      userInteractionCount: Number(c.play_count)
    };
  }
  return `<script type="application/ld+json">\n${JSON.stringify(node, null, 2)}\n</script>`;
}

function render(tpl, c) {
  const slug = slugOf(c.key);
  const dj = selector(c);
  const hasDj = dj !== 'Monkey Radio India';
  const url = `${SITE}/show/${slug}`;
  const title = `${c.name}, selected by ${dj} · Monkey Radio India`;
  const djFlat = dj.toLowerCase().replace(/[^a-z0-9]/g, '');
  const tags = (c.tags || []).map((t) => (t.name || '').toLowerCase()).filter(Boolean)
    .filter((t) => { const f = t.replace(/[^a-z0-9]/g, ''); return f && f.indexOf('monkeyradio') < 0 && f !== djFlat; })
    .slice(0, 4);
  const desc = `${dj} on Monkey Radio India.` + (tags.length ? ` ${tags.join(', ')}.` : '') + ' Listen in the in-page player.';
  const pics = c.pictures || {};
  const img = pics.extra_large || pics.large || pics['640wx640h'] || `${SITE}/assets/og-image.png`;
  const alt = `${c.name} cover art`;
  const when = fmtDate(c.created_time);
  const dur = durationParts(c.audio_length);
  const prose = `${c.name} is a ${dur.minutes ? `${dur.label} ` : ''}`
    + `${tags.length ? `${tags.slice(0, 3).join(', ')} ` : ''}set`
    + `${hasDj ? ` selected by ${dj}` : ''}`
    + `${when ? `, first aired ${when}` : ''} on Monkey Radio India, `
    + 'independent community radio and sound system culture out of Hyderabad. '
    + 'Stream it in the in-page player or on Mixcloud.';
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

  // Per-show structured data, right after the template's site-wide block.
  sub(/(<\/script>\n)(<link rel="icon")/, `$1${showLd(c, { dj: hasDj ? dj : null, url, img, tags })}\n$2`);
  // Crawlable body content inside #root (the SPA clears it on mount).
  sub(/<div id="root"><\/div>/, `<div id="root">${bodyBlock(c, { dj: hasDj ? dj : null, url, img, alt, tags, desc: prose })}</div>`);

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
// exact shape the client's own localStorage cache uses (mri.cloudcasts.v8 -
// see CACHE_KEY in src/app.jsx), so a first-ever visit paints instantly from
// one fast request instead of paging the Mixcloud API ~10 times live. The
// client still checks Mixcloud for anything published after this build and
// only fetches the delta - see sync() in src/app.jsx.
const archiveItems = shows.map(norm);
writeFileSync(join(ROOT, 'assets', 'archive.json'), JSON.stringify({ ts: Date.now(), complete: true, items: archiveItems }));
console.log(`Wrote assets/archive.json (${archiveItems.length} shows)`);
