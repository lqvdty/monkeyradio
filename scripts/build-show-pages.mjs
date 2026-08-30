#!/usr/bin/env node
/* Prerenders /show/<slug>.html for every show in the Mixcloud archive, so a
 * link to a show unfurls on Facebook, X, WhatsApp, Slack, etc. with that
 * show's own artwork, title and selector - static crawlers do not run the
 * SPA, so the site-wide card is all they would otherwise see.
 *
 * Each file is index.html with only its <head> social tags rewritten; the
 * app still boots and opens the show exactly as the /show/** rewrite does.
 *
 * Output (show/) is git-ignored and regenerated in CI right before every
 * deploy - see .github/workflows/*.yml and the firebase.json predeploy hook.
 *
 *     node scripts/build-show-pages.mjs
 */
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.monkeyradio.in';
const API = 'https://api.mixcloud.com/monkeyradioindia/cloudcasts/?limit=100';
const OUT = join(ROOT, 'show');

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// ---- selector attribution (kept in step with djFrom() in index.html) -------
const NOT_A_DJ = ['indiearth', 'monkey radio', 'monkeyradio', 'monkey sound', 'tune inn', 'souls of sound', 'music manthan', 'disco freak', 'bass sanskriti', 'dub vibration', 'roots unwired', 'daktadub', 'dakta dub', 'hyderabad underground movement', 'hyderabad hi fi', 'hi fi hyderabad', 'sunday special', 'sunday live', 'excursions in', 'guest mix', 'radio show', 'podcast'];
const ALIASES = ['dj def hawk', 'selekta chakkra', 'dj amul', 'psylenz', 'berencz balazs', 'dj makarun'];
const GENERIC = ['the', 'a', 'of', 'and', 'in', 'on', 'for', 'my', 'our', 'your', 'music', 'musical', 'journey', 'transmission', 'world', 'day', 'vibration', 'vibes', 'special', 'session', 'sessions', 'sound', 'sounds', 'radio', 'show', 'mix', 'mixes', 'set', 'selection', 'live', 'dancehall', 'funk', 'bass', 'soul', 'jazz', 'dub', 'house', 'techno', 'hip', 'hop', 'rap', 'reggae', 'disco', 'edition', 'episode', 'vol', 'volume', 'part', 'night', 'weekend', 'sunday', 'monday', 'friday', 'saturday', 'summer', 'winter', 'new', 'best', 'top'];
const flat = (x) => (x || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function djFrom(raw) {
  let s = (raw || '').replace(/│/g, '|').trim();
  const alias = ALIASES.find((a) => flat(s).indexOf(flat(a)) === 0);
  if (alias) return alias.replace(/\b\w/g, (c) => c.toUpperCase());
  const bar = s.split('|');
  const barred = bar.length > 1 && bar[0].trim().length > 1;
  if (barred) s = bar[0].trim();
  let cand = null;
  { const m = s.match(/\bby\s+([A-Za-z][^|,]{1,34})$/i); if (m) cand = m[1]; }
  if (!cand) { const i = s.indexOf(' - '); if (i > 1 && i < 52) cand = s.slice(0, i); }
  if (!cand) { const m = s.match(/^(.{2,46}?)\s+(?:presents|present|pres\.?)\s+/i); if (m) cand = m[1]; }
  if (!cand) { const m = s.match(/^(.{2,46}?)\s+(?:feat\.?|ft\.?|w\/)\s+/i); if (m) cand = m[1]; }
  if (!cand && barred) cand = s;
  if (!cand) return null;
  cand = cand.replace(/\s+(?:feat\.?|ft\.?|w\/|with)\s+.*$/i, '');
  cand = cand.replace(/\s*\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\s*$/, '');
  cand = cand.replace(/\s*\b(?:19|20)\d{2}\b\s*$/, '');
  cand = cand.split(' - ')[0];
  const w = cand.match(/\b(?:with|w\/)\s+(.{2,36})$/i);
  if (w) cand = w[1];
  cand = cand.replace(/^[\s\-–_.,:]+/, '').replace(/[\s\-–_.,:]+$/, '').trim();
  cand = cand.replace(/\s{2,}/g, ' ');
  if (cand.length < 2 || cand.length > 44) return null;
  if (/^\d+$/.test(cand)) return null;
  const fc = flat(cand);
  if (NOT_A_DJ.some((n) => fc.indexOf(flat(n)) >= 0)) return null;
  if (/monkey/i.test(cand)) return null;
  if (/^\d{1,2}[-./]\d{1,2}[-./]\d{2,4}/.test(cand) || cand.indexOf('__') >= 0) return null;
  if (cand.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean).every((x) => GENERIC.indexOf(x) >= 0)) return null;
  if (/\b(fm|f\.m\.|radio|station)\b/i.test(cand)) return null;
  if (/\b\d+\s*(st|nd|rd|th)\s+(anniversary|birthday|edition)\b/i.test(cand)) return null;
  if (/\b(special|episode|vol|volume|part|mixtape|session|mix|mixes|show|set|selection|takeover|edition)\b\s*\d*$/i.test(cand)) return null;
  if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(cand)) return null;
  return cand;
}

function selector(c) {
  let dj = djFrom(c.name || '');
  if (!dj && c.user && c.user.name && c.user.name !== 'Monkey Radio India') dj = c.user.name;
  return dj || 'Monkey Radio India';
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
