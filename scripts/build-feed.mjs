#!/usr/bin/env node
/* Generates feed.xml - an RSS 2.0 feed of the Monkey Radio India archive,
 * so people can subscribe to new shows in any feed reader.
 *
 * Mixcloud's free API exposes no downloadable audio, so this is NOT a
 * podcast feed with <enclosure> media - each <item> links to the show's
 * Mixcloud page. Run on a schedule from CI (see .github/workflows/build-feed.yml)
 * and commit the result.
 *
 *     node scripts/build-feed.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.monkeyradio.in';
const API = 'https://api.mixcloud.com/monkeyradioindia/cloudcasts/?limit=100';
const MAX_ITEMS = 60;

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const fmtLen = (s) => {
  s = Math.round(s || 0);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h} hr ${m} min` : `${m} min`;
};

async function fetchAll() {
  const out = [];
  let next = API, guard = 0;
  while (next && guard++ < 40) {
    const res = await fetch(next);
    if (!res.ok) throw new Error(`Mixcloud API ${res.status} at ${next}`);
    const page = await res.json();
    const rows = page.data || [];
    if (!rows.length) break;
    out.push(...rows);
    next = page.paging && page.paging.next;
    if (out.length >= MAX_ITEMS && guard >= 1) break;
  }
  return out;
}

function item(c) {
  const link = c.url || `${SITE}/`;
  const tags = (c.tags || []).map((t) => t.name).filter(Boolean);
  const bits = [];
  if (c.user && c.user.name) bits.push(`Selector: ${c.user.name}`);
  if (c.audio_length) bits.push(fmtLen(c.audio_length));
  if (tags.length) bits.push(tags.join(', '));
  bits.push('Listen on Mixcloud.');
  const desc = bits.join(' - ');
  const pub = c.created_time ? new Date(c.created_time).toUTCString() : new Date().toUTCString();
  const img = c.pictures && (c.pictures.extra_large || c.pictures.large);
  return [
    '    <item>',
    `      <title>${esc(c.name)}</title>`,
    `      <link>${esc(link)}</link>`,
    `      <guid isPermaLink="true">${esc(link)}</guid>`,
    `      <pubDate>${pub}</pubDate>`,
    `      <description>${esc(desc)}</description>`,
    ...tags.map((t) => `      <category>${esc(t)}</category>`),
    img ? `      <media:thumbnail url="${esc(img)}"/>` : '',
    '    </item>'
  ].filter(Boolean).join('\n');
}

const raw = await fetchAll();
const seen = new Set();
const items = raw
  .filter((c) => c && c.key && !seen.has(c.key) && seen.add(c.key))
  .sort((a, b) => new Date(b.created_time) - new Date(a.created_time))
  .slice(0, MAX_ITEMS);

if (!items.length) throw new Error('No cloudcasts returned; refusing to write an empty feed.');

const now = new Date().toUTCString();
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Monkey Radio India</title>
    <link>${SITE}/</link>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Independent and colourful radio out of Hyderabad. New shows from the Monkey Radio India Mixcloud archive.</description>
    <language>en-in</language>
    <lastBuildDate>${now}</lastBuildDate>
    <generator>scripts/build-feed.mjs</generator>
    <image>
      <url>${SITE}/assets/icon-512.png</url>
      <title>Monkey Radio India</title>
      <link>${SITE}/</link>
    </image>
${items.map(item).join('\n')}
  </channel>
</rss>
`;

writeFileSync(join(ROOT, 'feed.xml'), xml);
console.log(`feed.xml written - ${items.length} items, newest: ${items[0].name}`);
