#!/usr/bin/env node
/* Generates AVIF + WebP siblings for the static, hand-authored image
 * assets that are actually painted on every page load (not the Mixcloud
 * cover art, which is remote and already served pre-optimised by
 * thumbnailer.mixcloud.com).
 *
 * Unlike scripts/build-app.mjs and build-show-pages.mjs, this is not part
 * of the deploy pipeline - these are checked-in creative assets, not data
 * regenerated from the live archive. Run it by hand whenever one of the
 * source PNGs below changes, and commit the results alongside it.
 *
 *     node scripts/optimize-images.mjs
 */
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');

// The footer / About-page sound-system illustration - the only
// hand-authored image the app paints on first load, at up to 1MB combined
// for the 1x/2x pair. Referenced via CSS image-set() in src/app.jsx, which
// lists these AVIF/WebP siblings ahead of the PNG fallback.
const SOURCES = ['monkey-sound-system.png', 'monkey-sound-system@2x.png'];

const kb = (path) => (statSync(path).size / 1024).toFixed(0) + 'KB';

for (const file of SOURCES) {
  const src = join(ASSETS, file);
  const stem = file.replace(/\.png$/, '');
  const avifOut = join(ASSETS, `${stem}.avif`);
  const webpOut = join(ASSETS, `${stem}.webp`);

  await sharp(src).avif({ quality: 55 }).toFile(avifOut);
  await sharp(src).webp({ quality: 78 }).toFile(webpOut);

  console.log(`${file}: ${kb(src)} PNG -> ${kb(avifOut)} AVIF, ${kb(webpOut)} WebP`);
}
