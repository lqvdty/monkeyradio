# Monkey Radio India webapp

Design Component app that reads the live Mixcloud archive for
https://www.mixcloud.com/monkeyradioindia/ and plays shows in an embedded
Mixcloud player.

## Files

- `Monkey Radio India v2.dc.html` - the app (current design).
- `Monkey Radio India.dc.html` - the first, darker exploration (kept for reference).
- `support.js` - the Design Component runtime. Required.
- `assets/logo.png` - station logo.
- `_ds/modernist-.../` - the Modernist design system (tokens + bundle).

## Running locally

The live app is `index.html`. Its component code lives in `src/app.jsx` and
is compiled ahead of time to `assets/app.js` (see `scripts/build-app.mjs`) -
the browser never runs a JSX compiler, so that file has to exist before you
serve the app.

    npm install       # once, installs the Babel build dependency
    npm run dev       # builds assets/app.js, then serves on :8000

or, equivalently:

    node scripts/build-app.mjs
    python3 serve.py

`serve.py` gives client-side routes (`/about`, `/show/<slug>`, ...) the same
SPA fallback as Firebase Hosting; a plain `python3 -m http.server` 404s on
them. Re-run `npm run build` after editing `src/app.jsx` - the shipped
`index.html` only ever loads the compiled `assets/app.js`, not the source.

## How it works

- **Retrieval**: `sync()` in the logic class pages
  `api.mixcloud.com/monkeyradioindia/cloudcasts/?limit=100` following
  `paging.next`, painting progressively. The full normalised index is cached in
  localStorage under `mri.cloudcasts.v7`; on later loads it only re-crawls when
  the newest key changes. Bump the key when `norm()` or `djFrom()` changes.
- **Taxonomy**: `GENRES` and `MOODS` map Mixcloud tags to buckets using exact or
  whole-word matching; `STOP` holds show/station branding tags that must never
  count as genres.
- **Selectors**: `djFrom()` parses the DJ out of the show title (bar, dash,
  presents, feat, by), then rejects show strands via `NOT_A_DJ` and generic
  patterns. `djKey()` folds spelling and word-order variants.
- **Layout**: breakpoints come from a ResizeObserver on the root element
  (`sm <= 720 < md <= 1080 < lg`); mobile uses a hamburger and an inline detail
  page rather than a modal.
- **Player**: bottom Mixcloud iframe widget; radio mode listens for the widget's
  `ended` event and rolls the queue or the next filtered show.

User state (saved shows, queue, history, radio toggle) lives in localStorage
under `mri.prefs.v1`.
