/* Monkey Radio India - app source.
 *
 * Compiled ahead of time (JSX -> React.createElement) into assets/app.js by
 * scripts/build-app.mjs, which runs before every deploy - see the
 * firebase.json predeploy hook and .github/workflows/*.yml. The browser
 * never runs a JSX compiler; only the plain React + ReactDOM UMD builds and
 * this file's compiled output ship to production.
 *
 * Assumes React, ReactDOM and window.Mixcloud are already on the page
 * (index.html loads their UMD builds before this script) and runs as a
 * classic script, not a module - every name here is a global.
 *
 *     node scripts/build-app.mjs      # writes assets/app.js
 */
const { useState, useEffect, useRef } = React;

/* Parse an inline CSS string into a React style object (the design authored
   every rule as a style string; this keeps the port faithful). */
function css(str) {
  const o = {};
  String(str || '').split(';').forEach(d => {
    const i = d.indexOf(':');
    if (i < 0) return;
    const p = d.slice(0, i).trim();
    if (!p) return;
    const val = d.slice(i + 1).trim();
    o[p.startsWith('--') ? p : p.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = val;
  });
  return o;
}
const st = (str, extra) => Object.assign(css(str), extra || {});

// The footer / About-page sound-system illustration, the one hand-authored
// image the app paints on first load - AVIF and WebP siblings (built by
// scripts/optimize-images.mjs) ahead of the PNG fallback, at both
// densities. image-set() filters options by type() support before
// resolution, so an unsupported format is skipped rather than blocking on it.
const SOUND_SYSTEM_BG = "image-set(" +
  "url(assets/monkey-sound-system.avif) type('image/avif') 1x, " +
  "url(assets/monkey-sound-system@2x.avif) type('image/avif') 2x, " +
  "url(assets/monkey-sound-system.webp) type('image/webp') 1x, " +
  "url(assets/monkey-sound-system@2x.webp) type('image/webp') 2x, " +
  "url(assets/monkey-sound-system.png) 1x, " +
  "url(assets/monkey-sound-system@2x.png) 2x)";

/* Album art (every show cover) is fetched from Mixcloud's CDN and can take
   a moment to arrive. Painting an empty <img>/tile in the meantime is what
   made the layout look broken - the box has no content, borders and
   surrounding text settle late. So every cover renders through <ArtImg> /
   <ArtBg>: they show a bundled placeholder immediately (a data-URI SVG that
   lives in this bundle - no network, always instant) at the final box size,
   then preload the real image off-DOM and fade it in once it has decoded.
   Nothing around the cover moves; only the picture inside it changes. */
const ART_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='16'%20height='16'%3E" +
  "%3Crect%20width='16'%20height='16'%20fill='%23eae9e9'/%3E%3C/svg%3E";
const ART_PLACEHOLDER_BG = 'url("' + ART_PLACEHOLDER + '")';

// Accept a bare URL, a `url(...)` wrapper or the literal 'none' and return
// the bare URL ('' for nothing to load).
function artUrl(v) {
  if (!v || v === 'none') return '';
  const m = /^url\((['"]?)([\s\S]*?)\1\)$/.exec(String(v).trim());
  return m ? m[2] : String(v);
}

// Preload `url` off-DOM; returns true once it has loaded. A falsy url just
// keeps the placeholder. Re-runs when the url changes (detail view, player).
function useArtLoaded(url) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!url) { setLoaded(false); return; }
    let live = true;
    const img = new Image();
    const done = () => { if (live) setLoaded(true); };
    img.onload = done;
    img.onerror = () => {};
    img.src = url;
    if (img.complete && img.naturalWidth) done();
    else setLoaded(false);
    return () => { live = false; img.onload = img.onerror = null; };
  }, [url]);
  return loaded;
}

// <img> slot: same props as a plain <img> (src, alt, loading, style, …).
// Renders the placeholder at the caller's exact box size, then swaps in the
// real cover once it has decoded - the <img> element never changes size, so
// borders and neighbouring text never reflow. The `.mri-artimg` class (see
// index.html) fades the swap where motion is allowed.
function ArtImg(props) {
  const { src, style, className, ...rest } = props;
  const url = artUrl(src);
  const loaded = useArtLoaded(url);
  return (
    <img
      {...rest}
      className={className ? className + ' mri-artimg' : 'mri-artimg'}
      data-art={loaded ? 'on' : 'wait'}
      src={loaded ? url : ART_PLACEHOLDER}
      style={style || undefined}
    />
  );
}

// background-image cover tile. `base` is the inline style string the call
// site used to pass to st(); `tag` picks the element (div/button).
function ArtBg(props) {
  const { url, base, tag, style, children, ...rest } = props;
  const real = artUrl(url);
  const loaded = useArtLoaded(real);
  const bg = loaded ? 'url("' + real + '")' : ART_PLACEHOLDER_BG;
  return React.createElement(
    tag || 'div',
    Object.assign({}, rest, {
      style: st(base || '', Object.assign({backgroundImage: bg}, style || {}))
    }),
    children
  );
}

class Component extends React.Component {
  // Show/DJ/station branding tags, never treated as genres.
  STOP = ['monkey radio india','monkeyradioindia','monkey radio','hyderabad','india','daktadub','dakta dub','dakta-dub','roots unwired','dub vibration','mr nobody','mrnobody','tune inn','souls of sound','psylenz','selekta chakkra','music manthan','disco freak','bass sanskriti','hyderabad underground movement','dj amul','dj def hawk','funk assassin','monkey sound system','radio','radio show','mix','dj mix','podcast','live','guest mix','india radio','underground'];
  // `id` is the short internal key used everywhere in the code; `slug` is the
  // reader-friendly token that appears in the URL (?genre=techno, not ?genre=house).
  // routeToPath()/routeFromLocation() translate between the two; old ?genre=<id>
  // links still resolve.
  GENRES = [
    {id:'hiphop', slug:'hip-hop', label:'Hip Hop & Rap', tags:['hip hop','hip-hop','hiphop','rap','boom bap','boombap','old school hip hop','underground hip hop','g-funk','g funk','west coast hip hop','east coast hip hop','instrumental hip hop','turntablism','trap','conscious hip hop','90s hip hop','golden era','scratch']},
    {id:'funk', slug:'funk-soul-disco', label:'Funk, Soul & Disco', tags:['funk','soul','r&b','rnb','r and b','disco','nu disco','motown','northern soul','boogie','rare groove','neo soul','soul funk','funk soul','1970s','1980s','70s','80s soul']},
    {id:'afro', slug:'world', label:'Indian Classical & World', tags:['indian classical','carnatic','hindustani','raga','raag','sitar','tabla','sarod','bansuri','classical indian','desi','bhangra','bollywood','sufi','qawwali','folk','afrobeat','afrobeats','afro house','afro','afrofunk','world','world music','latin','cumbia','reggaeton','salsa','arabic','balkan','ethiopian','ethio jazz','highlife','tropical','global bass','fusion']},
    {id:'house', slug:'techno', label:'Techno', tags:['house','techno','deep house','tech house','minimal','minimal techno','electro','edm','dance','acid','acid house','disco house','progressive house','electronica','electronic','melodic techno','dub techno','dubtechno','italo','detroit techno']},
    {id:'psy', slug:'psychedelic', label:'Psychedelic', tags:['psychill','psy chill','psydub','psy dub','psybient','psytrance','psy trance','goa','goa trance','ambient','ambient dub','chillgressive','forest psy','organic house','ethnic ambient','dark psy','downtempo psy','indie','psychedelic','psychedelia','pszichedelia','psyamb','psy amb','psybass','psystep','psy glitchstep']},
    {id:'reggae', slug:'dub-reggae', label:'Dub & Reggae', tags:['reggae','dub','dancehall','ska','roots reggae','rocksteady','riddim','dub reggae','steppers','lovers rock','ragga','reggae roots','uk dub','sound system']},
    {id:'chill', slug:'downtempo', label:'Downtempo & Chill', tags:['lofi','lo-fi','lo fi','chillout','chill','chill out','downtempo','trip hop','triphop','jazz hop','beats','lounge','balearic']},
    {id:'jazz', slug:'jazz-blues', label:'Jazz & Blues', tags:['jazz','blues','bossa nova','bossa','latin jazz','swing','soul jazz','spiritual jazz','free jazz','jazz funk','nu jazz','afro jazz']},
    {id:'bass', slug:'jungle-dnb-bass', label:'Jungle, D&B & Bass', tags:['drum and bass','drum & bass','drum n bass','dnb','d&b','jungle','breakbeat','breaks','garage','uk garage','dubstep','bass','bass music','grime','footwork','halftime','neurofunk']},
    {id:'experimental', slug:'experimental', label:'Experimental', tags:['experimental','experimental ambient','experimental electronic','experimental dub','drone','dark ambient','idm','glitch','musique concrete','avant-garde','avant garde','leftfield','noise','abstract','field recording','field recordings','sound art','sound collage','plunderphonics','tape music','microsound','chidakasha','transmission','transmissions','swatantram','by velugu']},
    {id:'vinyl', slug:'vinyl-only', label:'Vinyl Only', tags:['vinyl only','vinyl','all vinyl','45s','7 inch','vinyl mix','vinyl set','wax']},
    {id:'pop', slug:'pop-classics', label:'Pop & Classics', tags:['pop','90s','classics','oldies','retro','1990s','throwback','mashup','party','synthpop','city pop','80s pop']}
  ];
  // Shows the tag-scoring in primaryGenre() gets wrong (missing tag
  // vocabulary, or a genuine tie the score can't break). Title pattern ->
  // genre id; checked before scoring. First match wins. Also carries a few
  // whole-series rules where the tags drift genre to genre across episodes.
  GENRE_OVERRIDES = [
    [/indiearth\s*-\s*monkey radio india\s*-\s*cloudcast\s*-\s*march 2014/i, 'afro'],
    [/5th anniversary.*showcase\s*-\s*papa 31\.10\.2017/i, 'psy'],
    [/di+sco freak/i, 'funk'],
    [/^roots unwired 22\.11\.2014$/i, 'reggae'],
    [/^souls of sound 14\.08\.2013$/i, 'psy'],
    [/^funk assassin episode 10\b/i, 'bass'],
    [/\bmalz\b/i, 'bass'],
    [/^transmission 13\.05\.2015$/i, 'psy'],
    [/^sunday special ft dj na 12\.11\.2017$/i, 'funk'],
    [/^hyderabad hi fi 23\.09\.2016$/i, 'hiphop']
  ];
  // Fallback bucketing, checked only when tag-scoring finds nothing (unlike
  // GENRE_OVERRIDES, which wins outright). These recurring shows are dub /
  // reggae / sound-system sets end to end, but many early episodes are tagged
  // with station / show branding only (all in STOP), so they score zero. An
  // episode of the same series that does score a genre from its tags keeps it.
  // Series name matched in any spelling / word order.
  GENRE_FALLBACKS = [
    [/dub\s*vibr/i, 'reggae'],
    [/roots\s*unwired/i, 'reggae'],
    [/tune\s*inn/i, 'reggae'],
    [/music manthan/i, 'reggae'],
    [/hi[\s-]*fi hyderabad|hyderabad hi[\s-]*fi/i, 'reggae'],
    [/steppin.? outta babylon/i, 'reggae'],
    [/dr\.?dub/i, 'reggae'],
    [/dub chakra/i, 'reggae'],
    [/rain dub/i, 'reggae'],
    [/hip hop mix by dj def hawk/i, 'hiphop'],
    [/souls of sound/i, 'psy'],
    [/deep space travellers/i, 'psy'],
    [/puri juggernaut/i, 'psy'],
    [/swatantram/i, 'experimental'],
    [/ziggy.{0,3}blunts/i, 'reggae'],
    // Catch-all: anything still unscored is a station one-off, guest slot or
    // untagged upload - park it on Indian Classical & World rather than
    // leaving it out of every shelf. Must stay last.
    [/(?:)/, 'afro']
  ];
  MOODS = [
    {id:'latenight', label:'Late night', tags:['deep house','techno','downtempo','ambient','dub','trip hop','triphop','minimal','lofi','psydub','dub techno','underground hip hop','melodic techno']},
    {id:'monsoon', label:'Monsoon', tags:['lofi','lo-fi','ambient','downtempo','dub','trip hop','chillout','psychill','psydub','ambient dub','bossa nova','soul','jazz','indian classical','hindustani','carnatic']},
    {id:'sunday', label:'Sunday morning', tags:['soul','jazz','bossa nova','blues','chillout','r&b','lounge','funk','balearic','nu jazz']},
    {id:'party', label:'Party', tags:['funk','disco','house','afrobeat','afrobeats','dancehall','party','hip hop','pop','mashup','edm','tech house','breakbeat']},
    {id:'cratedig', label:'Crate digger', tags:['vinyl only','vinyl','old school hip hop','rare groove','45s','oldies','soul jazz','1970s','boogie','northern soul']},
    {id:'focus', label:'Focus', tags:['instrumental hip hop','ambient','jazz','lofi','beats','minimal','downtempo','psychill','organic house']}
  ];
  CACHE_KEY = 'mri.cloudcasts.v8';
  PREF_KEY = 'mri.prefs.v1';
  RESUME_KEY = 'mri.resume.v1';
  PROG_KEY = 'mri.progress.v1';

  _measure = (w) => {
    const width = w || (this._root && this._root.clientWidth) || document.documentElement.clientWidth;
    if (!width) return;
    const b = width <= 720 ? 'sm' : width <= 1080 ? 'md' : 'lg';
    if (b !== this.state.bp) this.setState({bp: b});
    // The full desktop header (brand + 5-item nav + search + Tune in) only
    // fits above ~940px. Below that - but still wider than a phone - collapse
    // the nav and search into the slide-out menu, without tripping the rest
    // of the sm-only mobile layout.
    const hMenu = width <= 940;
    if (hMenu !== this.state.hMenu) this.setState({hMenu});
    if (this._headEl) {
      const h = this._headEl.offsetHeight;
      if (h && h !== this.state.headH) this.setState({headH: h});
    }
  };
  _onResize = () => this._measure();
  attachRoot = (el) => {
    if (!el || el === this._root) return;
    this._root = el;
    const view = (el.ownerDocument && el.ownerDocument.defaultView) || window;
    if (view.ResizeObserver) {
      if (this._ro) this._ro.disconnect();
      this._ro = new view.ResizeObserver((entries) => {
        const e = entries[0];
        this._measure(e && e.contentRect ? e.contentRect.width : 0);
      });
      this._ro.observe(el);
      view.addEventListener('resize', this._onResize);
    }
    this._measure(el.clientWidth);
  };

  state = {
    items: [], indexing: false, view: 'home', query: '', genre: null, mood: null, dj: null,
    sort: 'latest', limit: 48, detailKey: null, descs: {}, secs: {}, nowKey: null, tab: 'favs', headH: 0,
    favs: [], queue: [], history: [], shared: false, bp: 'lg', hMenu: false, menuOpen: false, filtersOpen: false,
    paused: false, playerExpanded: false, toast: '', heroIdx: 0,
    // Set when the hidden Mixcloud <iframe> fails to come up (blocked,
    // offline, widget API never resolves). Swaps the custom scrubber for
    // an "open on Mixcloud" fallback. Cleared on the next healthy tick.
    playerErr: false,
    // Seconds a returning show was resumed to. Non-zero shows a transient
    // "Resumed from mm:ss · Start over" pill; cleared on Start over, the
    // dismiss button, a show change, or a timeout.
    resumeAt: 0,
    // Sleep timer, ephemeral: null | {type:'show'} | {type:'time', mins, at}.
    sleep: null,
    // Auto-generated station lineup, kept topped up to 3 at all times.
    // Ephemeral: never written to prefs, unlike the user's `queue`.
    upNext: [],
    // Ambient mode: a fullscreen, distraction-free now-playing view (a
    // venue counter display, a second monitor, anyone who wants the app
    // out of the way). Ephemeral, and layered as an overlay rather than a
    // real view swap - see enterAmbient() - so the persistent player
    // (and its live Mixcloud iframe) never unmounts underneath it.
    ambient: false, ambientRef: null
  };

  // One of the four colourways, picked once per load for the Station page.
  aboutLogo = ['green', 'jamaica', 'original', 'grayscale'][Math.floor(Math.random() * 4)];

  // Transient bottom-of-screen confirmation (mobile has no room for inline copy).
  flash(msg) {
    clearTimeout(this._toastT);
    this.setState({ toast: msg });
    this._toastT = setTimeout(() => this.setState({ toast: '' }), 1900);
  }

  // ---- URL routing -------------------------------------------------
  // The bits of state that name a "page" get mirrored into a real path
  // (/about, /selectors, /saved, /archive?genre=techno, /show/<slug>) so
  // pages are linkable, bookmarkable and back/forward works. Every handler
  // still just calls setState; componentDidUpdate pushes the URL after.
  // Internal view ids stay short; the URL slug matches the menu label.
  // Disabled under file:// (History API needs http[s]).
  ROUTE_VIEWS = ['home', 'browse', 'djs', 'library', 'about', 'legal'];
  VIEW_TO_SLUG = {browse: 'archive', djs: 'selectors', library: 'saved', about: 'about', legal: 'legal'};
  SLUG_TO_VIEW = {archive: 'browse', selectors: 'djs', saved: 'library', about: 'about', legal: 'legal'};
  _routing = typeof location !== 'undefined' && /^https?:$/.test(location.protocol);

  slugOf(key) { return (key || '').replace(/^\/+|\/+$/g, '').split('/').pop(); }

  // genre id (internal) <-> genre slug (URL). Unknown values pass through, so a
  // legacy ?genre=<id> link still resolves and a bad slug just yields no match.
  genreSlug(id) { const g = this.GENRES.find(x => x.id === id); return g ? g.slug : id; }
  genreId(slug) {
    if (!slug) return slug;
    const g = this.GENRES.find(x => x.slug === slug || x.id === slug);
    return g ? g.id : slug;
  }

  routeToPath(s) {
    if (s.ambient) return '/ambient' + (s.ambientRef ? '?ref=' + encodeURIComponent(s.ambientRef) : '');
    if (s.detailKey) return '/show/' + this.slugOf(s.detailKey);
    const qs = new URLSearchParams();
    if (s.genre) qs.set('genre', this.genreSlug(s.genre));
    if (s.mood) qs.set('mood', s.mood);
    if (s.dj) qs.set('dj', s.dj);
    if (s.query) qs.set('q', s.query);
    const base = s.view === 'home' ? '/' : '/' + (this.VIEW_TO_SLUG[s.view] || s.view);
    const q = qs.toString();
    return q ? base + '?' + q : base;
  }

  routeFromLocation() {
    const parts = location.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
    const q = new URLSearchParams(location.search);
    if (parts[0] === 'ambient') return {_ambient: true, ambientRef: q.get('ref') || null};
    if (parts[0] === 'show' && parts[1]) return {_showSlug: decodeURIComponent(parts[1])};
    const view = this.SLUG_TO_VIEW[parts[0]] || (this.ROUTE_VIEWS.indexOf(parts[0]) >= 0 ? parts[0] : 'home');
    return {view, detailKey: null, genre: this.genreId(q.get('genre')), mood: q.get('mood'), dj: q.get('dj'), query: q.get('q') || ''};
  }

  resolveShowSlug(slug) {
    const it = this.state.items.find(m => this.slugOf(m.key) === slug);
    return it ? it.key : null;
  }

  applyRoute() {
    if (!this._routing) return;
    const r = this.routeFromLocation();
    this._pendingShowSlug = null;
    // Back/forward hop: if the entry we're landing on carries a scroll position
    // (stamped by syncUrl when we navigated away from it), restore it once the
    // view re-renders. Leaving a detail with nothing stamped -> top.
    const savedY = (history.state && typeof history.state.scrollY === 'number') ? history.state.scrollY : null;
    if (savedY != null) this._pendingScroll = savedY;
    else if (this.state.detailKey && !r._showSlug && !r._ambient) this._scrollTop = true;
    if (r._ambient) {
      if (!this.state.ambient) this.enterAmbient(r.ambientRef, 'direct_url');
      else this.setState({ambient: true, ambientRef: r.ambientRef});
      return;
    }
    if (this.state.ambient) this.exitAmbient('back');
    if (r._showSlug) {
      const key = this.resolveShowSlug(r._showSlug);
      if (key) this.setState({detailKey: key, ambient: false});
      else { this._pendingShowSlug = r._showSlug; this.setState({ambient: false}); }   // items not loaded yet
    } else {
      this.setState(Object.assign({ambient: false}, r));
    }
  }

  syncUrl() {
    if (!this._routing) return;
    // A deep-linked /show/<slug> is still waiting for the archive to load
    // before detailKey can be set. Don't rewrite the URL to the placeholder
    // home state in the meantime - it would leave a bogus history entry that
    // Back then walks into.
    if (this._pendingShowSlug) return;
    const target = this.routeToPath(this.state);
    if (target === location.pathname + location.search) return;
    // New keystrokes in the search box only rewrite the query, not the
    // page identity, so they replace rather than pile up history entries.
    // Ambient mode always gets its own history entry, so the back button
    // is a working exit gesture even for someone who never finds the
    // on-screen close control.
    const key = this.state.ambient ? 'ambient:' + (this.state.ambientRef || '')
      : [this.state.detailKey || '', this.state.view, this.state.genre || '', this.state.mood || '', this.state.dj || ''].join('|');
    const method = key === this._routeKey ? 'replaceState' : 'pushState';
    // Fire page_viewed only on a genuine page change (pushState), not on
    // every keystroke rewriting the same logical page's query (replaceState).
    if (method === 'pushState') {
      // Stamp the outgoing entry with the reader's scroll position, so
      // returning to it (Back from a show, or any back/forward hop) lands
      // where they left off.
      this._stampScroll();
      this.T('Page Viewed', {
        view: this.state.ambient ? 'ambient' : this.state.view,
        path: target, is_deeplink: !this._sawFirstView
      });
      this._sawFirstView = true;
    }
    this._routeKey = key;
    // Track how many pushState hops deep into the app this session is, stored
    // on the history entry itself so it survives reloads and forward/back.
    // A cold-loaded entry (shared link, bookmark) has no state -> depth 0,
    // which is how _backFromDetail knows there's no in-app origin to return to.
    const prevDepth = (history.state && history.state.d) || 0;
    const depth = method === 'pushState' ? prevDepth + 1 : prevDepth;
    try { history[method]({d: depth}, '', target); } catch (e) {}
  }

  // Record the reader's scroll position on the current history entry. Uses the
  // last value seen by the scroll listener rather than a live read - by the
  // time this runs the DOM may have shrunk and clamped window.scrollY.
  _stampScroll() {
    if (!this._routing) return;
    const y = (typeof this._lastScrollY === 'number') ? this._lastScrollY : (window.scrollY || window.pageYOffset || 0);
    try { history.replaceState(Object.assign({}, history.state, {scrollY: y}), ''); } catch (e) {}
  }

  // The show detail's Back control. When this session reached the show from
  // somewhere else in the app (landing, a selector's page, the filtered
  // archive), the previous history entry *is* that origin - walk back to it so
  // Back behaves like every other page and restores the origin's filters and
  // scroll position (syncUrl stamps it on the entry; applyRoute reads it back).
  // A show opened cold has no such entry, so fall back to the top of the archive.
  // Shared by the Back button and the Escape key.
  _backFromDetail(method) {
    const key = this.state.detailKey;
    if (!key) return;
    this.T('Show Closed', this.showProps(key, {method, surface: 'page'}));
    const depth = (typeof history !== 'undefined' && history.state && history.state.d) || 0;
    if (this._routing && depth > 0) { history.back(); return; }
    this._scrollTop = true;
    this.setState({detailKey: null, view: 'browse', genre: null, mood: null, dj: null, query: '', limit: 48});
  }

  // Swap the document title + OG/Twitter tags to match the open show, so a
  // link pasted straight from the address bar unfurls with the show's own
  // artwork, title and selector in clients that run JS (Slack, Discord,
  // Telegram). Static crawlers (Facebook, WhatsApp, X) instead read the
  // prerendered /show/<slug>.html (scripts/build-show-pages.mjs). Restores
  // the site defaults, captured once, when no show is open.
  syncMeta() {
    if (typeof document === 'undefined' || !document.head) return;
    const set = (sel, attr, val) => { const el = document.head.querySelector(sel); if (el) el.setAttribute(attr, val); };
    const FIELDS = [
      ['link[rel="canonical"]', 'href'], ['meta[property="og:url"]', 'content'],
      ['meta[property="og:type"]', 'content'], ['meta[property="og:title"]', 'content'],
      ['meta[name="twitter:title"]', 'content'], ['meta[property="og:description"]', 'content'],
      ['meta[name="twitter:description"]', 'content'], ['meta[name="description"]', 'content'],
      ['meta[property="og:image"]', 'content'], ['meta[name="twitter:image"]', 'content']
    ];
    if (!this._meta0) {
      this._meta0 = {title: document.title};
      FIELDS.forEach(([sel, attr]) => { const el = document.head.querySelector(sel); if (el) this._meta0[sel] = el.getAttribute(attr); });
    }
    const m = this.state.detailKey ? this.byKey(this.state.detailKey) : null;
    if (m) {
      const url = 'https://www.monkeyradio.in/show/' + this.slugOf(m.key);
      const title = m.name + ', selected by ' + m.dj + ' · Monkey Radio India';
      const tags = (m.tags || []).filter(t => this.STOP.indexOf(t) < 0).slice(0, 4);
      const desc = m.dj + ' on Monkey Radio India.' + (tags.length ? ' ' + tags.join(', ') + '.' : '') + ' Listen in the in-page player.';
      document.title = title;
      set('link[rel="canonical"]', 'href', url);
      set('meta[property="og:url"]', 'content', url);
      set('meta[property="og:type"]', 'content', 'music.radio_station');
      set('meta[property="og:title"]', 'content', title);
      set('meta[name="twitter:title"]', 'content', title);
      set('meta[property="og:description"]', 'content', desc);
      set('meta[name="twitter:description"]', 'content', desc);
      set('meta[name="description"]', 'content', desc);
      set('meta[property="og:image"]', 'content', m.pic);
      set('meta[name="twitter:image"]', 'content', m.pic);
    } else {
      document.title = this._meta0.title;
      FIELDS.forEach(([sel, attr]) => { if (this._meta0[sel] != null) set(sel, attr, this._meta0[sel]); });
    }
  }

  componentDidMount() {
    try {
      const p = JSON.parse(localStorage.getItem(this.PREF_KEY) || '{}');
      this.setState({favs: p.favs || [], queue: p.queue || [], history: p.history || []});
    } catch (e) {}
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(this.CACHE_KEY) || 'null'); } catch (e) {}
    // Drop superseded cache blobs so a returning visitor doesn't keep a
    // stale archive (e.g. old selector attribution) sitting in storage.
    try { for (let i = 1; i < 8; i++) localStorage.removeItem('mri.cloudcasts.v' + i); } catch (e) {}
    this._archiveLoadStart = Date.now();
    if (cached && cached.items && cached.items.length) this.setState({items: cached.items});
    this.bootAndSync(cached);
    // A show that was playing before a reload: queue it to be restored on
    // the dock (paused, at its saved position) once the archive is loaded.
    try {
      const r = JSON.parse(localStorage.getItem(this.RESUME_KEY) || 'null');
      if (r && r.key && r.pos > 5) this._pendingResume = r;
    } catch (e) {}
    this._onKey = (e) => {
      if (e.key !== 'Escape') return;
      // Ambient mode is a plain in-page overlay (no OS Fullscreen API), so
      // the page always receives this keydown - one press is enough.
      if (this.state.ambient) { this.exitAmbient('escape'); return; }
      if (this.state.detailKey) { this._backFromDetail('escape'); return; }
      this.setState({playerExpanded: false});
    };
    window.addEventListener('keydown', this._onKey);
    // Persist the playhead when the tab is hidden or closed, not just on
    // the throttled progress tick.
    this._onHide = () => {
      if (this.state.nowKey && this._wpos > 5) this.saveResume(this.state.nowKey, this._wpos);
      // Keep the current entry's stamped scroll fresh, so a reload or a
      // return via Back lands where the reader actually was (scrollRestoration
      // is 'manual', so nothing else does this).
      this._stampScroll();
    };
    window.addEventListener('pagehide', this._onHide);
    // Track the last real scroll position. Read by syncUrl when it stamps the
    // outgoing history entry: by the time syncUrl runs the view has often
    // re-rendered shorter (opening a show unmounts the list), so window.scrollY
    // is already clamped - this variable still holds where the reader was.
    this._lastScrollY = 0;
    this._onScroll = () => { this._lastScrollY = window.scrollY || window.pageYOffset || 0; };
    window.addEventListener('scroll', this._onScroll, {passive: true});
    // The Wake Lock API silently releases whenever the tab is hidden (e.g.
    // the OS locks the screen), even if playback continues in the
    // background. Re-request it on return so a long unattended session
    // (a venue running this on a counter, screen off between glances)
    // doesn't end up dark for good after the first lock.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this._onHide();
      else if (!this.state.paused && this.state.nowKey) this.requestWakeLock();
    });
    // Scroll position on back/forward is handled explicitly (syncUrl stamps
    // each entry, applyRoute restores it), so stop the browser's own guess
    // from fighting it - the SPA rebuilds the DOM after the browser has tried.
    if (this._routing && 'scrollRestoration' in history) {
      try { history.scrollRestoration = 'manual'; } catch (e) {}
    }
    this._onPop = () => this.applyRoute();
    window.addEventListener('popstate', this._onPop);
    this.applyRoute();
    // The landing route never goes through syncUrl's pushState branch (the
    // URL already matches on load), so it needs its own page_viewed.
    this.T('Page Viewed', {
      view: this.state.ambient ? 'ambient' : this.state.view,
      path: location.pathname + location.search, is_deeplink: true
    });
    this._sawFirstView = true;
    this._measure();
    window.addEventListener('resize', this._onResize);
    this._timers = [setTimeout(this._onResize, 250), setTimeout(this._onResize, 1000)];
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._reduced = !!reduced;
    if (!reduced) {
      this._heroRotate = setInterval(() => {
        if (this._heroPaused || document.hidden || this.state.view !== 'home' || this.state.detailKey || this.state.nowKey) return;
        const n = this.heroDeck().length;
        if (n > 1) this.setState({heroIdx: (this.state.heroIdx + 1) % n});
      }, 9000);
    }
  }
  componentWillUnmount() {
    window.removeEventListener('keydown', this._onKey);
    window.removeEventListener('popstate', this._onPop);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('pagehide', this._onHide);
    if (this._onScroll) window.removeEventListener('scroll', this._onScroll);
    if (this._ro) this._ro.disconnect();
    if (this._heroRotate) clearInterval(this._heroRotate);
    clearTimeout(this._toastT);
    clearTimeout(this._sleepT);
    (this._timers || []).forEach(t => { clearTimeout(t); });
    document.body.style.overflow = '';
    this.releaseWakeLock();
    if (this._ambientTick) clearInterval(this._ambientTick);
    if (this._dockTick) clearInterval(this._dockTick);
    if (this._widgetTimer) clearTimeout(this._widgetTimer);
  }

  // Keeps the screen from sleeping mid-show - the app is meant to run
  // unattended for hours (a venue playing it through a long session), and a
  // sleeping display kills a Mixcloud iframe's playback along with it.
  // Silently a no-op where the API is unsupported (Safari, older browsers):
  // those just fall back to the OS display-sleep setting.
  async requestWakeLock() {
    if (!('wakeLock' in navigator) || this._wakeLock) return;
    try {
      this._wakeLock = await navigator.wakeLock.request('screen');
      this._wakeLock.addEventListener('release', () => { this._wakeLock = null; });
    } catch (e) { this._wakeLock = null; }
  }
  releaseWakeLock() {
    if (this._wakeLock) { try { this._wakeLock.release(); } catch (e) {} this._wakeLock = null; }
  }

  // Ambient mode: a chrome-free now-playing view laid over the normal app
  // (see render()) rather than a separate page, so the one persistent
  // Mixcloud iframe and its playback state are untouched by entering or
  // leaving it. It is a plain in-page overlay - it deliberately does NOT
  // call the OS Fullscreen API, so the browser's own chrome (and tabs)
  // stay available and a single Escape always dismisses it.
  enterAmbient(ref, entry) {
    this._ambientStart = Date.now();
    this._ambientPlaysDuring = 0;
    const m = this.state.nowKey ? this.byKey(this.state.nowKey) : null;
    this.T('Ambient Mode Entered', {
      entry: entry || 'dock_button', ambient_ref: ref || null,
      was_playing: !!(this.state.nowKey && !this.state.paused),
      genre: m ? this.primaryGenre(m) : null
    });
    if (typeof window !== 'undefined' && window.identifyProp) window.identifyProp('ambient_user', true);
    this.setState({ambient: true, ambientRef: ref || null});
  }
  exitAmbient(exitMethod) {
    if (this._ambientStart) {
      this.T('Ambient Mode Exited', {
        duration_sec: Math.round((Date.now() - this._ambientStart) / 1000),
        exit_method: exitMethod || 'close_button',
        plays_during: this._ambientPlaysDuring || 0
      });
      this._ambientStart = null;
    }
    this.setState({ambient: false});
  }
  // The tap that starts a cold ambient session: one gesture covers the
  // first pick and (via bindWidget's play handler) the wake lock.
  ambientTapStart() {
    const k = this.smartPick(this.state.items);
    if (k) this.play(k, {source: 'ambient_tap'});
  }
  // Ref for the ambient backdrop mount node. A stable per-instance arrow, so
  // React calls it exactly twice - once with the node when ambient mode
  // opens, once with null when it closes - and never on the once-a-second
  // progress re-renders in between. The ShaderGradient bundle (assets/
  // shader-bg.js) is loaded lazily on that first call.
  ambientShaderRef = (el) => {
    const variant = this.ambientVariant();
    // Parked for the backdrop module to pick up if it is still loading.
    window.__mriShaderEl = el || null;
    window.__mriShaderVariant = variant;
    this._ambientVariant = el ? variant : null;
    if (!window.MRIShaderBG) return;
    if (el) window.MRIShaderBG.mount(el, variant);
    else window.MRIShaderBG.unmount();
  };
  // On-air genre -> ambient backdrop palette (see assets/shader-bg.js).
  // Genres not listed here use the default warm palette.
  AMBIENT_PALETTE = { reggae: 'reggae', bass: 'reggae', psy: 'psychedelic', house: 'psychedelic' };
  ambientVariant() {
    const m = this.state.nowKey ? this.byKey(this.state.nowKey) : null;
    return (m && this.AMBIENT_PALETTE[this.primaryGenre(m)]) || 'default';
  }

  savePrefs(patch) {
    const next = {favs: this.state.favs, queue: this.state.queue, history: this.state.history, ...patch};
    this.setState(patch);
    try { localStorage.setItem(this.PREF_KEY, JSON.stringify(next)); } catch (e) {}
  }

  // Remember what's on the dock and how far in, so a refresh can pick the
  // same show back up from the same spot. Kept in its own key (written a
  // few times a minute) rather than churning the main prefs blob.
  saveResume(key, pos) {
    if (!key || !(pos > 5)) return;
    this._lastResumeSave = Date.now();
    this.saveProg(key, pos);
    try { localStorage.setItem(this.RESUME_KEY, JSON.stringify({key, pos: Math.floor(pos), ts: Date.now()})); } catch (e) {}
  }
  clearResume() {
    this._resumeSeek = null;
    try { localStorage.removeItem(this.RESUME_KEY); } catch (e) {}
  }

  // Per-show playhead memory. Unlike RESUME_KEY (the single show to drop
  // back on the dock after a reload), this keeps a small map of how far
  // into each mix the listener got, so replaying any of them later picks
  // up from the same spot. Capped to the 60 most recent to stay tiny.
  loadProg() {
    if (!this._progMap) {
      try { this._progMap = JSON.parse(localStorage.getItem(this.PROG_KEY) || '{}') || {}; }
      catch (e) { this._progMap = {}; }
    }
    return this._progMap;
  }
  saveProg(key, pos) {
    if (!key || !(pos > 5)) return;
    const map = this.loadProg();
    map[key] = {pos: Math.floor(pos), ts: Date.now()};
    const keys = Object.keys(map);
    if (keys.length > 60) {
      keys.sort((a, b) => (map[b].ts || 0) - (map[a].ts || 0)).slice(60)
        .forEach(k => { delete map[k]; });
    }
    try { localStorage.setItem(this.PROG_KEY, JSON.stringify(map)); } catch (e) {}
  }
  progFor(key) {
    const r = key && this.loadProg()[key];
    return r && r.pos > 5 ? r.pos : 0;
  }
  clearProg(key) {
    const map = this.loadProg();
    if (key && map[key] != null) {
      delete map[key];
      try { localStorage.setItem(this.PROG_KEY, JSON.stringify(map)); } catch (e) {}
    }
  }

  NOT_A_DJ = ['indiearth','monkey radio','monkeyradio','monkey sound','tune inn','souls of sound','music manthan','disco freak','bass sanskriti','dub vibration','roots unwired','aurelia pszichedelia','puri juggernaut','the situation','steppin outta babylon','ziggys blunts','ziggy blunts','deep space traveller','folk viber','daktadub','dakta dub','hyderabad underground movement','hyderabad hi fi','hi fi hyderabad','sunday special','sunday live','excursions in','guest mix','radio show','podcast'];
  ALIASES = ['dj def hawk','selekta chakkra','amul','psylenz','berencz balazs','dj makarun','the groove thief'];
  // Resident selector behind a recurring show - credited only when the
  // title itself names no guest, so a "<show> ft <guest>" episode still
  // keeps its guest. First regex to match wins.
  RESIDENTS = [
    [/\b(?:dub\s+vibr|tune\s?inn|hyderabad hi.?fi|hi.?fi hyderabad)/i, 'Dakta Dub'],
    [/\bmusic manthan\b/i, 'Selekta Chakkra'],
    [/\broots unwired\b/i, 'Mr Nobody'],
    [/swatantram/i, 'Velugu'],
    [/souls of sound/i, 'Selecta Psylenz'],
    [/\bpuri juggernaut\b/i, 'Shivacult'],
    [/\bthe situation\b/i, 'Kid Move'],
    [/\btransmissions?\b/i, 'Chidakasha'],
    [/di+sco freak/i, 'Amul'],
    [/steppin['`´’]?\s*outta\s+babylon/i, 'Selekta Dreadhead'],
    [/ziggy['`´’]?s?\s+blunts/i, 'Ziggy B'],
    [/funk assassin/i, 'Funk Assassin'],
    [/deep space travellers?/i, 'Dj Ozon and Dr Analog'],
    [/bol hyderabad|musical journey with balu/i, 'Dakta Dub'],
    [/folk\s?viber/i, 'Themeekcrab'],
    [/\bsleepless monk\b/i, 'Sleepless Monk'],
    [/\byidam\b/i, 'Yidam'],
    [/svaha sound system/i, 'Svaha Sound System'],
    [/\bdr\.?\s?dub\b/i, 'Dr.Dub'],
    [/steppa vibration|love vibration|dancehall vibration/i, 'Dakta Dub']
  ];
  // One-off titles that bury the selector's name in phrasing no rule can
  // reasonably parse. Checked before everything else.
  OVERRIDES = [
    [/sunday guest mix\s*-\s*george vargas/i, 'George Vargas'],
    [/^\s*george vargas monkey radio india part/i, 'George Vargas'],
    [/\btune in features daham/i, 'Daham'],
    [/monkey radio india\s*-\s*dj quincy/i, 'DJ Quincy'],
    [/sunday special\s*-\s*mr\.?\s*skunk/i, 'Mr.Skunk'],
    [/sunday special\b.*rudy roots selekta/i, 'Rudy Roots Selekta'],
    [/sunday special\s*-\s*roman nz selekta/i, 'Roman NZ Selekta'],
    [/monkey radio india special mix\s*-\s*von dewey/i, 'Von Dewey'],
    [/\bmango\s?-?\s?p-zion highway/i, 'Selecta Mango P'],
    [/cloudcast by daktadub/i, 'Dakta Dub'],
    [/story of shiva'?s monkey mind/i, 'Shivacult'],
    [/bonalu mix/i, 'Dakta Dub'],
    [/slow beats & smoky tunes/i, 'Dj Def Hawk'],
    [/california knows how to party/i, 'Dj Def Hawk'],
    [/ozon::tilos to monkey/i, 'Dj Ozon'],
    [/indiearth\s*-\s*monkey radio india\s*-\s*cloudcast/i, 'Dakta Dub'],
    [/indiearth presents world music day/i, 'Dakta Dub'],
    [/world music day\s*-\s*bass sampradayam/i, 'Dakta Dub'],
    [/world of sound 10112012/i, 'Sonoluminescence'],
    [/\bworld of sound\b/i, 'Dakta Dub'],
    [/world radio day special/i, 'Dakta Dub'],
    [/^\s*dub\s*$/i, 'Mr Nobody'],
    [/dub'in and step'in/i, 'Dakta Dub'],
    [/sunday special ozy breaks/i, 'Dj Ozon'],
    [/100,?000 vibrations/i, 'Dakta Dub'],
    [/october hip hop mix feat lady rappers/i, 'Dj Def Hawk'],
    [/strictly hip hop mix/i, 'Dj Def Hawk'],
    [/summer hip hop & rnb mix/i, 'Dj Def Hawk'],
    [/presents a day in the sun/i, 'Naz & Schlopan'],
    [/\{diwali special\}/i, 'Dakta Dub'],
    [/monkey sound system ft raayal dub/i, 'Raayal Dub'],
    [/presents the evolution of dub/i, 'The Evolution of Dub'],
    [/indiearth's 2013 wrapup/i, 'Dakta Dub'],
    [/4th anniversary mix/i, 'Dakta Dub'],
    [/one year anniversary/i, 'Dakta Dub'],
    [/disco kebab/i, 'Vedat Akdağ'],
    [/khaas aap ke liye-jstar/i, 'JStar'],
    [/presents hemant chotani/i, 'Hemant Chotani'],
    [/puri juggernaut - guest mix - balu/i, 'Dakta Dub'],
    [/xmas special featuring hemant/i, 'Hemant Chotani'],
    [/banyan tree dub - moonchild/i, 'MoonChild'],
    [/features smoke signals/i, 'Bagula Bhagat']
  ];

  djFrom(raw) {
    const n = this.resolveDj(raw);
    // Normalise the "DJ" token to uppercase however the title spelled it.
    return n ? n.replace(/\bdj\b/gi, 'DJ') : null;
  }

  resolveDj(raw) {
    const s = (raw || '').replace(/│/g, '|');
    for (const [re, name] of this.OVERRIDES) if (re.test(s)) return name;
    const named = this.pickDj(raw);
    if (named) return named;
    // No guest in the title - fall back to the show's resident selector.
    for (const [re, name] of this.RESIDENTS) if (re.test(s)) return name;
    return null;
  }

  pickDj(raw) {
    let s = (raw || '').replace(/│/g, '|').trim();
    const flat = x => (x || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const alias = this.ALIASES.find(a => flat(s).indexOf(flat(a)) >= 0);
    if (alias) return alias.replace(/\b\w/g, c => c.toUpperCase());
    const bar = s.split('|');
    const barred = bar.length > 1 && bar[0].trim().length > 1;
    if (barred) s = bar[0].trim();
    let cand = null;
    // The text before a "presents"/"feat"/"showcase" keyword is the station
    // or one of its recurring programme names, not a person - so there, the
    // selector is whatever comes after the keyword.
    const isShowish = x => /monkey|indiearth/i.test(x) || this.NOT_A_DJ.some(n => flat(x).indexOf(flat(n)) >= 0);
    const nameish = x => x.length >= 2 && x.length <= 34
      && /^[\p{L}\p{N}][\p{L}\p{N}.'’ -]*$/u.test(x)
      && x.split(/\s+/).length <= 3
      && !/\b(?:of|the|a|an|evolution)\b/i.test(x);
    const trimTail = x => x
      .replace(/\s*[({\[].*$/, '')
      .replace(/\s+-\s+.*$/, '')
      .replace(/\s*\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\s*$/, '')
      .replace(/\s*\b(?:19|20)\d{2}\b\s*$/, '')
      .replace(/\s+from\s+[A-Z][\w'’-]+\s*$/i, '')
      // "<multi-word name>-<show>" glued with a hyphen (e.g.
      // "Rudy Roots Selekta-Bangaranga") - keep the name, drop the show.
      .replace(/([\p{L}\p{N}]+(?:\s+[\p{L}\p{N}]+)+)[-–][\p{L}\p{N}]+\s*$/u, '$1')
      .trim();
    { const m = s.match(/\bby\s+([A-Za-z][^|,]{1,34})$/i); if (m) cand = m[1]; }
    // "<station/show> presents|feat|features|showcase - <guest>"
    if (!cand) {
      const m = s.match(/^(.{2,46}?)\s+(?:presents?|pres\.?|introduces?|introducing|featuring|features?|feat\.?|ft\.?)\s+(.{2,60}?)\s*$/i)
        || s.match(/^(.{2,46}?)\s+(?:presents?|pres\.?|introduces?|introducing|featuring|features?|feat\.?|ft\.?)\s+([^-–(){}[\]]{2,40}?)\s*(?=[-–(]|\s\d|$)/i)
        || s.match(/\bexcursions in dub\s?techno\b.*?\)\s*(.{2,40}?)\s+\d/i)
        || s.match(/\bshowcase\s*[-–]\s*(.{2,60}?)\s*$/i);
      if (m) {
        const after = trimTail((m.length > 2 ? m[2] : m[1]).trim());
        if ((m.length <= 2 || isShowish(m[1])) && nameish(after)) cand = after;
      }
    }
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
    if (this.NOT_A_DJ.some(n => fc.indexOf(flat(n)) >= 0)) return null;
    if (/monkey/i.test(cand)) return null;
    if (/^\d{1,2}[-./]\d{1,2}[-./]\d{2,4}/.test(cand) || cand.indexOf('__') >= 0) return null;
    const GENERIC = ['the','a','of','and','in','on','for','my','our','your','music','musical','journey','transmission','world','day','vibration','vibes','special','session','sessions','sound','sounds','radio','show','mix','mixes','set','selection','live','dancehall','funk','bass','soul','jazz','dub','house','techno','hip','hop','rap','reggae','disco','edition','episode','vol','volume','part','night','weekend','sunday','monday','friday','saturday','summer','winter','new','best','top'];
    if (cand.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean).every(w => GENERIC.indexOf(w) >= 0)) return null;
    if (/\b(fm|f\.m\.|radio|station)\b/i.test(cand)) return null;
    if (/\b\d+\s*(st|nd|rd|th)\s+(anniversary|birthday|edition)\b/i.test(cand)) return null;
    if (/\b(special|episode|vol|volume|part|mixtape|session|mix|mixes|show|set|selection|takeover|edition)\b\s*\d*$/i.test(cand)) return null;
    if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(cand)) return null;
    return cand;
  }

  djKey(n) { return (n || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).sort().join(' '); }

  norm(c) {
    const pics = c.pictures || {};
    const t = c.name || '';
    let dj = this.djFrom(t);
    if (!dj && c.user && c.user.name && c.user.name !== 'Monkey Radio India') dj = c.user.name;
    if (!dj) dj = 'Monkey Radio India';
    return {
      key: c.key, name: t, url: c.url, dj,
      pic: pics.extra_large || pics.large || pics['640wx640h'] || 'assets/logo.png',
      created: c.created_time, len: c.audio_length || 0,
      plays: c.play_count || 0, favs: c.favorite_count || 0,
      tags: (c.tags || []).map(x => (x.name || '').toLowerCase())
    };
  }

  // A cold visit (no localStorage cache yet) has nothing to paint from and
  // no baseline to diff the live API against, so sync() below would page
  // the whole archive from scratch - ~10 sequential Mixcloud requests.
  // assets/archive.json is a same-origin snapshot of the full archive built
  // at deploy time (scripts/build-show-pages.mjs); fetching it first turns
  // that into one fast request, and hands sync() a baseline so it only has
  // to fetch whatever's been published since the build.
  async bootAndSync(cached) {
    if (!cached) {
      try {
        const snap = await (await fetch('assets/archive.json')).json();
        if (snap && Array.isArray(snap.items) && snap.items.length) {
          cached = snap;
          this.setState({items: snap.items});
        }
      } catch (e) {}
    }
    this.sync(cached);
  }

  async sync(cached) {
    this.setState({indexing: true});
    const base = 'https://api.mixcloud.com/monkeyradioindia/cloudcasts/?limit=100';
    try {
      const first = await (await fetch(base)).json();
      const head = (first.data || []).map(c => this.norm(c));
      if (cached && cached.items && cached.complete && head.length && cached.items[0] && head[0].key === cached.items[0].key) {
        this.setState({indexing: false});
        // `cached` here can be the prebuilt archive.json snapshot rather
        // than the localStorage cache (see bootAndSync) - persist it so a
        // cold visit only ever happens once, not on every load.
        try { localStorage.setItem(this.CACHE_KEY, JSON.stringify({ts: Date.now(), complete: true, items: cached.items})); } catch (e) {}
        this.T('Archive Loaded', {source: 'cache', count: cached.items.length, load_ms: Date.now() - (this._archiveLoadStart || Date.now())});
        return;
      }
      // Page forward only until a show already in the cache turns up - the
      // archive is unchanged below that point, so the cached tail is
      // spliced straight in instead of re-fetching everything underneath
      // whatever's new on every single visit that finds even one new show.
      // Without a cache (or if nothing overlaps within the guard limit),
      // this falls back to a full page-through exactly as before.
      const cachedKeys = cached && cached.items ? new Set(cached.items.map(m => m.key)) : null;
      let fresh = [], overlapped = false, page = first, guard = 0;
      while (page && guard++ < 40) {
        const rows = (page.data || []).map(c => this.norm(c));
        if (!rows.length) break;
        if (cachedKeys) {
          const idx = rows.findIndex(m => cachedKeys.has(m.key));
          if (idx >= 0) { fresh = fresh.concat(rows.slice(0, idx)); overlapped = true; break; }
        }
        fresh = fresh.concat(rows);
        this.setState({items: cachedKeys ? fresh.concat(cached.items) : fresh});
        const next = page.paging && page.paging.next;
        if (!next) break;
        page = await (await fetch(next)).json();
      }
      let all = overlapped ? fresh.concat(cached.items) : fresh;
      const seen = new Set();
      all = all.filter(m => (seen.has(m.key) ? false : seen.add(m.key)));
      // Below the new head, the tail is exactly the cache's own tail,
      // untouched - "complete" is a property of that tail, not of this
      // refresh, so it carries forward from the cache rather than being
      // re-derived from whether this particular pass paged to the end.
      const complete = overlapped ? !!cached.complete : !(page && page.paging && page.paging.next);
      this.setState({items: all, indexing: false});
      try { localStorage.setItem(this.CACHE_KEY, JSON.stringify({ts: Date.now(), complete, items: all})); } catch (e) {}
      this.T('Archive Loaded', {source: cached ? 'network_refresh' : 'network', count: all.length, load_ms: Date.now() - (this._archiveLoadStart || Date.now())});
    } catch (e) {
      this.setState({indexing: false});
    }
  }

  fmtLen(s) {
    if (!s) return '0:00';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h ? h + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0') : m + ':' + String(sec).padStart(2, '0');
  }
  fmtWhen(iso) {
    if (!iso) return '';
    const d = (Date.now() - new Date(iso).getTime()) / 86400000;
    if (d < 1) return 'today';
    if (d < 14) return Math.round(d) + 'd ago';
    if (d < 60) return Math.round(d / 7) + 'w ago';
    if (d < 730) return Math.round(d / 30.4) + 'mo ago';
    return Math.round(d / 365) + 'y ago';
  }
  fmtNum(n) { return n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n || 0); }
  // Compact form for the big stat tiles: 8,500 / 342k / 1.2M.
  fmtBig(n) {
    n = Math.round(n || 0);
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (n >= 1e4) return Math.round(n / 1e3) + 'k';
    return n.toLocaleString('en-US');
  }

  card(m) {
    return {key: m.key, name: m.name, dj: m.dj, pic: m.pic, bg: 'url(' + m.pic + ')',
      len: this.fmtLen(m.len), when: this.fmtWhen(m.created), plays: this.fmtNum(m.plays)};
  }

  // Show descriptions and tracklists are not in the list feed, so pull the
  // single cloudcast on demand when a detail view opens. '' is stored first
  // as a "fetched" flag for the description.
  fetchDesc(key) {
    if (!key || this.state.descs[key] !== undefined) return;
    this.setState({descs: Object.assign({}, this.state.descs, {[key]: ''})});
    fetch('https://api.mixcloud.com' + key)
      .then(r => r.json())
      .then(c => {
        const patch = {};
        const d = (c && c.description ? String(c.description) : '').trim();
        if (d) patch.descs = Object.assign({}, this.state.descs, {[key]: d});
        // Mixcloud's public API dropped tracklists years ago (`sections` is
        // almost always []), but honour it if a show ever carries one.
        const secs = (c && Array.isArray(c.sections) ? c.sections : []).map(x => {
          const t = x && x.track;
          const title = t
            ? [t.artist && t.artist.name, t.name].filter(Boolean).join(' - ')
            : (x && x.chapter) || '';
          return title ? {t: typeof x.start_time === 'number' ? x.start_time : null, title} : null;
        }).filter(Boolean);
        if (secs.length) patch.secs = Object.assign({}, this.state.secs, {[key]: secs});
        if (Object.keys(patch).length) this.setState(patch);
      })
      .catch(() => {});
  }

  // Fallback tracklist: some selectors paste a numbered or timestamped list
  // into the show notes. Only fires on an unambiguous run (4+ lines each
  // opening with "1." / "1)" / "12:34"), so prose is never mistaken for it.
  parseTrackText(desc) {
    if (!desc) return null;
    const rx = /^(?:\d{1,3}[.)]|\[?\d{1,2}:\d{2}(?::\d{2})?\]?)[\s.\-\u2013\u2014)]+(.{2,})$/;
    const tracks = [], intro = [];
    let started = false;
    desc.split(/\r?\n/).map(l => l.trim()).forEach(l => {
      const m = l.match(rx);
      if (m) { started = true; tracks.push({t: null, title: m[1].trim()}); }
      else if (!started && l) intro.push(l);
    });
    return tracks.length >= 4 ? {intro: intro.join('\n'), tracks} : null;
  }

  // Description + tracklist block, shared by the mobile and desktop detail
  // views. `big` = the roomier mobile-page type scale.
  notesBlock(d, big) {
    if (!d) return null;
    const tl = d.tracklist;
    const proseText = tl ? tl.intro : d.desc;
    const prose = proseText ? (
      <p style={css("font:400 " + (big ? "14.5px/1.65" : "14px/1.6") + " 'Archivo',sans-serif;color:#444141;margin:0 0 20px;text-wrap:pretty;white-space:pre-line")}>{proseText}</p>
    ) : null;
    const list = tl ? (
      <div style={css("margin:0 0 22px")}>
        <div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#6a6666;margin-bottom:10px")}>Tracklist</div>
        <ol style={css("margin:0;padding:0;list-style:none")}>
          {tl.tracks.map((t, i) => (
            <li key={i} style={css("display:flex;gap:12px;padding:8px 0;border-top:1px solid #e4e1e1;font:500 13px/1.45 'Archivo',sans-serif;color:#2c2a29")}>
              <span style={css("flex:none;width:26px;color:#6c6c6c;font-variant-numeric:tabular-nums")}>{t.t != null ? this.fmtLen(t.t) : String(i + 1).padStart(2, '0')}</span>
              <span style={css("min-width:0;overflow-wrap:anywhere")}>{t.title}</span>
            </li>
          ))}
        </ol>
      </div>
    ) : null;
    return <React.Fragment>{prose}{list}</React.Fragment>;
  }

  // Terms of Use / Privacy Policy. A real in-page view (/legal), so the
  // header, footer and player dock stay in place around it - not an
  // overlay. Reached from the footer "Terms & Privacy" link. Written
  // against what the site actually does: no accounts, no advertising or
  // cross-site tracking, privacy-light anonymous product analytics
  // (Amplitude, see index.html's window.track shim), most state kept in
  // localStorage on the visitor's own device; audio and show metadata
  // streamed from Mixcloud; fonts from Google; hosted on Firebase.
  legalView(v) {
    if (!v.isLegal) return null;
    const rule = css("height:2px;background:#201e1d;margin-bottom:24px");
    const p = css("font:400 16px/1.65 'Archivo',sans-serif;color:#444141;margin:0 0 16px;max-width:68ch;text-wrap:pretty");
    const ul = css("margin:0 0 16px;padding-left:22px;max-width:68ch");
    const li = css("font:400 16px/1.65 'Archivo',sans-serif;color:#444141;margin:0 0 10px");
    const kicker = css("font:600 10px 'Archivo',sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#ae1800;margin-bottom:14px");
    const mail = "mailto:monkeyradio.in@gmail.com";
    const h2 = css("font-weight:800;font-size:clamp(20px,2.4vw,28px);line-height:1.05;letter-spacing:-.03em;margin:44px 0 18px");
    return (
      <section style={css("padding:44px 0 0;max-width:820px")}>
        <div style={kicker}>Legal</div>
        <h1 style={css("font-weight:800;font-size:clamp(24px,3vw,40px);line-height:1.02;letter-spacing:-.03em;margin:0 0 22px")}>Terms of Use &amp; Privacy Policy</h1>
        <div style={rule}></div>
        <p style={p}>Last updated 31 August 2026. This site (<strong>monkeyradio.in</strong>) is run by the Monkey Foundation, Hyderabad, India, as a free, non-commercial community radio project. By using it you agree to the terms below. If you do not agree, please stop using the site. Questions: <a href={mail} style={css("text-decoration:underline")}>monkeyradio.in@gmail.com</a>.</p>

        <h2 style={h2}>Terms of Use</h2>
        <ul style={ul}>
          <li style={li}><strong>The service.</strong> The site is a browsable front end for Monkey Radio India&rsquo;s show archive. Audio and show information are streamed from Mixcloud through its embedded player and public API. Playback is therefore also subject to <a href="https://www.mixcloud.com/terms/" target="_blank" rel="noopener" onClick={v.outboundClick('mixcloud_terms')} style={css("text-decoration:underline")}>Mixcloud&rsquo;s terms</a>.</li>
          <li style={li}><strong>Provided &ldquo;as is&rdquo;.</strong> The site is offered without warranty of any kind. We do not guarantee that it will be available, uninterrupted, error-free, or that any given show will stay online, since the archive lives on Mixcloud.</li>
          <li style={li}><strong>Personal use.</strong> The site is for personal, non-commercial listening. Shows, mixes and their artwork remain the property of their selectors, artists and rights holders. Do not download, re-upload, redistribute, or publicly perform them without permission from the rights holders.</li>
          <li style={li}><strong>Site content.</strong> The site&rsquo;s design, code, text and the Monkey Radio India and Monkey Sound System names and artwork are &copy; the Monkey Foundation. Please ask before reusing them.</li>
          <li style={li}><strong>Acceptable use.</strong> Do not attempt to disrupt, overload, scrape at scale, reverse-engineer for republication, or otherwise misuse the site or the services it depends on.</li>
          <li style={li}><strong>Submitting a show.</strong> If you send us a mix (by email or the &ldquo;Submit a show&rdquo; link) you confirm that it is your own work or that you have the rights to share it, and you give the Monkey Foundation permission to broadcast, stream and host it as part of the station. You can ask us to take it down at any time.</li>
          <li style={li}><strong>External links.</strong> The site links to third-party services (Mixcloud, Instagram, Facebook and others). We are not responsible for their content or practices.</li>
          <li style={li}><strong>Changes.</strong> We may update these terms or the site itself. Continued use after a change means you accept the updated terms. These terms are governed by the laws of India, with courts in Hyderabad having jurisdiction.</li>
        </ul>

        <h2 style={h2}>Privacy Policy</h2>
        <p style={p}>Short version: there are no accounts, no advertising, and no cross-site tracking, and we do not collect or sell personal information. We do run privacy-light, anonymous product analytics to understand how the site itself is used, described below, and a few other third parties the site relies on receive technical request data.</p>
        <ul style={ul}>
          <li style={li}><strong>No accounts, no advertising or cross-site tracking.</strong> There is no sign-up. We set no advertising cookies and embed no social &ldquo;like&rdquo; or ad-tracking pixels.</li>
          <li style={li}><strong>Storage on your device.</strong> The site saves your preferences, saved and queued shows, listening history, playback position, and an anonymous device identifier in your browser&rsquo;s local storage, along with a cached copy of the show list so it loads quickly. This stays on your device, is never sent to us directly, and you can clear it any time through your browser settings.</li>
          <li style={li}><strong>Product analytics (Amplitude).</strong> We use Amplitude to understand which parts of the site people actually use - which shows get opened, which filters get used, whether ambient mode gets used - so we can improve it. It runs against the anonymous device identifier above, not a cookie or your name or email. We configure it to discard your IP address after coarse, city-level location is resolved, and it only records the specific interactions named in the site&rsquo;s source code, not everything you do on the page. See <a href="https://amplitude.com/privacy" target="_blank" rel="noopener" onClick={v.outboundClick('amplitude_privacy')} style={css("text-decoration:underline")}>Amplitude&rsquo;s privacy policy</a>.</li>
          <li style={li}><strong>Hosting.</strong> The site is served by Firebase Hosting (Google). Like any web host, Google&rsquo;s servers process standard request data such as your IP address, browser type and timestamps to deliver the site and keep it secure. See the <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener" onClick={v.outboundClick('firebase_privacy')} style={css("text-decoration:underline")}>Firebase privacy information</a>.</li>
          <li style={li}><strong>Mixcloud.</strong> When you open or play a show, your browser contacts Mixcloud to load the player and audio. Mixcloud may set its own cookies and collect usage data under its <a href="https://www.mixcloud.com/privacy/" target="_blank" rel="noopener" onClick={v.outboundClick('mixcloud_privacy')} style={css("text-decoration:underline")}>privacy policy</a>.</li>
          <li style={li}><strong>Google Fonts.</strong> Typefaces are loaded from Google&rsquo;s font servers, which means Google receives your IP address and user-agent when the fonts are fetched.</li>
          <li style={li}><strong>Email.</strong> If you email us or submit a show, we keep that correspondence so we can reply and, where relevant, add the show to the station.</li>
          <li style={li}><strong>Children.</strong> The site is a general-audience music service and is not directed at children under 13.</li>
          <li style={li}><strong>Your choices.</strong> You can clear local storage, block cookies, or use the site without playing embedded shows. For any privacy question, or to ask us to remove a submission or correspondence, contact <a href={mail} style={css("text-decoration:underline")}>monkeyradio.in@gmail.com</a>.</li>
        </ul>
        <p style={p}>If this policy changes, the &ldquo;last updated&rdquo; date above will change with it.</p>
      </section>
    );
  }

  // A stable per-day integer, so day-seeded hero picks don't flicker between renders.
  daySeed() {
    const d = new Date();
    return d.getFullYear() * 366 + d.getMonth() * 31 + d.getDate();
  }

  // A short line above the kicker, keyed to the local hour and weekday.
  heroGreeting() {
    const d = new Date(), h = d.getHours(), day = d.getDay();
    if (day === 0) return 'Sunday slowdown';
    if (day === 6) return 'Weekend session';
    if (h < 5) return 'Late shift';
    if (h < 11) return 'Morning warm-up';
    if (h < 16) return 'Afternoon rinse';
    if (h < 20) return 'Evening set';
    return 'After dark';
  }

  // Which listening mood the current local time leans toward. Weights the
  // shuffle so "Tune in" matches the hour instead of firing blind.
  timeMoodId() {
    const d = new Date(), h = d.getHours(), day = d.getDay();
    if (day === 0) return 'sunday';
    if (day === 6) return 'party';
    if (h < 5) return 'latenight';
    if (h < 11) return 'focus';
    if (h < 16) return 'cratedig';
    if (h < 20) return 'party';
    return 'latenight';
  }

  // A deep shuffle: shows that fit the hour's mood, and shows that aren't
  // already near the top of every pile, surface more often. Skips whatever
  // just played so it never repeats itself.
  smartPick(pool) {
    pool = (pool || this.state.items).filter(Boolean);
    if (!pool.length) return null;
    const s = this.state;
    const skip = {};
    [s.nowKey].concat((s.history || []).slice(0, 6)).forEach(k => { if (k) skip[k] = 1; });
    let cand = pool.filter(m => !skip[m.key]);
    if (cand.length < 5) cand = pool;
    const moodId = this.timeMoodId();
    let bestKey = null, bestW = -1;
    cand.forEach(m => {
      let w = 1;
      if (this.inMood(m, moodId)) w += 1.6;
      if ((m.plays || 0) < 400) w += 0.5;
      w *= 0.4 + Math.random();
      if (w > bestW) { bestW = w; bestKey = m.key; }
    });
    return bestKey;
  }

  // A small palette nudge: the pulse dot runs brighter by day, deeper after dark.
  heroPulse() {
    const h = new Date().getHours();
    if (h >= 21 || h < 5) return '#ae1800';
    if (h >= 18) return '#d0300f';
    return '#ec3013';
  }

  // The hero rotates through a small curated deck. A returning listener
  // (any saved show or listen history) leads with a personal pick; a
  // first-time visitor leads with the newest upload. The rest of the
  // deck is newest, a recent crowd favourite, and a "this week years
  // ago" vault pull. Order is deterministic so rotation is the only
  // movement.
  heroDeck() {
    const s = this.state;
    const items = s.items;
    if (!items.length) return [];
    const clean = t => t && this.STOP.indexOf(t) < 0;
    const topTag = m => { const t = (m.tags || []).find(clean); return t ? t.replace(/\b\w/g, c => c.toUpperCase()) : ''; };
    const mins = m => Math.max(1, Math.round(m.len / 60));
    const named = m => m && !/^monkey radio india$/i.test(m.dj || '');
    const byKey = k => items.find(m => m.key === k);
    const out = [], seen = {};
    const add = (m, kicker, blurb) => { if (m && !seen[m.key]) { seen[m.key] = 1; out.push({m, kicker, blurb}); } };

    // Returning listener: open with something personal.
    if (s.history && s.history.length) {
      const last = byKey(s.history[0]);
      if (last) add(last, 'Where you left off',
        'Back to your last play' + (named(last) ? ' · ' + last.dj : ''));
    } else if (s.favs && s.favs.length) {
      const fav = byKey(s.favs[0]);
      if (fav) {
        const favTags = (fav.tags || []).filter(clean);
        const match = items.find(m => m.key !== fav.key && (m.tags || []).some(t => clean(t) && favTags.indexOf(t) >= 0));
        const pick = match || fav;
        add(pick, named(fav) ? 'More like ' + fav.dj : 'From your saves',
          match ? (topTag(pick) ? topTag(pick) + ' · close to your saves' : 'Close to your saves') : 'Saved by you');
      }
    }

    const fresh = items[0];
    if (fresh) {
      const age = (Date.now() - new Date(fresh.created).getTime()) / 86400000;
      add(fresh, age < 10 ? 'New transmission' : 'Latest transmission',
        mins(fresh) + ' minutes' + (named(fresh) ? ' from ' + fresh.dj : '') + (topTag(fresh) ? ' · ' + topTag(fresh) : ''));
    }

    const hot = items.slice(0, 25).slice().sort((a, b) => b.plays - a.plays)[0];
    if (hot) add(hot, 'In heavy rotation',
      this.fmtNum(hot.plays) + ' plays and counting' + (named(hot) ? ' · ' + hot.dj : ''));

    const target = new Date().getMonth() * 31 + new Date().getDate();
    const cal = d => { const x = new Date(d); return x.getMonth() * 31 + x.getDate(); };
    const vault = items.filter(m => Math.abs(cal(m.created) - target) <= 4)
      .sort((a, b) => new Date(a.created) - new Date(b.created))[0]
      || items.slice().sort((a, b) => b.plays - a.plays)[0];
    if (vault) add(vault, 'From the vault',
      'Aired ' + new Date(vault.created).getFullYear() + (named(vault) ? ' · ' + vault.dj : '') + ', back on rotation');

    const longs = items.filter(m => m.len > 7000);
    if (longs.length) {
      const lp = longs[this.daySeed() % longs.length];
      add(lp, 'Long player',
        (Math.round(lp.len / 360) / 10) + ' hours deep' + (named(lp) ? ' · ' + lp.dj : ''));
    }

    return out.slice(0, 4);
  }
  // Broad catch-all tags: they hint at a genre but must not, on their own,
  // outweigh a specific tag (e.g. an "electronic" tag on a drum & bass mix).
  GENRE_WEAK = ['electronic','electronica','edm','dance','minimal','world','world music','fusion','beats','party','folk','bass','pop','90s','1990s','retro','classics','oldies','throwback','mashup','tropical','dub'];

  // The pattern side (`s`) is always one of the ~150 fixed tags in GENRES /
  // MOODS, so the compiled RegExp is cached by that string instead of being
  // rebuilt on every call - this runs per item, per candidate tag, on every
  // render, and the archive is nearly a thousand items deep.
  tagHits(t, s) {
    if (t === s) return true;
    if (!this._tagRe) this._tagRe = {};
    let re = this._tagRe[s];
    if (!re) { re = new RegExp('(^|[^a-z0-9])' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9])'); this._tagRe[s] = re; }
    return re.test(t);
  }
  matchTags(m, set) {
    return m.tags.some(t => {
      if (this.STOP.indexOf(t) >= 0) return false;
      return set.some(s => this.tagHits(t, s));
    });
  }
  // How strongly a mix's tags fit one genre. Specific multi-word tags score 2,
  // plain tags 1, broad catch-all tags 0.4. Each genre tag counts at most once.
  genreScore(m, g) {
    let sc = 0;
    const used = new Set();
    m.tags.forEach(t => {
      if (this.STOP.indexOf(t) >= 0) return;
      g.tags.forEach(s => {
        if (used.has(s) || !this.tagHits(t, s)) return;
        used.add(s);
        sc += this.GENRE_WEAK.indexOf(s) >= 0 ? 0.4 : (s.indexOf(' ') >= 0 ? 2 : 1);
      });
    });
    return sc;
  }
  // Assign each mix to the single genre its tags fit best, so it shows up in
  // one bucket instead of every bucket that shares a tag. Needs a real signal
  // (> 0.5) to be bucketed at all.
  primaryGenre(m) {
    if (!this._pgMap) this._pgMap = new WeakMap();
    if (this._pgMap.has(m)) return this._pgMap.get(m);
    let best = null, bestSc = 0.5;
    const ov = this.GENRE_OVERRIDES.find(([re]) => re.test(m.name || ''));
    if (ov) best = ov[1];
    else {
      this.GENRES.forEach(g => {
        const sc = this.genreScore(m, g);
        if (sc > bestSc) { bestSc = sc; best = g.id; }
      });
      if (!best) {
        const fb = this.GENRE_FALLBACKS.find(([re]) => re.test(m.name || ''));
        if (fb) best = fb[1];
      }
    }
    this._pgMap.set(m, best);
    return best;
  }
  inGenre(m, id) {
    // Vinyl Only is a format, not a sound: any show whose tags mention vinyl
    // belongs on that shelf on top of whatever genre its music scores for,
    // so it stays cross-cutting rather than losing out to a louder genre.
    if (id === 'vinyl') {
      if (!this._vinylG) this._vinylG = this.GENRES.find(g => g.id === 'vinyl');
      if (this._vinylG && this.genreScore(m, this._vinylG) > 0) return true;
    }
    return this.primaryGenre(m) === id;
  }
  // Mirrors primaryGenre()'s WeakMap: an item's tags never change after
  // load, so mood membership only needs computing once per item per mood,
  // not once per item on every render (the mood chips and the browse
  // filter both call this over the whole archive).
  inMood(m, id) {
    if (!this._moodMap) this._moodMap = new WeakMap();
    let cached = this._moodMap.get(m);
    if (!cached) { cached = {}; this._moodMap.set(m, cached); }
    if (id in cached) return cached[id];
    const g = this.MOODS.find(x => x.id === id);
    return (cached[id] = g ? this.matchTags(m, g.tags) : true);
  }

  // With no argument, filters against the live browse state (the visible
  // results). Pass a context snapshot ({genre, mood, dj, query, sort}) to
  // filter the archive the same way the station lineup was pinned at play
  // time, so auto-advance stays inside the list the show was picked from.
  filtered(ctx) {
    const s = this.state;
    const f = ctx || s;
    const q = (f.query || '').trim().toLowerCase();
    let out = s.items.filter(m => {
      if (f.genre && !this.inGenre(m, f.genre)) return false;
      if (f.mood && !this.inMood(m, f.mood)) return false;
      if (f.dj && this.djKey(m.dj) !== this.djKey(f.dj)) return false;
      if (q) {
        const hay = (m.name + ' ' + m.dj + ' ' + m.tags.join(' ')).toLowerCase();
        if (!q.split(/\s+/).every(tok => hay.includes(tok))) return false;
      }
      return true;
    });
    const sort = f.sort || s.sort;
    if (sort === 'plays') out = out.slice().sort((a, b) => b.plays - a.plays);
    else if (sort === 'longest') out = out.slice().sort((a, b) => b.len - a.len);
    else if (sort === 'oldest') out = out.slice().reverse();
    return out;
  }

  byKey(k) { return this.state.items.find(m => m.key === k); }

  // Analytics: window.track (defined in index.html) is a global that
  // no-ops when the Amplitude CDN is blocked, Do Not Track is set, or the
  // key isn't configured - every call site can fire blindly.
  T(name, props) { if (typeof window !== 'undefined' && window.track) window.track(name, props || {}); }
  trackPlayerErr(reason) {
    this.T('Player Error', this.showProps(this.state.nowKey, {reason}));
    this.setState({playerErr: true});
  }
  showProps(key, extra) {
    const m = this.byKey(key);
    if (!m) return Object.assign({show_key: key}, extra || {});
    return Object.assign({
      show_key: m.key, show_slug: this.slugOf(m.key), show_name: m.name,
      dj: m.dj, genre: this.primaryGenre(m), duration_sec: m.len, mixcloud_plays: m.plays
    }, extra || {});
  }

  play(key, opts) {
    const m = this.byKey(key);
    if (!m) return;
    if (this.state.ambient) this._ambientPlaysDuring = (this._ambientPlaysDuring || 0) + 1;
    opts = opts || {};
    // Audio streams from Mixcloud and is never cached (see sw.js), so with no
    // network the player would just render a dead iframe. Bail with a nudge
    // instead - covers every entry point: picks, auto-advance, Prev/Next,
    // Tune in and resume all funnel through here.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.T('Play Blocked Offline', this.showProps(key));
      this.flash('Offline - playback needs a connection');
      return;
    }
    const resumeAt = this.progFor(key);
    this.T('Play Requested', this.showProps(key, {
      play_source: opts.source || (opts.auto ? 'auto_advance' : opts.nav ? 'nav' : 'unknown'),
      is_resume: resumeAt > 5, resume_pos_sec: resumeAt > 5 ? resumeAt : 0
    }));
    this._cold = false;
    this._lastResumeSave = 0;
    // Replaying a mix picks up where it was last left: seek to the saved
    // per-show playhead on the widget's first play event. A brand-new show,
    // or one played through to the end, has no mark and starts at 0.
    if (key !== this.state.nowKey) {
      this.clearResume();
      this._nowSince = Date.now();   // trailing ticks from the old show don't save
      this._widgetAlive = 0;         // health clock restarts for the new load
      this._widgetPlayed = 0;        // ...and so does "has this load ever played"
      this._loadAt = Date.now();
      this._startedFired = false;    // analytics: one playback_started per show load
      this._milestonesFired = new Set(); // analytics: one playback_progress per 10/25/50/75/90%
      if (this.state.playerErr) this.setState({playerErr: false});
      if (this.state.resumeAt) { clearTimeout(this._resumePromptT); this.setState({resumeAt: 0}); }
      const at = this.progFor(key);
      this._resumeSeek = (at > 5 && (!m.len || at < m.len - 30)) ? at : null;
      this._wpos = this._resumeSeek || 0;
    } else {
      this._resumeSeek = null;
    }
    const hist = [key].concat(this.state.history.filter(h => h !== key)).slice(0, 40);
    // Back/forward nav stack, oldest -> newest. A normal play (user pick or
    // auto-advance) drops any "forward" entries and appends; stepping back
    // with playPrev() only moves the pointer, leaving the stack intact.
    if (!opts.nav) {
      const at = this._navPos == null ? -1 : this._navPos;
      const nav = (this._nav || []).slice(0, at + 1);
      if (nav[nav.length - 1] !== key) nav.push(key);
      this._nav = nav.slice(-50);
      this._navPos = this._nav.length - 1;
    }
    // A deliberate pick pins the station lineup to the list it came from:
    // the browse filter active right now. Auto-advance and Prev/Next keep
    // whatever context the run started with.
    if (!opts.nav && !opts.auto) {
      const s = this.state;
      this._ctx = opts.ctx || {genre: s.genre, mood: s.mood, dj: s.dj, query: s.query, sort: s.sort};
    }
    this.setState({nowKey: key, detailKey: null, paused: false, heroIdx: 0, upNext: this.buildUpNext(key, 3)});
    this.savePrefs({history: hist});
    this.updateMediaSession(m);
  }

  canPrev() { return !!(this._nav && this._navPos > 0); }
  canFwd() { return !!(this._nav && this._navPos < this._nav.length - 1); }

  playPrev() {
    if (!this.canPrev()) return;
    if (this.state.nowKey) {
      const mm = this.byKey(this.state.nowKey);
      this.T('Track Skipped', this.showProps(this.state.nowKey, {
        direction: 'prev', pct_complete_at_skip: mm && mm.len ? Math.round(100 * (this._wpos || 0) / mm.len) : null
      }));
    }
    this._navPos -= 1;
    this.play(this._nav[this._navPos], {nav: true, source: 'nav_prev'});
  }

  // Step forward through shows already visited via Prev, before falling
  // back to a fresh station pick.
  playFwd() {
    if (!this.canFwd()) return;
    if (this.state.nowKey) {
      const mm = this.byKey(this.state.nowKey);
      this.T('Track Skipped', this.showProps(this.state.nowKey, {
        direction: 'next', pct_complete_at_skip: mm && mm.len ? Math.round(100 * (this._wpos || 0) / mm.len) : null
      }));
    }
    this._navPos += 1;
    this.play(this._nav[this._navPos], {nav: true, source: 'nav_next'});
  }

  // Shared "advance to the next show" path: retrace the forward history if
  // Prev was used, else the manual queue, else the station lineup / pool.
  advance() {
    if (this.canFwd()) { this.playFwd(); return; }
    const s = this.state;
    const q = s.queue.slice();
    let k;
    const fromQueue = q.length;
    if (q.length) { k = q.shift(); this.savePrefs({queue: q}); }
    else k = this.nextKey();
    if (k) this.play(k, {auto: true, source: fromQueue ? 'queue' : 'auto_advance'});
  }

  // Sleep timer. One button cycles: off -> end of show -> 15 / 30 / 45 / 60
  // min -> off. A timed sleep pauses (keeps the show loaded); "end of show"
  // is handled in the widget's `ended` handler.
  SLEEP_STEPS = [null, 'show', 15, 30, 45, 60];
  cycleSleep() {
    const cur = this.state.sleep;
    const curVal = !cur ? null : cur.type === 'show' ? 'show' : cur.mins;
    const i = this.SLEEP_STEPS.indexOf(curVal);
    this.setSleep(this.SLEEP_STEPS[(i + 1) % this.SLEEP_STEPS.length]);
  }
  setSleep(v) {
    clearTimeout(this._sleepT);
    this.T('Sleep Timer Set', {mode: v == null ? 'off' : v === 'show' ? 'end_of_show' : (v + '_min')});
    if (v == null) { this.setState({sleep: null}); return; }
    if (v === 'show') { this.setState({sleep: {type: 'show'}}); this.flash('Sleep, stops after this show'); return; }
    this.setState({sleep: {type: 'time', mins: v, at: Date.now() + v * 60000}});
    this.flash('Sleep, ' + v + ' min');
    this._sleepT = setTimeout(() => {
      try { this._widget && this._widget.pause(); } catch (e) {}
      this.setState({sleep: null, paused: true});
      this.setMSState('paused');
      this.flash('Sleep timer, paused');
    }, v * 60000);
  }

  stopPlayback() {
    clearTimeout(this._sleepT);
    clearTimeout(this._resumePromptT);
    if (this.state.nowKey) {
      const mm = this.byKey(this.state.nowKey);
      this.T('Playback Stopped', this.showProps(this.state.nowKey, {
        position_sec: Math.floor(this._wpos || 0),
        pct_complete: mm && mm.len ? Math.round(100 * (this._wpos || 0) / mm.len) : null
      }));
    }
    this.clearResume();
    this.setState({nowKey: null, playerExpanded: false, sleep: null, resumeAt: 0});
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try { navigator.mediaSession.metadata = null; } catch (e) {}
      try { navigator.mediaSession.playbackState = 'none'; } catch (e) {}
    }
  }

  setMSState(x) {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try { navigator.mediaSession.playbackState = x; } catch (e) {}
    }
  }

  // Lock-screen / notification / headset-button integration. Safe to call
  // anywhere: it no-ops where the API is missing.
  updateMediaSession(m) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    m = m || this.byKey(this.state.nowKey);
    if (!m) { try { ms.metadata = null; } catch (e) {} return; }
    const artist = m.dj && !/^monkey radio india$/i.test(m.dj) ? m.dj : 'Monkey Radio India';
    if (window.MediaMetadata) {
      try {
        ms.metadata = new window.MediaMetadata({
          title: m.name || 'Monkey Radio India',
          artist: artist,
          album: 'Monkey Radio India',
          artwork: [96, 128, 192, 256, 384, 512].map(s => ({src: m.pic, sizes: s + 'x' + s, type: 'image/jpeg'}))
        });
      } catch (e) {}
    }
    const set = (action, fn) => { try { ms.setActionHandler(action, fn); } catch (e) {} };
    set('play', () => { try { this._widget && this._widget.play(); } catch (e) {} this.setState({paused: false}); this.setMSState('playing'); });
    set('pause', () => { try { this._widget && this._widget.pause(); } catch (e) {} this.setState({paused: true}); this.setMSState('paused'); });
    set('stop', () => this.stopPlayback());
    set('nexttrack', () => this.advance());
    set('previoustrack', this.canPrev() ? () => this.playPrev() : null);
    try { ms.playbackState = this.state.paused ? 'paused' : 'playing'; } catch (e) {}
  }

  // Turn a home-shelf id into the play context that pins auto-advance to
  // that shelf's list: genres and the sort-based shelves map to a filter
  // context; the history / favourites shelves carry an explicit key list.
  shelfCtx(id) {
    if (!id) return null;
    if (this.GENRES.find(g => g.id === id)) return {genre: id, mood: null, dj: null, query: '', sort: 'plays'};
    if (id === 'popular') return {sort: 'plays'};
    if (id === 'latest') return {sort: 'latest'};
    if (id === 'long') return {sort: 'longest'};
    if (id === 'onair') return {keys: (this.state.history || []).slice()};
    if (id === 'favs') return {keys: (this.state.favs || []).slice()};
    return null;
  }

  // The pool the station plays through: the list the current show was
  // picked from (pinned in this._ctx at play time) — an explicit key list,
  // or the archive narrowed by that context's filter — otherwise the whole
  // archive in the current sort.
  stationPool() {
    const c = this._ctx;
    if (c && c.keys) {
      const pool = c.keys.map(k => this.byKey(k)).filter(Boolean);
      return pool.length > 3 ? pool : this.state.items;
    }
    const f = this.filtered(c);
    return f.length > 3 ? f : this.state.items;
  }

  // The next `count` shows after `anchor` in station order, wrapping past
  // the end so the lineup never runs out. Skips the anchor, the show on
  // air, and anything already in the manual queue, so nothing double-books.
  buildUpNext(anchor, count) {
    const pool = this.stationPool();
    if (!pool.length) return [];
    const s = this.state;
    const skip = {};
    [anchor, s.nowKey].concat(s.queue || []).forEach(k => { if (k) skip[k] = 1; });
    const start = Math.max(0, pool.findIndex(m => m.key === anchor));
    const out = [];
    for (let step = 1; step <= pool.length && out.length < count; step++) {
      const cand = pool[(start + step) % pool.length];
      if (!cand || skip[cand.key]) continue;
      skip[cand.key] = 1;
      out.push(cand.key);
    }
    return out;
  }

  nextKey() {
    const s = this.state;
    if (s.queue.length) return s.queue[0];
    if (s.upNext && s.upNext.length) return s.upNext[0];
    const pool = this.stationPool();
    const i = pool.findIndex(m => m.key === s.nowKey);
    if (i >= 0 && pool[(i + 1) % pool.length]) return pool[(i + 1) % pool.length].key;
    return pool.length ? pool[Math.floor(Math.random() * pool.length)].key : null;
  }

  bindWidget() {
    const el = this._iframe;
    if (!el || !window.Mixcloud || el === this._bound) return;
    this._bound = el;
    try {
      const w = window.Mixcloud.PlayerWidget(el);
      this._widget = w;
      w.ready.then(() => {
        this.markPlayerAlive(); this.attachWidget(w);
        // Mobile browsers block cross-origin iframe autoplay, so the `&autoplay=1`
        // on the widget src silently does nothing and no `play` event ever fires.
        // That is not a failure - the widget is up and healthy, just waiting for
        // a tap. If playback hasn't started a few seconds after the widget is
        // ready, drop the dock into its paused state so the Play button shows;
        // tapping it runs w.play() inside a real user gesture, which mobile allows.
        clearTimeout(this._autoplayTimer);
        if (!this._cold) this._autoplayTimer = setTimeout(() => {
          if (!this._widgetPlayed && !this.state.paused && !this.state.playerErr) {
            this.setState({paused: true});
          }
        }, 4000);
      },
                   () => { this.trackPlayerErr('autoplay_blocked'); });
      // Belt-and-braces: if `ready` never settles (script blocked, CSP,
      // an ad blocker eating the widget frame) nothing above fires, so
      // arm a one-shot timeout that trips the fallback UI.
      clearTimeout(this._widgetTimer);
      this._widgetTimer = setTimeout(() => {
        if (!this._widgetAlive) this.trackPlayerErr('ready_timeout');
      }, 10000);
      // The same <iframe> is reused for every show - React only swaps its
      // `src` - and each fresh load makes the widget API hand the parent a
      // new API definition, which rebuilds `w.events.*` from scratch and
      // silently drops every handler attached to the previous one. So the
      // handlers below have to be re-attached on each of those rebuilds,
      // not just once when `ready` first resolves; without this, progress
      // (and play/pause/ended) stop firing after the first show switch,
      // freezing both progress bars at the outgoing show's position.
      // Mixcloud's own message listener was registered inside
      // PlayerWidget() above, so it has already rebuilt the registry by
      // the time this one runs.
      if (!this._apiRebind) {
        this._apiRebind = (ev) => {
          const cur = this._bound;
          if (!this._widget || !cur || ev.source !== cur.contentWindow) return;
          let d; try { d = JSON.parse(ev.data); } catch (e) { return; }
          if (d && d.mixcloud === 'playerWidget' && d.type === 'api') { this.markPlayerAlive(); this.attachWidget(this._widget); }
        };
        window.addEventListener('message', this._apiRebind, false);
      }
    } catch (e) {
      this.trackPlayerErr('bind_exception');
    }
  }
  // Any real sign of life from the widget (ready, an api rebuild, a play
  // or progress event) clears the fallback and restarts the health clock.
  markPlayerAlive() {
    this._widgetAlive = Date.now();
    clearTimeout(this._widgetTimer);
    if (this.state.playerErr) this.setState({playerErr: false});
  }
  // Registers our listeners on the widget's current event registry.
  // Idempotent: the registry objects are replaced wholesale on every
  // rebuild, so a marker on one of them tells us whether this particular
  // registry has been wired up already (both `ready` and the message
  // listener above can land on the same one).
  attachWidget(w) {
    if (!w || !w.events || !w.events.progress || w.events.progress._mriBound) return;
    w.events.progress._mriBound = true;
    try {
      w.events.pause.on(() => {
        // A show switch briefly fires pause on the outgoing stream; that
        // is not a real pause and its position belongs to the old show.
        if (Date.now() - (this._nowSince || 0) < 1500) return;
        clearTimeout(this._playTapTimer);
        this.setState({ paused: true }); this.setMSState('paused');
        if (this.state.nowKey && this._wpos > 5) {
          this.saveResume(this.state.nowKey, this._wpos);
          const mm = this.byKey(this.state.nowKey);
          this.T('Playback Paused', this.showProps(this.state.nowKey, {
            position_sec: Math.floor(this._wpos),
            pct_complete: mm && mm.len ? Math.round(100 * this._wpos / mm.len) : null
          }));
        }
        this.releaseWakeLock();
      });
      w.events.play.on(() => {
        this.markPlayerAlive();
        if (!this._startedFired && this.state.nowKey) {
          this._startedFired = true;
          this.T('Playback Started', this.showProps(this.state.nowKey, {
            time_to_play_ms: this._loadAt ? Date.now() - this._loadAt : null
          }));
        }
        this._widgetPlayed = 1;
        clearTimeout(this._autoplayTimer);
        clearTimeout(this._playTapTimer);
        this.setState({ paused: false }); this.setMSState('playing');
        this._cold = false;
        this.requestWakeLock();
        // First play after a reload or a show switch: jump to where we
        // left off. Done here (not in `ready`) because seeking only
        // sticks once the stream has actually started buffering.
        if (this._resumeSeek != null) {
          const p = this._resumeSeek; this._resumeSeek = null;
          try { w.seek(p); } catch (e) {}
          // Surface "Resumed from mm:ss · Start over" the moment playback
          // jumps, then fade it after a few seconds.
          if (p > 30) {
            clearTimeout(this._resumePromptT);
            if (this.state.resumeAt !== p) this.setState({resumeAt: p});
            this._resumePromptT = setTimeout(() => this.setState({resumeAt: 0}), 9000);
          }
        }
      });
      // Real playback position, straight from the widget. Drives the
      // hero "on air" bar (while that show is the featured one on the
      // home screen) and the lock-screen scrubber.
      w.events.progress.on((position) => {
        const s = this.state;
        this._widgetAlive = Date.now();
        if (s.playerErr) this.setState({playerErr: false});
        // Trailing ticks from the previous show carry its position but
        // the new key: don't let them save over the new show's mark.
        const settled = Date.now() - (this._nowSince || 0) > 1500;
        if (settled) this._wpos = position;
        if (settled && s.nowKey && !s.paused && position > 5 && Date.now() - (this._lastResumeSave || 0) > 5000) {
          this.saveResume(s.nowKey, position);
        }
        const m = s.nowKey && this.byKey(s.nowKey);
        if (m && m.len > 0 && typeof navigator !== 'undefined' && 'mediaSession' in navigator && navigator.mediaSession.setPositionState) {
          try {
            navigator.mediaSession.setPositionState({
              duration: m.len,
              position: Math.max(0, Math.min(position, m.len)),
              playbackRate: 1
            });
          } catch (e) {}
        }
        // The hero "on air" bar is the only thing this repaints for,
        // and it only needs whole-second resolution - cap it at 1/sec
        // so a widget that ticks faster than that doesn't force extra
        // full re-renders of the page underneath it. Ambient mode's own
        // progress bar has its own independent timer (see
        // componentDidUpdate) rather than piggybacking on this - it
        // needs to keep advancing even while `view` is away from
        // 'home', and a dedicated 1/sec interval is simpler to reason
        // about than widening this gate's conditions further.
        if (s.view === 'home' && !document.hidden && s.nowKey && Date.now() - (this._lastHeroTick || 0) >= 950) {
          this._lastHeroTick = Date.now();
          this.forceUpdate();
        }
        // Analytics: fire each 10/25/50/75/90% listen-depth milestone once
        // per show load, not once a second - see this._milestonesFired.
        if (settled && m && m.len > 0) {
          const pct = (position / m.len) * 100;
          [10, 25, 50, 75, 90].forEach((ms) => {
            if (pct >= ms && this._milestonesFired && !this._milestonesFired.has(ms)) {
              this._milestonesFired.add(ms);
              this.T('Playback Milestone Reached', this.showProps(s.nowKey, {milestone: ms, position_sec: Math.floor(position)}));
            }
          });
        }
      });
    } catch (e) {}
    try {
      w.events.ended.on(() => {
        this.T('Playback Completed', this.showProps(this.state.nowKey, {listened_sec: Math.floor(this._wpos || 0)}));
        this.clearResume();   // a finished show shouldn't be "resumed"
        this.clearProg(this.state.nowKey);
        if (this.state.sleep && this.state.sleep.type === 'show') {
          this.setState({sleep: null});
          this.flash('Sleep timer, stopped');
          this.releaseWakeLock();
          return;
        }
        this.advance();   // play() tops the lineup back up to 3; its own
                           // play event re-acquires the wake lock
      });
    } catch (e) {}
  }
  componentDidUpdate() {
    this.bindWidget();
    // Ambient mode's progress bar needs its own steady 1/sec heartbeat,
    // independent of the Mixcloud widget's own progress-event cadence (and
    // of the `view === 'home'` gate the hero bar's repaint uses) - it has
    // to keep advancing however ambient mode was entered or which page
    // sits underneath it. Started/stopped here rather than in
    // enterAmbient()/exitAmbient() so it also covers the direct-URL entry
    // (visiting /ambient sets `ambient` straight from applyRoute()).
    if (this.state.ambient && !this._ambientTick) {
      this._ambientTick = setInterval(() => { if (!document.hidden) this.forceUpdate(); }, 1000);
    } else if (!this.state.ambient && this._ambientTick) {
      clearInterval(this._ambientTick);
      this._ambientTick = null;
    }
    // A 1/sec heartbeat while a show is loaded, on every view: it keeps the
    // home "on air" hero bar advancing smoothly between the widget's own
    // progress ticks, and it runs the player health check - a show that
    // actually started playing (_widgetPlayed)
    // and has then gone quiet for ~14s (no progress events, not a cold paused
    // resume) means the hidden iframe died, so fall back. A load that has never
    // played is not counted as dead - on mobile that is just autoplay policy
    // holding until the first tap (see bindWidget's _autoplayTimer).
    if (this.state.nowKey && !this._dockTick) {
      this._dockTick = setInterval(() => {
        if (document.hidden) return;
        const s = this.state;
        if (s.nowKey && !s.paused && !this._cold && !s.playerErr && this._widgetPlayed &&
            this._widgetAlive && Date.now() - this._widgetAlive > 14000) {
          this.trackPlayerErr('silent_death');
        }
        if (s.nowKey && !s.paused) this.forceUpdate();
      }, 1000);
    } else if (!this.state.nowKey && this._dockTick) {
      clearInterval(this._dockTick);
      this._dockTick = null;
    }
    // Recolour the ambient backdrop when the on-air show's genre changes
    // (e.g. auto-advancing from a house set into a dub set) while ambient
    // mode stays open.
    if (this.state.ambient && window.MRIShaderBG) {
      const variant = this.ambientVariant();
      if (variant !== this._ambientVariant) {
        this._ambientVariant = variant;
        window.__mriShaderVariant = variant;
        window.MRIShaderBG.setVariant(variant);
      }
    }
    this._measure();
    if (this.state.detailKey) this.fetchDesc(this.state.detailKey);
    if (this._pendingShowSlug && this.state.items.length) {
      const key = this.resolveShowSlug(this._pendingShowSlug);
      // Keep _pendingShowSlug set until detailKey has actually applied, so the
      // syncUrl guard below suppresses a placeholder-state URL push in the gap
      // between "items loaded" and "detailKey set".
      if (key && this.state.detailKey !== key) this.setState({detailKey: key});
      else this._pendingShowSlug = null;
    }
    // Restore the pre-reload show onto the dock, paused, at its saved
    // position. Autoplay policies forbid resuming with sound on load, so
    // it waits for the first play tap and seeks then (see bindWidget).
    if (this._pendingResume && this.state.items.length && !this.state.nowKey) {
      const r = this._pendingResume;
      this._pendingResume = null;
      const m = this.byKey(r.key);
      if (m) {
        this._resumeSeek = r.pos;
        this._cold = true;
        this._loadAt = Date.now();
        this._widgetAlive = 0;
        this._nav = [r.key];
        this._navPos = 0;
        this.setState({nowKey: r.key, paused: true, resumeAt: r.pos > 30 ? r.pos : 0, upNext: this.buildUpNext(r.key, 3)});
        if (r.pos > 30) this.T('Resume Prompt Shown', this.showProps(r.key, {resume_pos_sec: r.pos}));
        this.updateMediaSession(m);
        // The "Start over" pill stays up while the show sits paused on the
        // dock; the play event re-arms a short auto-hide once playback
        // actually jumps to the mark.
        clearTimeout(this._resumePromptT);
      } else {
        this.clearResume();
      }
    }
    // Seed the station lineup as soon as the archive is available, so a
    // "next" show is lined up before the first play. Only sets state when
    // it can produce a non-empty lineup, so it can't loop.
    if (this.state.items.length && !this.state.upNext.length) {
      const anchor = this.state.nowKey || this.state.items[0].key;
      const seed = this.buildUpNext(anchor, 3);
      if (seed.length) this.setState({upNext: seed});
    }
    this.syncUrl();
    if (this._metaKey !== (this.state.detailKey || '')) { this._metaKey = this.state.detailKey || ''; this.syncMeta(); }
    // Show detail is its own page (every breakpoint). Opening it moves focus
    // to the Back control so a keyboard/screen-reader user lands at the top of
    // the new page; closing it hands focus back to whatever card opened it.
    if (this._focusKey !== (this.state.detailKey || '')) {
      const wasOpen = !!this._focusKey;
      const isOpen = !!this.state.detailKey;
      this._focusKey = this.state.detailKey || '';
      if (isOpen) {
        if (this._detailCloseBtn) { try { this._detailCloseBtn.focus({preventScroll: true}); } catch (e) { this._detailCloseBtn.focus(); } }
      } else if (wasOpen && !isOpen) {
        const trigger = this._detailTrigger;
        this._detailTrigger = null;
        if (trigger && document.contains(trigger)) { try { trigger.focus({preventScroll: true}); } catch (e) { trigger.focus(); } }
      }
    }
    // Deferred scroll to a section (e.g. footer "Submit a show" -> the
    // About page's submission block), once that view has rendered.
    if (this._scrollTo) {
      const el = document.getElementById(this._scrollTo);
      if (el) { this._scrollTo = null; el.scrollIntoView({behavior: 'smooth', block: 'start'}); }
    }
    // Back from a show detail: drop the view back to the exact scroll position
    // the list had when the show was opened. Re-assert on the next frame too,
    // since artwork/late layout can still be growing the document height.
    if (this._pendingScroll != null) {
      const y = this._pendingScroll;
      this._pendingScroll = null;
      this._scrollTop = false;
      window.scrollTo(0, y);
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => { try { window.scrollTo(0, y); } catch (e) {} });
    }
    // A top-nav / footer link jumps to the top of the freshly rendered page
    // rather than keeping the scroll position of the view left behind.
    if (this._scrollTop) { this._scrollTop = false; window.scrollTo(0, 0); }
  }

  renderVals() {
    const s = this.state;
    const items = s.items;
    let heroDeck = this.heroDeck();
    // While a show is on the dock it leads the deck as slot 0 ("On air"),
    // so — wherever play was triggered from — the landing card shows live
    // progress by default, while the other featured picks stay reachable
    // through the dots. The plain curated deck returns once playback stops.
    const nowHero = s.nowKey ? this.byKey(s.nowKey) : null;
    if (nowHero) {
      heroDeck = [{
        m: nowHero,
        kicker: s.paused ? 'Paused' : 'On air now',
        blurb: (nowHero.dj && !/^monkey radio india$/i.test(nowHero.dj) ? nowHero.dj + ' · ' : '') + this.fmtLen(nowHero.len) + ' set'
      }].concat(heroDeck.filter(d => d.m.key !== nowHero.key));
    }
    const heroPos = heroDeck.length ? ((s.heroIdx % heroDeck.length) + heroDeck.length) % heroDeck.length : 0;
    const feat = heroDeck[heroPos] || null;
    const hero = feat ? feat.m : null;
    // The station lineup: the manual queue first, then the auto-filled
    // upNext, minus whatever is on air. There is always a next show.
    const lineup = (s.queue || []).concat(s.upNext || []).filter(k => k && k !== s.nowKey);
    const upNextItem = lineup.length ? this.byKey(lineup[0]) : null;
    const upNextName = upNextItem ? upNextItem.name : '';
    // "On air" bar: real playback only. Shown with a fill + "Next" while
    // the featured show is the one loaded in the dock player; otherwise
    // the block just states the runtime, no fill.
    const heroOnAir = !!(hero && s.nowKey && hero.key === s.nowKey);
    const heroRuntime = hero && hero.len > 0 ? this.fmtLen(hero.len) : '';
    let heroProgPct = '0%', heroElapsed = '', heroUpNext = '';
    if (heroOnAir && hero.len > 0) {
      // _resumeSeek carries the saved playhead until the widget's first
      // progress tick, so a resumed mix shows its real position at once.
      const pos = Math.max(0, Math.min(this._wpos || this._resumeSeek || 0, hero.len));
      heroProgPct = (Math.round((pos / hero.len) * 1000) / 10) + '%';
      heroElapsed = this.fmtLen(Math.floor(pos));
      heroUpNext = upNextName ? 'Next: ' + upNextName : '';
    }
    const shelves = [];
    if (items.length) {
      shelves.push({id: 'latest', title: 'Latest shows', sub: 'Newest first', items: items.slice(0, 14).map(m => this.card(m))});
      shelves.push({id: 'popular', title: 'Most played', sub: 'All time', items: items.slice().sort((a, b) => b.plays - a.plays).slice(0, 14).map(m => this.card(m))});
      const aired = (s.history || []).map(k => this.byKey(k)).filter(Boolean).slice(0, 14);
      if (aired.length >= 3) shelves.push({id: 'onair', title: 'Recently on air', sub: 'Last played here', items: aired.map(m => this.card(m))});
      if (s.favs.length) shelves.push({id: 'favs', title: 'Saved by you', sub: s.favs.length + ' shows', items: s.favs.map(k => this.byKey(k)).filter(Boolean).slice(0, 14).map(m => this.card(m))});
      shelves.push({id: 'long', title: 'Long players', sub: 'Two hours and up', items: items.filter(m => m.len > 7000).slice(0, 14).map(m => this.card(m))});
      this.GENRES.map(g => ({g, list: items.filter(m => this.inGenre(m, g.id)).sort((a, b) => b.plays - a.plays)}))
        .filter(x => x.list.length >= 4)
        .sort((a, b) => b.list.length - a.list.length)
        .forEach(({g, list}) => {
          shelves.push({id: g.id, title: g.label, sub: list.length + ' shows', items: list.slice(0, 14).map(m => this.card(m))});
        });
    }

    const djMap = {};
    let unattributed = 0;
    items.forEach(m => {
      if (/^monkey radio india$/i.test(m.dj)) { unattributed++; return; }
      const k = this.djKey(m.dj);
      const d = djMap[k] || (djMap[k] = {name: m.dj, count: 0, secs: 0, pic: m.pic, tags: {}});
      d.count++; d.secs += m.len;
      m.tags.filter(t => this.STOP.indexOf(t) < 0).slice(0, 3).forEach(t => { d.tags[t] = (d.tags[t] || 0) + 1; });
    });
    const djs = Object.values(djMap).sort((a, b) => b.count - a.count).map(d => ({
      name: d.name, count: d.count, hours: Math.round(d.secs / 3600), pic: d.pic,
      tags: Object.keys(d.tags).sort((a, b) => d.tags[b] - d.tags[a]).slice(0, 4).join(', ')
    }));

    const chip = (active) => active
      ? {border: '#201e1d', bg: '#201e1d', fg: '#f3f2f2'}
      : {border: '#d7d3d3', bg: 'transparent', fg: '#201e1d'};
    // On a selector's page the genre / mood chips are a map of *their*
    // catalogue: counts are scoped to that selector, so every number
    // matches what you get on tap and genres they've never played drop out.
    const chipPool = s.dj ? items.filter(m => this.djKey(m.dj) === this.djKey(s.dj)) : items;
    const genreChips = this.GENRES.map(g => Object.assign({id: g.id, label: g.label,
      count: chipPool.filter(m => this.inGenre(m, g.id)).length}, chip(s.genre === g.id)))
      .filter(g => g.count > 0 || s.genre === g.id);
    // Moods are a whole-archive "what do I want to hear now" filter - not a
    // useful lens on one selector's catalogue, so drop them on their page.
    const moodChips = s.dj ? [] : this.MOODS.map(mo => Object.assign({id: mo.id, label: mo.label,
      count: chipPool.filter(m => this.inMood(m, mo.id)).length}, chip(s.mood === mo.id)))
      .filter(mo => mo.count > 0 || s.mood === mo.id);

    const list = this.filtered();
    const detail = s.detailKey ? this.byKey(s.detailKey) : null;
    const now = s.nowKey ? this.byKey(s.nowKey) : null;
    // Ambient mode's own progress bar - same math as the hero on-air bar
    // above, just against whatever's actually loaded (`now`) rather than
    // whichever show the home hero happens to be featuring right now.
    let ambientPct = '0%', ambientElapsed = '', ambientRuntime = '';
    if (now && now.len > 0) {
      const pos = Math.max(0, Math.min(this._wpos || this._resumeSeek || 0, now.len));
      ambientPct = (Math.round((pos / now.len) * 1000) / 10) + '%';
      ambientElapsed = this.fmtLen(Math.floor(pos));
      ambientRuntime = this.fmtLen(now.len);
    }
    const isFav = k => s.favs.indexOf(k) >= 0;

    const libSrc = s.tab === 'favs' ? s.favs : s.tab === 'queue' ? s.queue : s.history;
    const libItems = libSrc.map(k => this.byKey(k)).filter(Boolean).map(m => this.card(m));
    const sortLabel = {latest: 'newest', oldest: 'oldest', plays: 'most played', longest: 'longest'}[s.sort];
    const tab = on => on ? {bg: '#201e1d', fg: '#f3f2f2'} : {bg: 'transparent', fg: '#6a6666'};
    const tf = tab(s.tab === 'favs'), tq = tab(s.tab === 'queue'), th = tab(s.tab === 'history');
    const navOn = v => s.view === v ? '#201e1d' : '#6a6666';
    const navBar = v => s.view === v ? '#ec3013' : 'transparent';
    const related = detail ? items.filter(m => m.key !== detail.key && m.tags.some(t => this.STOP.indexOf(t) < 0 && detail.tags.includes(t))).slice(0, 12).map(m => this.card(m)) : [];
    // Single primary-genre label for the hero meta slot, falling back to the
    // first non-branding tag (title-cased) when nothing scores high enough.
    const heroGenre = hero
      ? ((this.GENRES.find(g => g.id === this.primaryGenre(hero)) || {}).label
         || (t => t ? t.replace(/\b\w/g, c => c.toUpperCase()) : '')(hero.tags.filter(t => this.STOP.indexOf(t) < 0)[0]))
      : '';

    // Per-show share targets. The URL is always the canonical production
    // permalink (never localhost) so Facebook and the others can actually
    // crawl the prerendered /show/<slug>.html page for its artwork, title
    // and selector (see scripts/build-show-pages.mjs). Every share is a backlink.
    const shareUrl = detail ? ('https://www.monkeyradio.in/show/' + this.slugOf(detail.key)) : '';
    const shareText = detail ? (detail.name + ', selected by ' + detail.dj + ' on Monkey Radio India') : '';
    const shareLinks = detail ? {
      url: shareUrl,
      caption: shareText + '\n' + shareUrl,
      facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl),
      twitter: 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(shareText) + '&url=' + encodeURIComponent(shareUrl),
      whatsapp: 'https://api.whatsapp.com/send?text=' + encodeURIComponent(shareText + ' ' + shareUrl)
    } : null;

    return {
      indexing: s.indexing, loadedCount: items.length,
      isHome: s.view === 'home' && !detail, isBrowse: s.view === 'browse' && !detail,
      isDjs: s.view === 'djs' && !detail,
      isLibrary: s.view === 'library' && !detail, isAbout: s.view === 'about' && !detail,
      isLegal: s.view === 'legal' && !detail,
      detailPage: !!detail && s.bp === 'sm',
      detailWide: !!detail && s.bp !== 'sm',
      rootRef: this.attachRoot,
      headRef: (el) => { this._headEl = el; },
      isSm: s.bp === 'sm', headMenu: s.hMenu, navInline: !s.hMenu, menuOpen: s.hMenu && s.menuOpen,
      tuneText: 'Tune in',
      tunePadX: s.bp === 'sm' ? '12px' : '16px',
      tuneGap: s.bp === 'sm' ? '6px' : '10px',
      tuneLS: s.bp === 'sm' ? '.1em' : '.14em',
      // Mobile trims the header: the search field moves into the slide-out
      // menu (no header icon for now), and the bar's own controls hold the
      // 44px minimum touch target while shedding bulk.
      headPadY: s.bp === 'sm' ? '8px' : '12px',
      ctlSize: s.bp === 'sm' ? '44px' : '42px',
      menuSearchKey: (e) => { if (e.key === 'Enter') this.setState({menuOpen: false}); },
      menuBg: s.menuOpen ? '#201e1d' : 'transparent', menuFg: s.menuOpen ? '#f3f2f2' : '#201e1d',
      // sm collapsed dock is now ~124px tall (60px Mixcloud strip + 60px bar).
      padBottom: (s.nowKey ? (s.bp === 'sm' ? 134 : s.bp === 'md' ? 170 : 120) : 40) + 'px',
      toggleMenu: () => this.setState({menuOpen: !s.menuOpen}),
      navHome: navOn('home'), navHomeBar: navBar('home'),
      navBrowse: navOn('browse'), navBrowseBar: navBar('browse'),
      navDjs: navOn('djs'), navDjsBar: navBar('djs'),
      navLib: navOn('library'), navLibBar: navBar('library'),
      navAbout: navOn('about'), navAboutBar: navBar('about'),
      aboutLogo: 'assets/logos/monkey-' + this.aboutLogo + '.png',
      aboutLogo2x: 'assets/logos/monkey-' + this.aboutLogo + '@2x.png',
      submitHref: 'mailto:monkeyradio.in@gmail.com?subject=' + encodeURIComponent('Show submission for Monkey Radio India') + '&body=' + encodeURIComponent('Name / selector:\nCity:\nLink to a mix (Mixcloud / SoundCloud / other):\nGenres / vibe:\nAnything else:\n'),
      query: s.query, moods: this.MOODS, shelves,
      searchHint: 'Search ' + (items.length || '974') + ' shows',
      heroGreeting: this.heroGreeting(),
      heroPulse: this.heroPulse(),
      heroOnAir, heroProgPct, heroElapsed, heroRuntime, heroUpNext,
      heroKicker: feat ? feat.kicker : 'Latest transmission',
      heroBlurb: feat ? feat.blurb : '',
      heroTitle: hero ? hero.name : 'Loading the archive',
      heroDj: hero ? hero.dj : '',
      heroWhen: hero ? this.fmtWhen(hero.created) : '', heroGenre: heroGenre || 'Radio',
      heroBg: hero ? 'url(' + hero.pic + ')' : 'none',
      heroKey: hero ? hero.key : '',
      heroMulti: heroDeck.length > 1,
      heroDots: heroDeck.map((d, i) => ({
        i: String(i),
        bg: i === heroPos ? '#201e1d' : 'transparent',
        bd: i === heroPos ? '#201e1d' : '#b3afaf'
      })),
      heroSaved: !!(hero && isFav(hero.key)),
      heroSaveLabel: hero && isFav(hero.key) ? 'Saved' : 'Save',
      heroSaveColor: hero && isFav(hero.key) ? '#ec3013' : '#201e1d',
      totalShows: items.length || '0',
      totalHours: items.length ? Math.round(items.reduce((a, m) => a + m.len, 0) / 3600) : '0',
      totalPlays: items.length ? this.fmtBig(items.reduce((a, m) => a + (m.plays || 0), 0)) : '0',
      djCount: djs.length || '0', djs, unattributed,
      browseTitle: s.dj ? s.dj : s.query ? 'Results for "' + s.query + '"' : s.genre ? (this.GENRES.find(g => g.id === s.genre) || {}).label : s.mood ? (this.MOODS.find(m => m.id === s.mood) || {}).label : 'Full archive',
      browseCount: list.length, sortLabel, genreChips, moodChips,
      // Mobile buries the genre / mood chip walls behind a "Filters" disclosure
      // so the show grid isn't pushed below several rows of chips; desktop keeps
      // them inline. The active filter's name rides on the toggle for context.
      filtersCollapsible: s.bp === 'sm',
      filtersOpen: !!s.filtersOpen,
      activeFilterLabel: s.genre ? (this.GENRES.find(g => g.id === s.genre) || {}).label : s.mood ? (this.MOODS.find(m => m.id === s.mood) || {}).label : '',
      toggleFilters: () => this.setState({filtersOpen: !s.filtersOpen}),
      // Back out of a filtered Browse view: a selector's page returns to the
      // Selectors list, everything else to home. Always shown for a selector
      // (there's no other way back to the list on desktop); otherwise mobile
      // only, where the top nav is folded into the menu.
      showBack: s.bp === 'sm' || !!s.dj,
      backLabel: s.dj ? 'All selectors' : 'Back',
      goBack: () => {
        this._scrollTop = true;
        this.setState(s.dj
          ? {view: 'djs', dj: null, genre: null, mood: null, query: '', detailKey: null, filtersOpen: false}
          : {view: 'home', genre: null, mood: null, dj: null, query: '', detailKey: null, filtersOpen: false});
      },
      gridItems: list.slice(0, s.limit).map(m => this.card(m)),
      hasMore: list.length > s.limit, gridEmpty: !list.length && !s.indexing,
      libItems, libEmpty: !libItems.length,
      libEmptyMsg: s.tab === 'favs' ? 'Nothing saved yet. Use the save button on any show.' : s.tab === 'queue' ? 'The queue is empty. Add shows from a mix card.' : 'No listening history yet.',
      tabFavBg: tf.bg, tabFavFg: tf.fg, tabQueueBg: tq.bg, tabQueueFg: tq.fg, tabHistBg: th.bg, tabHistFg: th.fg,
      detail: detail ? Object.assign({}, this.card(detail), {
        tags: detail.tags.filter(t => this.STOP.indexOf(t) < 0).slice(0, 8), favs: this.fmtNum(detail.favs),
        favLabel: isFav(detail.key) ? 'Saved' : 'Save',
        favBg: isFav(detail.key) ? '#201e1d' : 'transparent',
        favFg: isFav(detail.key) ? '#f3f2f2' : '#201e1d',
        favFill: isFav(detail.key) ? 'currentColor' : 'none',
        desc: s.descs[detail.key] || '',
        tracklist: (s.secs[detail.key] && s.secs[detail.key].length
          ? {intro: '', tracks: s.secs[detail.key]}
          : this.parseTrackText(s.descs[detail.key] || '')) || null
      }) : {tags: []},
      related, shareLinks, shareLabel: s.shared ? 'Link copied' : 'Share', shared: s.shared,
      toast: s.toast,
      toastBottom: !s.nowKey ? '28px' : s.bp === 'sm' ? (s.playerExpanded ? '112px' : '146px') : '150px',
      // "Resumed from mm:ss · Start over" pill - sits just above the toast slot.
      resumeAt: s.resumeAt,
      resumeAtLabel: s.resumeAt ? this.fmtLen(s.resumeAt) : '',
      resumeBottom: s.bp === 'sm' ? (s.playerExpanded ? '124px' : '158px') : '164px',
      startOver: () => {
        this.T('Resume Start Over', this.showProps(s.nowKey));
        clearTimeout(this._resumePromptT);
        this._resumeSeek = null;
        this._wpos = 0;
        try { this._widget && this._widget.seek(0); } catch (e) {}
        this.clearResume();
        this.clearProg(this.state.nowKey);   // wipe the per-show mark too, or the next replay resumes again
        this.setState({resumeAt: 0});
      },
      dismissResume: () => { this.T('Resume Dismissed', this.showProps(s.nowKey)); clearTimeout(this._resumePromptT); this.setState({resumeAt: 0}); },
      playing: !!now, paused: s.paused, playerExpanded: s.playerExpanded,
      now: now ? Object.assign({}, this.card(now), {
        url: now.url,
        favFg: isFav(now.key) ? '#ec3013' : '#201e1d',
        favFill: isFav(now.key) ? 'currentColor' : 'none'
      }) : {},
      // Mixcloud gives two layouts: non-mini keeps a small cover thumbnail
      // even with hide_cover; `mini=1` is the only artwork-free one, at the
      // cost of a more prominent scrubber strip. hide_cover + hide_artwork
      // belt-and-braces the thumbnail off; light=1 is the light theme.
      playerSrc: now ? 'https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&hide_artwork=1&mini=1&light=1&autoplay=' + (this._cold ? '0' : '1') + '&feed=' + encodeURIComponent(now.url.replace('https://www.mixcloud.com', '')) + (this._playerNonce ? '&_r=' + this._playerNonce : '') : '',
      playerRef: (el) => { this._iframe = el; this.bindWidget(); },
      upNextName,

      playerErr: s.playerErr,
      // `onError` on the visible <iframe> is our only DOM-level signal that
      // the frame itself failed to load (a widget-API failure trips
      // playerErr separately, via bindWidget).
      playerIframeError: () => this.trackPlayerErr('iframe_error'),
      // Fallback action: nudge the widget back to life by forcing a
      // fresh bind on the next tick; if it still won't come up the
      // "Open on Mixcloud" link in the fallback UI is the escape hatch.
      retryPlayer: () => {
        // Force a genuine reload of the <iframe> (new `src` via the nonce),
        // not just a re-bind - if the frame itself failed, re-calling
        // PlayerWidget() on it would not help.
        this._playerNonce = (this._playerNonce || 0) + 1;
        // Keep this._widget when we have one: it survives an <iframe> src
        // reload (same node) and the api-rebuild message re-attaches our
        // handlers. Only when the widget never came up at all do we clear
        // this._bound so bindWidget() runs PlayerWidget() again.
        if (!this._widget) this._bound = null;
        this._widgetAlive = 0;
        this._widgetPlayed = 0;
        this._loadAt = Date.now();
        this._cold = false;
        this.T('Player Retried', this.showProps(s.nowKey));
        this.setState({playerErr: false});
      },
      // Ambient mode.
      ambient: s.ambient,
      ambientPct, ambientElapsed, ambientRuntime,
      enterAmbient: () => this.enterAmbient(null, s.bp === 'sm' ? 'mobile_sheet' : 'dock_button'),
      exitAmbient: () => this.exitAmbient(),
      ambientTapStart: () => this.ambientTapStart(),
      ambientShaderRef: this.ambientShaderRef,

      goHome: () => this.setState({view: 'home', genre: null, mood: null, dj: null, query: '', detailKey: null}),
      goSubmit: () => { this._scrollTo = 'mri-submit'; this.setState({view: 'about', menuOpen: false, genre: null, mood: null, dj: null, query: '', detailKey: null}); },
      nav: (e) => { const view = e.currentTarget.dataset.view; const clear = view === 'browse' ? {} : {genre: null, mood: null, dj: null, query: ''}; this._scrollTop = true; this.setState(Object.assign({view, limit: 48, menuOpen: false, detailKey: null}, clear)); },
      onSearch: (e) => {
        const query = e.target.value;
        this.setState({query, view: 'browse', limit: 48, detailKey: null});
        clearTimeout(this._searchDebounce);
        this._searchDebounce = setTimeout(() => {
          if (!query) return;
          const resultCount = this.filtered({genre: null, mood: null, dj: null, query, sort: this.state.sort}).length;
          this.T('Search Performed', {query, query_length: query.length, result_count: resultCount});
        }, 800);
      },
      // Click-level signal so search engagement can be compared head to head
      // with "Tune In Clicked" when deciding which keeps the mobile header slot.
      searchFocus: () => this.T('Search Opened', {bp: s.bp, in_menu: s.hMenu}),
      // Opening a show remembers the shelf it was opened from (home shelves
      // carry data-ctx), so playing it pins auto-advance to that shelf's
      // list instead of the whole archive.
      openMix: (e) => {
        const key = e.currentTarget.dataset.key;
        const ctxId = e.currentTarget.dataset.ctx;
        this._detailCtx = this.shelfCtx(ctxId);
        this.T('Show Opened', this.showProps(key, {source: ctxId || 'unknown', surface: 'page'}));
        // Remembered so leaving the detail page (Back, Escape) can hand focus
        // back to whatever opened it.
        this._detailTrigger = e.currentTarget;
        // The detail page opens at the top; Back restores the list's scroll
        // position from the history entry (see syncUrl / applyRoute).
        this._scrollTop = true;
        this.setState({detailKey: key, shared: false});
      },
      // Show cards are non-native controls (a div, not a button - the design
      // needs the whole tile clickable), so Enter/Space have to be wired up
      // by hand to reach parity with a real button.
      openMixKey: (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        const key = e.currentTarget.dataset.key;
        const ctxId = e.currentTarget.dataset.ctx;
        this._detailCtx = this.shelfCtx(ctxId);
        this.T('Show Opened', this.showProps(key, {source: ctxId || 'unknown', surface: 'page'}));
        this._detailTrigger = e.currentTarget;
        this._scrollTop = true;
        this.setState({detailKey: key, shared: false});
      },
      closeDetail: () => this._backFromDetail('button'),
      detailCloseBtnRef: (el) => { this._detailCloseBtn = el; },
      playDetail: () => this.play(s.detailKey, Object.assign({source: 'detail'}, this._detailCtx ? {ctx: this._detailCtx} : null)),
      queueDetail: () => {
        const nextQueue = s.queue.concat([s.detailKey]).filter((v, i, a) => a.indexOf(v) === i);
        this.T('Show Queued', this.showProps(s.detailKey, {queue_length: nextQueue.length}));
        this.savePrefs({queue: nextQueue});
        this.setState({detailKey: null, view: 'library', tab: 'queue'});
      },
      shareDetail: () => {
        const link = shareUrl || location.href;
        this.T('Show Shared', this.showProps(s.detailKey, {channel: 'copy'}));
        try { navigator.clipboard.writeText(link); } catch (e) {}
        this.setState({shared: true}); this.flash('Link copied');
      },
      shareInstagram: () => {
        if (!shareLinks) return;
        this.T('Show Shared', this.showProps(s.detailKey, {channel: 'instagram'}));
        const nav = typeof navigator !== 'undefined' ? navigator : {};
        // Mobile: the OS share sheet is the only real path into Instagram -
        // the user picks Instagram, then Story / Feed / DM.
        if (nav.share) { nav.share({title: detail.name, text: shareText, url: shareUrl}).catch(() => {}); return; }
        // Desktop has no Instagram web share target, so copy a ready-to-paste
        // caption and open the story camera.
        try { nav.clipboard && nav.clipboard.writeText(shareLinks.caption); } catch (e) {}
        this.setState({shared: true});
        this.flash('Caption + link copied - opening Instagram for your story');
        try { window.open('https://www.instagram.com/', '_blank', 'noopener'); } catch (e) {}
      },
      shareNow: () => { this.T('Show Shared', this.showProps(s.nowKey, {channel: 'copy_now_playing'})); try { navigator.clipboard.writeText(now ? now.url : ''); } catch (e) {} this.setState({shared: true}); this.flash('Link copied'); },
      togglePlay: () => {
        if (typeof navigator !== 'undefined' && navigator.onLine === false && !this._widget) { this.flash('Offline - playback needs a connection'); return; }
        if (!this._widget || s.playerErr) { this.flash('Player unavailable - try Open on Mixcloud'); return; }
        // If this load has never played yet (autoplay was blocked and this tap
        // is the first real gesture), arm a watchdog: a healthy widget answers
        // with a `play` event in a second or two, so if none has arrived after
        // ~12s the stream is genuinely dead - show the "Open on Mixcloud"
        // fallback. w.events.play clears this via _widgetPlayed on success.
        if (!this._widgetPlayed && s.paused) {
          clearTimeout(this._playTapTimer);
          this._playTapTimer = setTimeout(() => {
            if (!this._widgetPlayed && this.state.nowKey) this.trackPlayerErr('play_tap_watchdog');
          }, 12000);
        }
        try { this._widget.togglePlay(); } catch (e) { this.trackPlayerErr('toggle_play_exception'); }
      },
      expandPlayer: () => this.setState({playerExpanded: true}),
      collapsePlayer: () => this.setState({playerExpanded: false}),
      toggleFav: (e) => {
        e.stopPropagation();
        const k = e.currentTarget.dataset.key;
        if (!k) return;
        const nowFav = !isFav(k);
        this.T(nowFav ? 'Show Saved' : 'Show Unsaved', this.showProps(k));
        if (typeof window !== 'undefined' && window.identifyProp) window.identifyProp('saved_count', (nowFav ? s.favs.length + 1 : s.favs.length - 1));
        this.savePrefs({favs: isFav(k) ? s.favs.filter(x => x !== k) : [k].concat(s.favs)});
      },
      cycleSleep: () => this.cycleSleep(),
      sleepOn: !!s.sleep,
      sleepLabel: !s.sleep ? 'Sleep'
        : s.sleep.type === 'show' ? 'Sleep · end of show'
        : 'Sleep · ' + Math.max(1, Math.ceil((s.sleep.at - Date.now()) / 60000)) + 'm',
      sleepShort: !s.sleep ? 'Off'
        : s.sleep.type === 'show' ? 'Show'
        : Math.max(1, Math.ceil((s.sleep.at - Date.now()) / 60000)) + 'm',
      heroPlay: () => { if (!hero) return; this.play(hero.key, {source: 'hero'}); },
      heroDot: (e) => this.setState({heroIdx: Number(e.currentTarget.dataset.i) || 0}),
      heroHold: () => { this._heroPaused = true; },
      heroRelease: () => { this._heroPaused = false; },
      playNext: () => this.advance(),
      playPrev: () => this.playPrev(),
      canPrev: this.canPrev(),
      stopPlaying: () => this.stopPlayback(),
      // The always-visible "Tune in" entry: either resumes what's loaded or
      // drops the needle on a deep-shuffled pick from the current pool.
      // Never stops it once running.
      tuneIn: () => {
        if (s.nowKey) {
          const resuming = s.paused;
          this.T('Tune In Clicked', {action: resuming ? 'resume' : 'noop', view: s.view, bp: s.bp});
          if (resuming) { try { this._widget && this._widget.play(); } catch (e) {} }
          return;
        }
        const pool = list.length ? list : items;
        const k = this.smartPick(pool);
        this.T('Tune In Clicked', {action: 'start', view: s.view, bp: s.bp, has_pick: !!k, pool_size: pool.length});
        if (k) this.play(k, {source: 'tune_in'});
      },
      pickGenre: (e) => {
        const id = e.currentTarget.dataset.id;
        const turningOn = s.genre !== id;
        // Keep any active selector: on a selector's page the genre chips are
        // scoped to that selector, so tapping one narrows within their work.
        if (turningOn) this.T('Genre Filtered', {genre: id, from_view: s.view, result_count: this.filtered({genre: id, mood: null, dj: s.dj, query: '', sort: s.sort}).length});
        this.setState({genre: turningOn ? id : null, view: 'browse', limit: 48, filtersOpen: false});
      },
      pickMood: (e) => {
        const id = e.currentTarget.dataset.id;
        const turningOn = s.mood !== id;
        if (turningOn) this.T('Mood Filtered', {mood: id, from_view: s.view, result_count: this.filtered({genre: null, mood: id, dj: s.dj, query: '', sort: s.sort}).length});
        this.setState({mood: turningOn ? id : null, view: 'browse', limit: 48, filtersOpen: false});
      },
      pickDj: (e) => {
        const id = e.currentTarget.dataset.id;
        this.T('DJ Selected', {dj: id, show_count: this.filtered({genre: null, mood: null, dj: id, query: '', sort: s.sort}).length});
        this.setState({dj: id, view: 'browse', genre: null, mood: null, limit: 48, detailKey: null, menuOpen: false});
      },
      pickDjKey: (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        const id = e.currentTarget.dataset.id;
        this.T('DJ Selected', {dj: id, show_count: this.filtered({genre: null, mood: null, dj: id, query: '', sort: s.sort}).length});
        this.setState({dj: id, view: 'browse', genre: null, mood: null, limit: 48, detailKey: null, menuOpen: false});
      },
      openShelf: (e) => { const id = e.currentTarget.dataset.id; this.T('Shelf Expanded', {shelf_id: id}); const g = this.GENRES.find(x => x.id === id); this._scrollTop = true; this.setState({view: 'browse', genre: g ? id : null, mood: null, dj: null, query: '', sort: id === 'long' ? 'longest' : id === 'latest' ? 'latest' : 'plays', limit: 48}); },
      cycleSort: () => { const order = ['latest', 'plays', 'longest', 'oldest']; const next = order[(order.indexOf(s.sort) + 1) % order.length]; this.T('Sort Changed', {sort: next}); this.setState({sort: next}); },
      clearFilters: () => { this.T('Filters Cleared', {}); this.setState({genre: null, mood: null, dj: s.dj, query: '', sort: 'latest', limit: 48}); },
      showMore: () => { this.T('More Shows Loaded', {page: Math.round((s.limit + 48) / 48), total_shown: s.limit + 48}); this.setState({limit: s.limit + 48}); },
      setTab: (e) => { const tab = e.currentTarget.dataset.tab; this.T('Library Tab Viewed', {tab}); this.setState({tab}); },
      scrollShelf: (e) => {
        const shelf = e.currentTarget.dataset.shelf, dir = Number(e.currentTarget.dataset.dir);
        const now = Date.now();
        if (!this._lastShelfScroll || now - this._lastShelfScroll > 1500) this.T('Shelf Scrolled', {shelf_id: shelf, direction: dir > 0 ? 'next' : 'prev'});
        this._lastShelfScroll = now;
        const el = document.getElementById('shelf-' + shelf);
        if (el) el.scrollBy({left: 440 * dir, behavior: 'smooth'});
      },
      // Outbound link tracking: `<a target=_blank>` elements carry no
      // handler of their own, so this fires the analytics event and lets
      // the click through to its normal navigation.
      outboundClick: (dest) => () => this.T('Outbound Link Clicked', {destination: dest, from_view: s.ambient ? 'ambient' : s.view}),
      shareChannelClick: (channel) => () => this.T('Show Shared', this.showProps(s.detailKey || s.nowKey, {channel}))
    };
  }

  render() {
    const v = this.renderVals();
    const iconPlay = <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={css("display:block;flex:none")}><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>;
    const iconHeart = (fill) => <svg width="16" height="16" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>;
    const iconQueue = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><path d="M11 12H3"></path><path d="M16 6H3"></path><path d="M16 18H3"></path><path d="M18 9v6"></path><path d="M21 12h-6"></path></svg>;
    const iconShare = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block")}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" x2="12" y1="2" y2="15"></line></svg>;
    const iconArrow = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>;
    // Brand marks for the per-show share row (single-path, currentColor).
    const brandSvg = (d) => <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={css("display:block;flex:none")}><path d={d}></path></svg>;
    const iconFacebook = brandSvg("M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z");
    const iconInstagram = brandSvg("M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z");
    const iconTwitter = brandSvg("M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z");
    const iconWhatsApp = brandSvg("M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.881 11.881 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z");
    const shareNetStyle = css("width:46px;height:46px;display:flex;align-items:center;justify-content:center;background:none;color:#201e1d;border:1px solid #201e1d;border-radius:0;cursor:pointer;text-decoration:none;transition:background .15s,color .15s");

    return (
      <div ref={v.rootRef} className="mri-app" style={css("min-height:100vh;background:#f3f2f2;padding-bottom:" + v.padBottom)}>

        {/* Ambient mode: a fullscreen overlay, not a separate view - the
            normal app (header, browse UI, and critically the persistent
            Mixcloud iframe further down) stays mounted underneath the
            whole time, so entering/leaving never touches playback. */}
        {v.ambient && (
          <div role="dialog" aria-label="Ambient mode" style={css("position:fixed;inset:0;z-index:400;background:#201e1d;color:#f3f2f2;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;overflow:hidden;padding:32px")}>
            {/* Live ShaderGradient backdrop. Fills the overlay; the solid
                #201e1d above is the fallback while the (lazily loaded) WebGL
                bundle boots or if it fails. Mounted / torn down by
                ambientShaderRef -> window.MRIShaderBG (assets/shader-bg.js). */}
            <div ref={v.ambientShaderRef} aria-hidden="true" style={css("position:absolute;inset:0;z-index:0;pointer-events:none")}></div>
            {/* Darkening wash so foreground text stays legible over the
                gradient's bright orange lobe. */}
            <div aria-hidden="true" style={css("position:absolute;inset:0;z-index:0;pointer-events:none;background:linear-gradient(180deg,rgba(32,30,29,.28),rgba(32,30,29,.55))")}></div>

            <button onClick={v.exitAmbient} aria-label="Exit ambient mode" className="mri-ambclose" style={css("position:absolute;top:16px;right:16px;z-index:3;width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:none;border:0;color:#f3f2f2;cursor:pointer;filter:drop-shadow(0 1px 6px rgba(0,0,0,.4))")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block")}><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
            </button>

            {!v.now.key ? (
              <button onClick={v.ambientTapStart} style={css("position:relative;z-index:2;background:none;border:0;color:#f3f2f2;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:22px;padding:0")}>
                <div role="img" aria-label="The Monkey Sound System, a hand-built dub speaker stack" style={css("aspect-ratio:460/421;pointer-events:none;width:min(260px,52vw);background:center/contain no-repeat " + SOUND_SYSTEM_BG)}></div>
                <div style={css("font:600 13px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase")}>Tap to start the radio</div>
              </button>
            ) : (
              /* Playing: album art shrinks and sits left, with the show and
                 selector names beside it; the progress bar runs full-width
                 along the bottom of both. */
              <div style={css("position:relative;z-index:2;width:min(92vw,880px);display:flex;flex-direction:column;gap:22px")}>
                <div style={css("display:flex;align-items:center;gap:clamp(16px,3vw,32px);text-align:left")}>
                  <ArtBg url={v.now.pic} role="img" aria-label="Album art" base={"flex:none;width:min(38vw,220px);aspect-ratio:1;background-size:cover;background-position:center;background-color:#33302f;border:2px solid #f3f2f2"} />
                  <div style={css("min-width:0;flex:1")}>
                    <div style={css("display:flex;align-items:center;gap:8px;margin-bottom:14px")}>
                      <span style={css("width:7px;height:7px;border-radius:50%;background:#ec3013;flex:none;box-shadow:0 0 0 3px rgba(236,48,19,.28)")}></span>
                      <span style={css("font:700 10px 'Archivo',sans-serif;letter-spacing:.24em;text-transform:uppercase;color:#f3f2f2;text-shadow:0 1px 10px rgba(0,0,0,.35)")}>Monkey Radio India · On Air</span>
                    </div>
                    <h1 style={css("font:800 clamp(20px,3.4vw,34px)/1.15 'Archivo',sans-serif;margin:0;max-width:22ch;text-shadow:0 2px 18px rgba(0,0,0,.28)")}>{v.now.name}</h1>
                    <div style={css("font:600 11px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#e6e3e2;margin-top:12px")}>Selected by {v.now.dj}</div>
                  </div>
                </div>
                {v.ambientRuntime ? (
                  <div style={css("width:100%")}>
                    <div style={css("height:3px;background:rgba(243,242,242,.25)")}><span style={css("display:block;height:100%;background:#ec3013;width:" + v.ambientPct)}></span></div>
                    <div style={css("font:600 9.5px 'Archivo',sans-serif;letter-spacing:.12em;color:#d8d5d4;margin-top:8px")}>{v.ambientElapsed} / {v.ambientRuntime}</div>
                  </div>
                ) : null}
                {/* A per-show QR code (linking to /show/<slug>) lived here
                    briefly and is parked for now, not dropped for good. */}
              </div>
            )}
          </div>
        )}

        <header ref={v.headRef} style={css("position:sticky;top:0;z-index:62;background:#f3f2f2;border-bottom:2px solid #201e1d")}>
          <div className="mri-headbar" style={css("max-width:1560px;margin:0 auto;padding:" + v.headPadY + " clamp(16px,3.2vw,32px);display:flex;align-items:center;gap:clamp(12px,2vw,26px);flex-wrap:wrap")}>
            <button onClick={v.goHome} style={css("display:flex;align-items:center;gap:10px;background:none;border:0;padding:0;cursor:pointer;color:inherit")}>
              <img src="assets/logo.png" alt="Monkey Radio India" style={css("width:34px;height:32px;object-fit:contain;display:block")} />
              <span className="mri-brand" style={css("font-weight:800;font-size:14px;letter-spacing:.02em;white-space:nowrap;text-transform:uppercase")}>Monkey Radio India</span>
            </button>

            {v.navInline && (
              <nav className="mri-row" style={css("display:flex;gap:clamp(14px,1.8vw,22px);overflow-x:auto;min-width:0;flex:0 1 auto")}>
                <button onClick={v.nav} data-view="home" style={css("background:none;border:0;padding:6px 0;cursor:pointer;font:600 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap;color:" + v.navHome + ";border-bottom:2px solid " + v.navHomeBar)}>Home</button>
                <button onClick={v.nav} data-view="browse" style={css("background:none;border:0;padding:6px 0;cursor:pointer;font:600 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap;color:" + v.navBrowse + ";border-bottom:2px solid " + v.navBrowseBar)}>Archive</button>
                <button onClick={v.nav} data-view="djs" style={css("background:none;border:0;padding:6px 0;cursor:pointer;font:600 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap;color:" + v.navDjs + ";border-bottom:2px solid " + v.navDjsBar)}>Selectors</button>
                <button onClick={v.nav} data-view="library" style={css("background:none;border:0;padding:6px 0;cursor:pointer;font:600 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap;color:" + v.navLib + ";border-bottom:2px solid " + v.navLibBar)}>Saved</button>
                <button onClick={v.nav} data-view="about" style={css("background:none;border:0;padding:6px 0;cursor:pointer;font:600 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap;color:" + v.navAbout + ";border-bottom:2px solid " + v.navAboutBar)}>About</button>
              </nav>
            )}

            <div style={css("flex:1 1 20px;min-width:0")}></div>

            {!v.headMenu && (
              <div role="search" style={css("display:flex;align-items:center;gap:8px;border-bottom:2px solid #201e1d;padding:5px 0;min-width:150px;flex:1 1 220px")}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none;color:#605d5d")}><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="search" aria-label="Search shows" value={v.query} onChange={v.onSearch} onFocus={v.searchFocus} placeholder={v.searchHint} style={css("flex:1;min-width:0;background:none;border:0;padding:2px 0;color:#201e1d;font:500 13px 'Archivo',sans-serif;outline:none;-webkit-appearance:none;appearance:none")} />
              </div>
            )}

            <button onClick={v.tuneIn} className="h-accent-bg" style={css("display:flex;align-items:center;justify-content:center;gap:" + v.tuneGap + ";background:#ec3013;color:#fff;border:0;border-radius:0;height:" + v.ctlSize + ";padding:0 " + v.tunePadX + ";font:600 11px 'Archivo',sans-serif;letter-spacing:" + v.tuneLS + ";text-transform:uppercase;cursor:pointer;white-space:nowrap")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><path d="m18 14 4 4-4 4"></path><path d="m18 2 4 4-4 4"></path><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"></path><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"></path><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"></path></svg>
              <span>{v.tuneText}</span>
            </button>

            {v.headMenu && (
              <button onClick={v.toggleMenu} aria-label="Menu" style={css("width:" + v.ctlSize + ";height:" + v.ctlSize + ";display:flex;align-items:center;justify-content:center;border:1px solid #201e1d;background:" + v.menuBg + ";color:" + v.menuFg + ";cursor:pointer;border-radius:0;flex:none")}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block")}><path d="M4 6h16"></path><path d="M4 12h16"></path><path d="M4 18h16"></path></svg>
              </button>
            )}
          </div>

          {v.menuOpen && (
            <nav style={css("border-top:1px solid #d7d3d3;padding:0 clamp(16px,3.2vw,32px) 8px")}>
              <div role="search" style={css("display:flex;align-items:center;gap:10px;border-bottom:2px solid #201e1d;padding:12px 0")}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none;color:#605d5d")}><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="search" aria-label="Search shows" value={v.query} onChange={v.onSearch} onKeyDown={v.menuSearchKey} onFocus={v.searchFocus} placeholder={v.searchHint} style={css("flex:1;min-width:0;background:none;border:0;padding:8px 0;color:#201e1d;font:500 16px 'Archivo',sans-serif;outline:none;-webkit-appearance:none;appearance:none")} />
              </div>
              <button onClick={v.nav} data-view="home" style={css("display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid #d7d3d3;padding:15px 0;cursor:pointer;font:600 12px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:" + v.navHome)}>Home</button>
              <button onClick={v.nav} data-view="browse" style={css("display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid #d7d3d3;padding:15px 0;cursor:pointer;font:600 12px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:" + v.navBrowse)}>Archive</button>
              <button onClick={v.nav} data-view="djs" style={css("display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid #d7d3d3;padding:15px 0;cursor:pointer;font:600 12px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:" + v.navDjs)}>Selectors</button>
              <button onClick={v.nav} data-view="library" style={css("display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid #d7d3d3;padding:15px 0;cursor:pointer;font:600 12px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:" + v.navLib)}>Saved</button>
              <button onClick={v.nav} data-view="about" style={css("display:block;width:100%;text-align:left;background:none;border:0;padding:15px 0;cursor:pointer;font:600 12px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:" + v.navAbout)}>About</button>
            </nav>
          )}
        </header>

        {v.indexing && (
          <div style={css("border-bottom:1px solid #d7d3d3;background:#eae9e9")}>
            <div style={css("max-width:1560px;margin:0 auto;padding:8px clamp(16px,3.2vw,32px);display:flex;align-items:center;gap:10px;font:500 11px 'Archivo',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#605d5d")}>
              <span style={css("display:inline-block;width:11px;height:11px;border:2px solid #d7d3d3;border-top-color:#ec3013;border-radius:50%;animation:mri-spin .8s linear infinite")}></span>
              Indexing archive. {v.loadedCount} shows loaded
            </div>
          </div>
        )}

        <main style={css("max-width:1560px;margin:0 auto;padding:0 clamp(16px,3.2vw,32px)")}>

          {v.detailPage && (
            <section style={css("padding:18px 0 0")}>
              <button ref={v.detailCloseBtnRef} onClick={v.closeDetail} style={css("display:flex;align-items:center;gap:9px;background:none;border:0;padding:8px 0;margin-bottom:14px;cursor:pointer;color:#201e1d;font:600 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><path d="M19 12H5"></path><path d="m12 19-7-7 7-7"></path></svg>
                Back
              </button>
              <ArtBg url={v.detail.pic} role="img" aria-label="Album art" className="mri-detailart" base="width:100%;aspect-ratio:1;background-size:cover;background-position:center;background-color:#eae9e9;border:1px solid #d7d3d3" />
              <div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#ae1800;margin:18px 0 10px")}>{v.detail.when} / Monkey Radio India</div>
              <h1 style={css("font-weight:800;font-size:clamp(24px,7vw,32px);line-height:1.06;letter-spacing:-.03em;margin:0 0 12px;text-wrap:pretty")}>{v.detail.name}</h1>
              <div style={css("font:500 14px 'Archivo',sans-serif;color:#444141;margin-bottom:20px")}>Selected by {/^monkey radio india$/i.test(v.detail.dj)
                ? <strong style={css("font-weight:700;color:#201e1d")}>{v.detail.dj}</strong>
                : <button onClick={v.pickDj} data-id={v.detail.dj} aria-label={"All shows selected by " + v.detail.dj} style={css("font:inherit;font-weight:700;color:#201e1d;background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:3px")}>{v.detail.dj}</button>}</div>
              {this.notesBlock(v.detail, true)}
              <div className="mri-detailstats" style={css("display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #d7d3d3;border-bottom:1px solid #d7d3d3;margin-bottom:20px")}>
                <div style={css("padding:14px 0")}><div style={css("font-weight:800;font-size:19px;letter-spacing:-.02em")}>{v.detail.len}</div><div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-top:4px")}>Runtime</div></div>
                <div style={css("padding:14px 0 14px 16px;border-left:1px solid #d7d3d3")}><div style={css("font-weight:800;font-size:19px;letter-spacing:-.02em")}>{v.detail.plays}</div><div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-top:4px")}>Plays</div></div>
                <div style={css("padding:14px 0 14px 16px;border-left:1px solid #d7d3d3")}><div style={css("font-weight:800;font-size:19px;letter-spacing:-.02em")}>{v.detail.favs}</div><div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-top:4px")}>Favourites</div></div>
              </div>
              <div style={css("display:flex;flex-direction:column;gap:8px;margin-bottom:22px")}>
                <button onClick={v.playDetail} style={css("display:flex;align-items:center;gap:10px;width:100%;background:#201e1d;color:#f3f2f2;border:0;border-radius:0;padding:15px 18px;font:600 12px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer")}>
                  {iconPlay}
                  Play now
                </button>
                <div style={css("display:flex;gap:8px")}>
                  <button onClick={v.queueDetail} style={css("flex:1;display:flex;align-items:center;gap:9px;background:none;color:#201e1d;border:1px solid #201e1d;border-radius:0;padding:14px 14px;font:600 11px 'Archivo',sans-serif;letter-spacing:.12em;text-transform:uppercase;cursor:pointer")}>
                    {iconQueue}
                    Queue
                  </button>
                  <button onClick={v.toggleFav} data-key={v.detail.key} style={css("flex:1;display:flex;align-items:center;gap:9px;background:" + v.detail.favBg + ";color:" + v.detail.favFg + ";border:1px solid #201e1d;border-radius:0;padding:14px 14px;font:600 11px 'Archivo',sans-serif;letter-spacing:.12em;text-transform:uppercase;cursor:pointer")}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill={v.detail.favFill} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
                    {v.detail.favLabel}
                  </button>
                  <button onClick={v.shareDetail} aria-label={v.shared ? 'Link copied' : 'Share'} style={css("flex:none;width:52px;display:flex;align-items:center;justify-content:center;background:" + (v.shared ? '#201e1d' : 'none') + ";color:" + (v.shared ? '#f3f2f2' : '#201e1d') + ";border:1px solid #201e1d;border-radius:0;cursor:pointer;transition:background .15s")}>
                    {v.shared
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={css("display:block")}><path d="M20 6 9 17l-5-5"></path></svg>
                      : iconShare}
                  </button>
                </div>
              </div>
              {v.shareLinks && (
                <div style={css("margin-bottom:24px")}>
                  <div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-bottom:10px")}>Share this show</div>
                  <div style={css("display:flex;gap:8px")}>
                    <a href={v.shareLinks.facebook} target="_blank" rel="noopener" onClick={v.shareChannelClick('facebook')} className="h-invert" aria-label="Share on Facebook" style={shareNetStyle}>{iconFacebook}</a>
                    <button onClick={v.shareInstagram} className="h-invert" aria-label="Copy caption for Instagram" style={shareNetStyle}>{iconInstagram}</button>
                    <a href={v.shareLinks.twitter} target="_blank" rel="noopener" onClick={v.shareChannelClick('twitter')} className="h-invert" aria-label="Share on X (Twitter)" style={shareNetStyle}>{iconTwitter}</a>
                    <a href={v.shareLinks.whatsapp} target="_blank" rel="noopener" onClick={v.shareChannelClick('whatsapp')} className="h-invert" aria-label="Share on WhatsApp" style={shareNetStyle}>{iconWhatsApp}</a>
                  </div>
                </div>
              )}
              <div style={css("display:flex;flex-wrap:wrap;gap:6px;margin-bottom:26px")}>
                {v.detail.tags.map((t, i) => (
                  <span key={i} style={css("font:500 10.5px 'Archivo',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#605d5d;border:1px solid #d7d3d3;padding:5px 9px")}>{t}</span>
                ))}
              </div>
              <div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#6a6666;margin-bottom:14px;border-top:2px solid #201e1d;padding-top:18px")}>More in this vein</div>
              <div className="mri-row" style={css("display:flex;gap:12px;overflow-x:auto;padding-bottom:6px")}>
                {v.related.map((m) => (
                  <div key={m.key} role="button" tabIndex={0} aria-label={m.name + ', selected by ' + m.dj} onClick={v.openMix} onKeyDown={v.openMixKey} data-key={m.key} style={css("flex:none;width:124px;cursor:pointer")}>
                    <ArtImg src={m.pic} alt="" loading="lazy" style={css("width:124px;height:124px;object-fit:cover;border:1px solid #d7d3d3;display:block")} />
                    <div style={css("font:600 11.5px/1.3 'Archivo',sans-serif;margin-top:9px;height:30px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden")}>{m.name}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {v.detailWide && (
            <section style={css("padding:18px 0 48px;max-width:960px")}>
              <button ref={v.detailCloseBtnRef} onClick={v.closeDetail} style={css("display:flex;align-items:center;gap:9px;background:none;border:0;padding:8px 0;margin-bottom:18px;cursor:pointer;color:#201e1d;font:600 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><path d="M19 12H5"></path><path d="m12 19-7-7 7-7"></path></svg>
                Back
              </button>
              <div className="mri-detailhead" style={css("display:flex;gap:40px;flex-wrap:wrap;align-items:flex-start")}>
                <ArtBg url={v.detail.pic} role="img" aria-label="Album art" base="width:min(320px,100%);aspect-ratio:1;background-size:cover;background-position:center;background-color:#eae9e9;border:1px solid #d7d3d3;flex:none" />
                <div style={css("flex:1;min-width:280px")}>
                  <div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#ae1800;margin-bottom:12px")}>{v.detail.when} / Monkey Radio India</div>
                  <h1 style={css("font-weight:800;font-size:clamp(24px,3.4vw,32px);line-height:1.06;letter-spacing:-.03em;margin:0 0 12px;text-wrap:pretty")}>{v.detail.name}</h1>
                  <div style={css("font:500 14px 'Archivo',sans-serif;color:#444141;margin-bottom:20px")}>Selected by {/^monkey radio india$/i.test(v.detail.dj)
                    ? <strong style={css("font-weight:700;color:#201e1d")}>{v.detail.dj}</strong>
                    : <button onClick={v.pickDj} data-id={v.detail.dj} aria-label={"All shows selected by " + v.detail.dj} style={css("font:inherit;font-weight:700;color:#201e1d;background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:3px")}>{v.detail.dj}</button>}</div>
                  {this.notesBlock(v.detail, false)}
                  <div style={css("display:flex;flex-wrap:wrap;gap:6px;margin-bottom:22px")}>
                    {v.detail.tags.map((t, i) => (
                      <span key={i} style={css("font:500 10.5px 'Archivo',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#605d5d;border:1px solid #d7d3d3;padding:5px 9px")}>{t}</span>
                    ))}
                  </div>
                  <div style={css("display:flex;gap:34px;margin-bottom:24px")}>
                    <div><div style={css("font-weight:800;font-size:20px;letter-spacing:-.02em")}>{v.detail.len}</div><div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-top:4px")}>Runtime</div></div>
                    <div><div style={css("font-weight:800;font-size:20px;letter-spacing:-.02em")}>{v.detail.plays}</div><div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-top:4px")}>Plays</div></div>
                    <div><div style={css("font-weight:800;font-size:20px;letter-spacing:-.02em")}>{v.detail.favs}</div><div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-top:4px")}>Favourites</div></div>
                  </div>
                  <div style={css("display:flex;flex-wrap:wrap;gap:8px")}>
                    <button onClick={v.playDetail} className="h-dark-accent" style={css("display:flex;align-items:center;gap:10px;background:#201e1d;color:#f3f2f2;border:0;border-radius:0;padding:12px 18px;font:600 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer")}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={css("display:block;flex:none")}><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
                      Play now
                    </button>
                    <button onClick={v.queueDetail} className="h-invert" style={css("display:flex;align-items:center;gap:10px;background:none;color:#201e1d;border:1px solid #201e1d;border-radius:0;padding:12px 16px;font:600 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer")}>
                      {iconQueue}
                      Queue
                    </button>
                    <button onClick={v.toggleFav} data-key={v.detail.key} style={css("display:flex;align-items:center;gap:10px;background:" + v.detail.favBg + ";color:" + v.detail.favFg + ";border:1px solid #201e1d;border-radius:0;padding:12px 16px;font:600 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer")}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill={v.detail.favFill} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
                      {v.detail.favLabel}
                    </button>
                    <button onClick={v.shareDetail} className="h-invert" style={css("display:flex;align-items:center;gap:10px;background:none;color:#201e1d;border:1px solid #201e1d;border-radius:0;padding:12px 16px;font:600 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer")}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" x2="12" y1="2" y2="15"></line></svg>
                      {v.shareLabel}
                    </button>
                  </div>
                  {v.shareLinks && (
                    <div style={css("margin-top:16px")}>
                      <div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-bottom:10px")}>Share this show</div>
                      <div style={css("display:flex;gap:8px")}>
                        <a href={v.shareLinks.facebook} target="_blank" rel="noopener" onClick={v.shareChannelClick('facebook')} className="h-invert" aria-label="Share on Facebook" style={shareNetStyle}>{iconFacebook}</a>
                        <button onClick={v.shareInstagram} className="h-invert" aria-label="Copy caption for Instagram" style={shareNetStyle}>{iconInstagram}</button>
                        <a href={v.shareLinks.twitter} target="_blank" rel="noopener" onClick={v.shareChannelClick('twitter')} className="h-invert" aria-label="Share on X (Twitter)" style={shareNetStyle}>{iconTwitter}</a>
                        <a href={v.shareLinks.whatsapp} target="_blank" rel="noopener" onClick={v.shareChannelClick('whatsapp')} className="h-invert" aria-label="Share on WhatsApp" style={shareNetStyle}>{iconWhatsApp}</a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#6a6666;margin:34px 0 14px;border-top:2px solid #201e1d;padding-top:18px")}>More in this vein</div>
              <div className="mri-row" style={css("display:flex;gap:16px;overflow-x:auto;padding-bottom:6px")}>
                {v.related.map((m) => (
                  <div key={m.key} role="button" tabIndex={0} aria-label={m.name + ', selected by ' + m.dj} onClick={v.openMix} onKeyDown={v.openMixKey} data-key={m.key} className="h-fade" style={css("flex:none;width:132px;cursor:pointer")}>
                    <ArtImg src={m.pic} alt="" loading="lazy" style={css("width:132px;height:132px;object-fit:cover;border:1px solid #d7d3d3;display:block")} />
                    <div style={css("font:600 11.5px/1.3 'Archivo',sans-serif;margin-top:9px;height:30px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden")}>{m.name}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {v.isHome && (
            <section>
              <div className="mri-hero" onMouseEnter={v.heroHold} onMouseLeave={v.heroRelease} style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:clamp(26px,4vw,56px);padding:clamp(28px,4vw,46px) 0 clamp(26px,3.4vw,40px);border-bottom:2px solid #201e1d;align-items:start")}>
                <div className="mri-herotext">
                  {v.heroGreeting ? <div className="mri-herogreet">{v.heroGreeting}</div> : null}
                  <div style={css("display:flex;align-items:center;gap:9px;margin-bottom:22px")}>
                    <span style={st("width:9px;height:9px;flex:none;display:block;animation:mri-blink 1.8s steps(1,end) infinite", {background: v.heroPulse})}></span>
                    <span style={css("font:600 11px/1 'Archivo',sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#ae1800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0")}>{v.heroKicker}</span>
                  </div>
                  <div className="mri-herohead"><h1>{v.heroTitle}</h1></div>
                  <p className="mri-heroblurb">{v.heroBlurb}</p>
                  {v.heroRuntime ? (
                    <div className="mri-herolive" aria-hidden={v.heroOnAir ? undefined : "true"}>
                      {v.heroOnAir ? <div className="mri-herobar"><span style={{width: v.heroProgPct}}></span></div> : null}
                      <div className="mri-herolivemeta">
                        <span>{v.heroOnAir ? v.heroElapsed + ' / ' + v.heroRuntime : v.heroRuntime + ' runtime'}</span>
                        {v.heroOnAir && v.heroUpNext ? <span className="mri-heroup">{v.heroUpNext}</span> : null}
                      </div>
                    </div>
                  ) : null}
                  <ArtBg key={v.heroKey} url={v.heroBg} className="mri-heroart-m" role="img" aria-label="Album art" />
                  <div className="mri-herometa">
                    <span>{v.heroDj}</span>
                    <span>Aired {v.heroWhen}</span>
                    <span>{v.heroGenre}</span>
                  </div>
                  <div className="mri-herobtns" style={css("display:flex;flex-wrap:wrap;gap:10px")}>
                    <button onClick={v.heroPlay} data-key={v.heroKey} className="h-dark-accent" style={css("display:flex;align-items:center;gap:10px;background:#201e1d;color:#f3f2f2;border:0;border-radius:0;padding:13px 20px;font:600 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer")}>
                      {iconPlay}
                      Play the set
                    </button>
                    <button onClick={v.toggleFav} data-key={v.heroKey} className="h-accent-outline" style={st("display:flex;align-items:center;gap:10px;background:none;border:2px solid #201e1d;border-radius:0;padding:11px 18px;font:600 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer", {color: v.heroSaveColor, borderColor: v.heroSaveColor})}>
                      {iconHeart(v.heroSaved ? "currentColor" : "none")}
                      {v.heroSaveLabel}
                    </button>
                  </div>
                  {v.heroMulti && (
                    <div role="tablist" aria-label="Featured transmissions" style={css("display:flex;align-items:center;gap:4px;margin-top:20px;margin-left:-7px")}>
                      {v.heroDots.map(d => (
                        <button key={d.i} onClick={v.heroDot} data-i={d.i} aria-label="Show featured transmission" className="mri-herodot" style={css("width:26px;height:26px;padding:0;display:flex;align-items:center;justify-content:center;border:0;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent")}>
                          <span style={st("width:10px;height:10px;display:block;border:1px solid " + d.bd, {background: d.bg})}></span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <ArtBg key={v.heroKey} url={v.heroBg} className="mri-heroart" role="img" aria-label="Album art" base="width:100%;max-width:460px;aspect-ratio:1;background-size:cover;background-position:center;background-color:#eae9e9;border:2px solid #201e1d" />
              </div>

              <div className="mri-statbar" style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));border-bottom:2px solid #201e1d")}>
                <div style={css("padding:24px 24px 24px 0")}><div style={css("font-weight:800;font-size:clamp(28px,4vw,38px);letter-spacing:-.04em;line-height:1")}>{v.totalShows}</div><div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-top:6px")}>Shows archived</div></div>
                <div style={css("padding:24px;border-left:1px solid #d7d3d3")}><div style={css("font-weight:800;font-size:clamp(28px,4vw,38px);letter-spacing:-.04em;line-height:1")}>{v.totalHours}</div><div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-top:6px")}>Hours of tape</div></div>
                <div style={css("padding:24px;border-left:1px solid #d7d3d3")}><div style={css("font-weight:800;font-size:clamp(28px,4vw,38px);letter-spacing:-.04em;line-height:1")}>{v.djCount}</div><div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-top:6px")}>Selectors</div></div>
                <div style={css("padding:24px;border-left:1px solid #d7d3d3")}><div style={css("font-weight:800;font-size:clamp(28px,4vw,38px);letter-spacing:-.04em;line-height:1")}>{v.totalPlays}</div><div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-top:6px")}>Plays all time</div></div>
              </div>

              <div className="mri-moodbar" style={css("display:flex;align-items:center;flex-wrap:wrap;gap:0;border-bottom:1px solid #d7d3d3;padding:16px 0")}>
                <span style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-right:20px")}>Listen by mood</span>
                {v.moods.map((mo) => (
                  <button key={mo.id} onClick={v.pickMood} data-id={mo.id} className="h-accent-text" style={css("background:none;border:0;border-right:1px solid #d7d3d3;padding:4px 16px;cursor:pointer;font:600 12.5px 'Archivo',sans-serif;color:#201e1d;white-space:nowrap")}>{mo.label}</button>
                ))}
              </div>

              {v.shelves.map((shelf) => (
                <div key={shelf.id} style={css("padding:34px 0 30px;border-bottom:1px solid #d7d3d3")}>
                  <div className="mri-shelfhead" style={css("display:flex;align-items:baseline;gap:16px;margin-bottom:20px")}>
                    <h2 style={css("font-weight:700;font-size:19px;letter-spacing:-.015em;margin:0")}>{shelf.title}</h2>
                    <span className="mri-shelfsub" style={css("font:500 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#6a6666")}>{shelf.sub}</span>
                    <div className="mri-spacer" style={css("flex:1")}></div>
                    <button onClick={v.openShelf} data-id={shelf.id} className="h-accent-text mri-seeall" style={css("display:flex;align-items:center;gap:7px;background:none;border:0;color:#201e1d;font:600 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;padding:6px 0")}>
                      See all
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </button>
                    <button onClick={v.scrollShelf} data-shelf={shelf.id} data-dir="-1" aria-label="Scroll left" className="h-invert mri-shelfarrow" style={css("width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:1px solid #201e1d;background:none;color:#201e1d;cursor:pointer;border-radius:0")}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block")}><path d="m15 18-6-6 6-6"></path></svg>
                    </button>
                    <button onClick={v.scrollShelf} data-shelf={shelf.id} data-dir="1" aria-label="Scroll right" className="h-invert mri-shelfarrow" style={css("width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:1px solid #201e1d;background:none;color:#201e1d;cursor:pointer;border-radius:0")}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block")}><path d="m9 18 6-6-6-6"></path></svg>
                    </button>
                  </div>
                  <div className="mri-row" id={"shelf-" + shelf.id} style={css("display:flex;gap:clamp(12px,2vw,22px);overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:4px")}>
                    {shelf.items.map((m, i) => (
                      <div key={m.key + ':' + i} role="button" tabIndex={0} aria-label={m.name + ', selected by ' + m.dj} onClick={v.openMix} onKeyDown={v.openMixKey} data-key={m.key} data-ctx={shelf.id} className="mri-card" style={css("flex:none;width:clamp(146px,40vw,198px);scroll-snap-align:start;cursor:pointer")}>
                        <div className="mri-art" style={css("position:relative;width:100%;aspect-ratio:1;background:#eae9e9;border:1px solid #d7d3d3;overflow:hidden")}>
                          <ArtImg src={m.pic} alt="" loading="lazy" style={css("width:100%;height:100%;object-fit:cover;display:block")} />
                          <span className="mri-arttag" style={css("position:absolute;right:0;bottom:0;background:#201e1d;color:#f3f2f2;font:600 10px 'Archivo',sans-serif;letter-spacing:.08em;padding:4px 7px;transition:background .2s ease")}>{m.len}</span>
                        </div>
                        <div style={css("font:600 13px/1.3 'Archivo',sans-serif;margin-top:11px;height:34px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden")}>{m.name}</div>
                        <div style={css("font:500 11px 'Archivo',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#6a6666;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{m.dj}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}

          {v.isBrowse && (
            <section className="mri-browsesec" style={css("padding:44px 0 0")}>
              {v.showBack && (
                <button onClick={v.goBack} style={css("display:flex;align-items:center;gap:9px;background:none;border:0;padding:8px 0;margin-bottom:12px;cursor:pointer;color:#201e1d;font:600 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><path d="M19 12H5"></path><path d="m12 19-7-7 7-7"></path></svg>
                  {v.backLabel}
                </button>
              )}
              <h1 style={css("font-weight:800;font-size:clamp(28px,3.4vw,44px);letter-spacing:-.035em;margin:0 0 10px")}>{v.browseTitle}</h1>
              <p style={css("margin:0 0 28px;font:500 11px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666")}>{v.browseCount} shows, sorted by {v.sortLabel}</p>

              {!v.filtersCollapsible && (
              <div style={css("display:flex;flex-wrap:wrap;gap:8px;padding-bottom:12px")}>
                {v.genreChips.map((g) => (
                  <button key={g.id} onClick={v.pickGenre} data-id={g.id} className="h-accent-border" style={css("border:1px solid " + g.border + ";background:" + g.bg + ";color:" + g.fg + ";border-radius:0;padding:8px 13px;font:600 11px 'Archivo',sans-serif;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;display:flex;gap:8px;align-items:center")}>{g.label}<span style={css("opacity:.55;font-weight:500")}>{g.count}</span></button>
                ))}
              </div>
              )}
              {!v.filtersCollapsible && (
              <div className="mri-filterbar" style={css("display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding-bottom:24px;border-bottom:2px solid #201e1d")}>
                {v.moodChips.map((mo) => (
                  <button key={mo.id} onClick={v.pickMood} data-id={mo.id} className="h-accent-border" style={css("border:1px solid " + mo.border + ";background:" + mo.bg + ";color:" + mo.fg + ";border-radius:0;padding:8px 13px;font:600 11px 'Archivo',sans-serif;letter-spacing:.1em;text-transform:uppercase;cursor:pointer")}>{mo.label}</button>
                ))}
                <div className="mri-spacer" style={css("flex:1")}></div>
                <button onClick={v.cycleSort} className="h-invert" style={css("display:flex;align-items:center;gap:8px;border:1px solid #201e1d;background:none;color:#201e1d;border-radius:0;padding:8px 13px;font:600 11px 'Archivo',sans-serif;letter-spacing:.1em;text-transform:uppercase;cursor:pointer")}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><path d="m21 16-4 4-4-4"></path><path d="M17 20V4"></path><path d="m3 8 4-4 4 4"></path><path d="M7 4v16"></path></svg>
                  {v.sortLabel}
                </button>
                <button onClick={v.clearFilters} className="h-accent-text" style={css("border:0;background:none;color:#6a6666;font:600 11px 'Archivo',sans-serif;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;padding:8px 4px")}>Clear</button>
              </div>
              )}
              {v.filtersCollapsible && (
              <div style={css("border-bottom:2px solid #201e1d;padding-bottom:14px")}>
                <div style={css("display:flex;flex-wrap:wrap;gap:8px;align-items:center")}>
                  <button onClick={v.toggleFilters} aria-expanded={v.filtersOpen} className="h-invert" style={css("display:flex;align-items:center;gap:8px;border:1px solid #201e1d;background:" + (v.filtersOpen ? "#201e1d" : "none") + ";color:" + (v.filtersOpen ? "#f3f2f2" : "#201e1d") + ";border-radius:0;padding:11px 14px;font:600 11px 'Archivo',sans-serif;letter-spacing:.1em;text-transform:uppercase;cursor:pointer")}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><line x1="4" x2="4" y1="21" y2="14"></line><line x1="4" x2="4" y1="10" y2="3"></line><line x1="12" x2="12" y1="21" y2="12"></line><line x1="12" x2="12" y1="8" y2="3"></line><line x1="20" x2="20" y1="21" y2="16"></line><line x1="20" x2="20" y1="12" y2="3"></line><line x1="2" x2="6" y1="14" y2="14"></line><line x1="10" x2="14" y1="8" y2="8"></line><line x1="18" x2="22" y1="16" y2="16"></line></svg>
                    Filters{v.activeFilterLabel ? " · " + v.activeFilterLabel : ""}
                  </button>
                  <button onClick={v.cycleSort} className="h-invert" style={css("display:flex;align-items:center;gap:8px;border:1px solid #201e1d;background:none;color:#201e1d;border-radius:0;padding:11px 14px;font:600 11px 'Archivo',sans-serif;letter-spacing:.1em;text-transform:uppercase;cursor:pointer")}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><path d="m21 16-4 4-4-4"></path><path d="M17 20V4"></path><path d="m3 8 4-4 4 4"></path><path d="M7 4v16"></path></svg>
                    {v.sortLabel}
                  </button>
                  <button onClick={v.clearFilters} className="h-accent-text" style={css("border:0;background:none;color:#6a6666;font:600 11px 'Archivo',sans-serif;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;padding:11px 6px")}>Clear</button>
                </div>
                {v.filtersOpen && (
                <div style={css("padding-top:14px")}>
                  <div style={css("display:flex;flex-wrap:wrap;gap:8px")}>
                    {v.genreChips.map((g) => (
                      <button key={g.id} onClick={v.pickGenre} data-id={g.id} className="h-accent-border" style={css("border:1px solid " + g.border + ";background:" + g.bg + ";color:" + g.fg + ";border-radius:0;padding:9px 13px;font:600 11px 'Archivo',sans-serif;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;display:flex;gap:8px;align-items:center")}>{g.label}<span style={css("opacity:.55;font-weight:500")}>{g.count}</span></button>
                    ))}
                  </div>
                  {v.moodChips.length > 0 && (
                  <div style={css("display:flex;flex-wrap:wrap;gap:8px;padding-top:8px")}>
                    {v.moodChips.map((mo) => (
                      <button key={mo.id} onClick={v.pickMood} data-id={mo.id} className="h-accent-border" style={css("border:1px solid " + mo.border + ";background:" + mo.bg + ";color:" + mo.fg + ";border-radius:0;padding:9px 13px;font:600 11px 'Archivo',sans-serif;letter-spacing:.1em;text-transform:uppercase;cursor:pointer")}>{mo.label}</button>
                    ))}
                  </div>
                  )}
                </div>
                )}
              </div>
              )}

              <div style={css("display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,150px),1fr));gap:clamp(22px,3vw,34px) clamp(12px,2vw,22px);padding:30px 0 0")}>
                {v.gridItems.map((m, i) => (
                  <div key={m.key + ':' + i} role="button" tabIndex={0} aria-label={m.name + ', selected by ' + m.dj} onClick={v.openMix} onKeyDown={v.openMixKey} data-key={m.key} className="mri-card" style={css("cursor:pointer")}>
                    <div className="mri-art" style={css("position:relative;width:100%;aspect-ratio:1;background:#eae9e9;border:1px solid #d7d3d3;overflow:hidden")}>
                      <ArtImg src={m.pic} alt="" loading="lazy" style={css("width:100%;height:100%;object-fit:cover;display:block")} />
                      <span className="mri-arttag" style={css("position:absolute;right:0;bottom:0;background:#201e1d;color:#f3f2f2;font:600 10px 'Archivo',sans-serif;letter-spacing:.08em;padding:4px 7px;transition:background .2s ease")}>{m.len}</span>
                    </div>
                    <div style={css("font:600 13px/1.3 'Archivo',sans-serif;margin-top:11px;height:34px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden")}>{m.name}</div>
                    <div style={css("font:500 11px 'Archivo',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#6a6666;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{m.dj}, {m.when}</div>
                  </div>
                ))}
              </div>
              {v.hasMore && (
                <div style={css("padding:40px 0 10px")}>
                  <button onClick={v.showMore} className="h-invert" style={css("border:2px solid #201e1d;background:none;color:#201e1d;border-radius:0;padding:13px 24px;font:600 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer")}>Load more shows</button>
                </div>
              )}
              {v.gridEmpty && (
                <div style={css("padding:70px 0;font:500 14px 'Archivo',sans-serif;color:#6a6666")}>Nothing matches that filter. Try another genre.</div>
              )}
            </section>
          )}

          {v.isDjs && (
            <section style={css("padding:44px 0 0")}>
              <h1 style={css("font-weight:800;font-size:clamp(28px,3.4vw,44px);letter-spacing:-.035em;margin:0 0 10px")}>Selectors</h1>
              <p style={css("margin:0 0 30px;font:500 11px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666")}>{v.djCount} residents and guests</p>
              <div style={css("border-top:2px solid #201e1d")}>
                {v.djs.map((d) => (
                  <div key={d.name} role="button" tabIndex={0} aria-label={"Shows by " + d.name} onClick={v.pickDj} onKeyDown={v.pickDjKey} data-id={d.name} className="h-row mri-djrow" style={css("display:flex;flex-wrap:" + (v.isSm ? "nowrap" : "wrap") + ";gap:8px 20px;align-items:center;padding:14px 0;border-bottom:1px solid #d7d3d3;cursor:pointer")}>
                    <ArtImg src={d.pic} alt="" loading="lazy" style={css("width:52px;height:52px;object-fit:cover;flex:none;border:1px solid #d7d3d3;display:block")} />
                    <div style={css("flex:1 1 " + (v.isSm ? "auto" : "220px") + ";min-width:0;font:600 15px 'Archivo',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{d.name}</div>
                    {v.isSm ? (
                      // Phone: the genre tags are dropped and the two numeric
                      // columns collapse into one nowrap unit, pinned right.
                      <div style={css("flex:none;white-space:nowrap;font:600 12px 'Archivo',sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#6a6666")}>{d.count} {d.count === 1 ? 'show' : 'shows'} &middot; {d.hours} h</div>
                    ) : (
                      <React.Fragment>
                        <div style={css("flex:1 1 180px;min-width:0;font:500 12px 'Archivo',sans-serif;color:#6a6666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{d.tags}</div>
                        <div style={css("flex:none;min-width:78px;text-align:right;font:600 12px 'Archivo',sans-serif;letter-spacing:.08em;text-transform:uppercase")}>{d.count} {d.count === 1 ? 'show' : 'shows'}</div>
                        <div style={css("flex:none;min-width:52px;text-align:right;font:500 12px 'Archivo',sans-serif;color:#6a6666")}>{d.hours} h</div>
                      </React.Fragment>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {v.isLibrary && (
            <section style={css("padding:44px 0 0")}>
              <h1 style={css("font-weight:800;font-size:clamp(28px,3.4vw,44px);letter-spacing:-.035em;margin:0 0 24px")}>Saved</h1>
              <div className="mri-row mri-tabs" style={css("display:flex;overflow-x:auto;border-bottom:2px solid #201e1d")}>
                <button onClick={v.setTab} data-tab="favs" style={css("background:" + v.tabFavBg + ";color:" + v.tabFavFg + ";border:0;border-radius:0;padding:11px 18px;font:600 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer")}>Saved shows</button>
                <button onClick={v.setTab} data-tab="queue" style={css("background:" + v.tabQueueBg + ";color:" + v.tabQueueFg + ";border:0;border-radius:0;padding:11px 18px;font:600 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer")}>Up next</button>
                <button onClick={v.setTab} data-tab="history" style={css("background:" + v.tabHistBg + ";color:" + v.tabHistFg + ";border:0;border-radius:0;padding:11px 18px;font:600 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer")}>Recently played</button>
              </div>
              <div>
                {v.libItems.map((m, i) => (
                  <div key={m.key + ':' + i} role="button" tabIndex={0} aria-label={m.name + ', selected by ' + m.dj} onClick={v.openMix} onKeyDown={v.openMixKey} data-key={m.key} className="h-row" style={css("display:flex;gap:18px;align-items:center;padding:12px 0;border-bottom:1px solid #d7d3d3;cursor:pointer")}>
                    <ArtImg src={m.pic} alt="" loading="lazy" style={css("width:48px;height:48px;object-fit:cover;flex:none;border:1px solid #d7d3d3;display:block")} />
                    <div style={css("flex:1;min-width:0")}>
                      <div style={css("font:600 14px 'Archivo',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{m.name}</div>
                      <div style={css("font:500 11px 'Archivo',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#6a6666;margin-top:4px")}>{m.dj}</div>
                    </div>
                    <span style={css("font:500 12px 'Archivo',sans-serif;color:#6a6666;padding-right:4px;flex:none")}>{m.len}</span>
                  </div>
                ))}
              </div>
              {v.libEmpty && (
                <div style={css("padding:70px 0;font:500 14px 'Archivo',sans-serif;color:#6a6666")}>{v.libEmptyMsg}</div>
              )}
            </section>
          )}

          {v.isAbout && (
            <section style={css("padding:44px 0 0;max-width:900px")}>
              <div style={css("display:flex;align-items:flex-start;gap:" + (v.isSm ? "0" : "48px") + ";flex-direction:" + (v.isSm ? "column" : "row") + ";margin-bottom:40px")}>
                <div role="img" aria-label="Monkey Radio India" style={css("flex:none;order:" + (v.isSm ? "0" : "2") + ";aspect-ratio:400/387;pointer-events:none;user-select:none;background:center/contain no-repeat image-set(url(" + v.aboutLogo + ") 1x, url(" + v.aboutLogo2x + ") 2x);width:" + (v.isSm ? "min(360px,72%);margin-bottom:38px" : "300px;margin-top:6px"))}></div>
                <div style={css("flex:1;min-width:0")}>
                  <div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#ae1800;margin-bottom:14px")}>The station</div>
                  <h1 style={css("font-weight:800;font-size:clamp(24px,3vw,40px);line-height:1.02;letter-spacing:-.03em;margin:0 0 22px")}>Monkey Radio India</h1>
                  <div style={css("height:2px;background:#201e1d;margin-bottom:24px")}></div>
                  <p style={css("font:400 17px/1.6 'Archivo',sans-serif;color:#444141;margin:0 0 18px;max-width:68ch")}>Monkey Radio India is a community radio station and streaming platform broadcasting from Hyderabad. Since 25 October 2011 it has been public, non-profit and free of commercials, with a civilian approach to broadcasting, and is run by the Monkey Foundation. It takes inspiration from <a href="https://tilos.hu" target="_blank" rel="noopener" onClick={v.outboundClick('tilos')} style={css("text-decoration:underline")}>Tilos Rádió</a> in Hungary.</p>
                  <p style={css("font:400 17px/1.6 'Archivo',sans-serif;color:#444141;margin:0 0 18px;max-width:68ch")}>Founded by Dakta Dub, the station began as a meeting point for Hyderabad's underground and has grown into a platform that connects local crews with artists from across India and the world. The schedule runs live DJ sets, pre-recorded shows and conversations, with attention on artists and scenes working beyond the mainstream.</p>
                  <p style={css("font:400 17px/1.6 'Archivo',sans-serif;color:#444141;margin:0 0 18px;max-width:68ch")}>The programme moves between genres without rules. Dub, reggae and sound system music sit alongside jazz, electronic, hip hop, experimental and ambient, as well as literature and other art forms. The result is an archive of more than 900 shows, broadcast at international standards.</p>
                  <p style={css("font:400 17px/1.6 'Archivo',sans-serif;color:#444141;margin:0 0 26px;max-width:68ch")}>Beyond broadcasting, the Monkey Foundation runs events, workshops and projects that grow the community at home and abroad, working with a network of like-minded DJs, foundations and cultural spaces.</p>
                  <a href="https://www.mixcloud.com/monkeyradioindia/" target="_blank" rel="noopener" onClick={v.outboundClick('mixcloud')} className="h-invert" style={css("display:inline-flex;align-items:center;gap:10px;border:2px solid #201e1d;color:#201e1d;padding:12px 18px;font:600 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase")}>
                    Follow on Mixcloud
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><path d="M7 17 17 7"></path><path d="M7 7h10v10"></path></svg>
                  </a>
                </div>
              </div>
              <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));border-top:1px solid #d7d3d3")}>
                <div style={css("padding:20px 20px 20px 0")}><div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-bottom:8px")}>Based</div><div style={css("font:600 15px 'Archivo',sans-serif")}>Hyderabad, India</div></div>
                <div style={css("padding:20px;border-left:1px solid #d7d3d3")}><div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-bottom:8px")}>Web</div><a href="http://www.monkeyradio.in" target="_blank" rel="noopener" onClick={v.outboundClick('monkeyradio_in')} style={css("font:600 15px 'Archivo',sans-serif")}>monkeyradio.in</a></div>
                <div style={css("padding:20px;border-left:1px solid #d7d3d3")}><div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-bottom:8px")}>Archive</div><a href="https://www.mixcloud.com/monkeyradioindia/" target="_blank" rel="noopener" onClick={v.outboundClick('mixcloud')} style={css("font:600 15px 'Archivo',sans-serif")}>Mixcloud</a></div>
                <div style={css("padding:20px;border-left:1px solid #d7d3d3")}><div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-bottom:8px")}>Social</div><a href="https://www.instagram.com/monkeyradioindia" target="_blank" rel="noopener" onClick={v.outboundClick('instagram')} style={css("font:600 15px 'Archivo',sans-serif")}>@monkeyradioindia</a></div>
              </div>

              <div style={css("margin-top:64px;display:flex;align-items:flex-start;gap:" + (v.isSm ? "0" : "48px") + ";flex-direction:" + (v.isSm ? "column" : "row"))}>
                <div style={css("flex:1;min-width:0")}>
                  <div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#ae1800;margin-bottom:14px")}>The rig</div>
                  <h2 style={css("font-weight:800;font-size:clamp(24px,3vw,40px);line-height:1.02;letter-spacing:-.03em;margin:0 0 22px")}>Monkey Sound System</h2>
                  <div style={css("height:2px;background:#201e1d;margin-bottom:24px")}></div>
                  <p style={css("font:400 17px/1.6 'Archivo',sans-serif;color:#444141;margin:0 0 18px;max-width:68ch")}>The Monkey Sound System is a custom rig, hand-built by Mr. Taus to the personal taste of Dakta Dub, founder of Monkey Foundation.</p>
                  <p style={css("font:400 17px/1.6 'Archivo',sans-serif;color:#444141;margin:0 0 18px;max-width:68ch")}>On any sound system the sub-bass boxes are the real weapon. For the Monkey rig that weapon is the hog scoop.</p>
                  <p style={css("font:400 17px/1.6 'Archivo',sans-serif;color:#444141;margin:0;max-width:68ch")}>We call the boxes “Balasub”, named for Dakta Dub and his long endeavour to build a sound system for Hyderabad, and to put the city on the global map of sound system culture.</p>
                </div>
                <div role="img" aria-label="The Monkey Sound System, a hand-built dub speaker stack" style={css("flex:none;aspect-ratio:460/421;pointer-events:none;user-select:none;background:center/contain no-repeat " + SOUND_SYSTEM_BG + ";width:" + (v.isSm ? "min(420px,100%);margin-top:32px" : "340px;margin-top:2px"))}></div>
              </div>

              <div id="mri-submit" style={css("margin-top:64px;border-top:1px solid #d7d3d3;padding-top:40px;scroll-margin-top:90px")}>
                <div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#ae1800;margin-bottom:14px")}>Get on the station</div>
                <h2 style={css("font-weight:800;font-size:clamp(22px,2.6vw,32px);line-height:1.05;letter-spacing:-.03em;margin:0 0 18px")}>Send a show</h2>
                <p style={css("font:400 15px/1.65 'Archivo',sans-serif;color:#444141;margin:0 0 22px;max-width:64ch")}>Selectors and crews working beyond the mainstream are welcome. Send a link to a recorded mix (Mixcloud, SoundCloud or a plain file) with your city and what you play, and we'll sit with it end to end. If it carries the weight the station runs on, we'll get back to you about a slot in the rotation. Guest mixes run at any length.</p>
                <a href={v.submitHref} className="h-invert" style={css("display:inline-flex;align-items:center;gap:10px;border:2px solid #201e1d;color:#201e1d;padding:12px 18px;font:600 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase")}>
                  Submit a show
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-10 6L2 7"></path></svg>
                </a>
              </div>
            </section>
          )}

          {this.legalView(v)}

        </main>

        <footer style={css("border-top:2px solid #201e1d;margin-top:88px")}>
          <div style={css("max-width:1560px;margin:0 auto;padding:0 clamp(16px,3.2vw,32px)")}>
            <div style={css("display:flex;gap:" + (v.isSm ? "36px" : "56px") + ";flex-direction:" + (v.isSm ? "column" : "row") + ";padding:56px 0 40px")}>

              <div style={css("flex:none;order:" + (v.isSm ? "0" : "2") + ";display:flex;flex-direction:column;align-items:center")}>
                <div role="img" aria-label="The Monkey Sound System, a hand-built dub speaker stack" style={css("aspect-ratio:460/421;pointer-events:none;user-select:none;background:center/contain no-repeat " + SOUND_SYSTEM_BG + ";width:" + (v.isSm ? "min(280px,66%)" : "236px"))}></div>
                {!v.isSm && (
                  <div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-top:12px")}>Monkey Sound System</div>
                )}
              </div>

              <div style={css("flex:1;min-width:0")}>
                <div style={css("display:flex;align-items:center;gap:10px;margin-bottom:16px")}>
                  <img src="assets/logo.png" alt="" style={css("width:30px;height:28px;object-fit:contain;display:block")} />
                  <span style={css("font-weight:800;font-size:13px;letter-spacing:.02em;text-transform:uppercase")}>Monkey Radio India</span>
                </div>
                <p style={css("font:400 14px/1.6 'Archivo',sans-serif;color:#444141;margin:0 0 26px;max-width:52ch")}>Community radio and sound system culture, broadcasting from Hyderabad. Public, non-profit and free of commercials since 25 October 2011, run by the Monkey Foundation.</p>

                <div style={css("display:grid;grid-template-columns:" + (v.isSm ? "1fr" : "repeat(auto-fit,minmax(150px,1fr))") + ";gap:24px 32px")}>
                  <div>
                    <div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-bottom:11px")}>Follow</div>
                    <a href="https://www.instagram.com/monkeyradioindia" target="_blank" rel="noopener" onClick={v.outboundClick('instagram')} style={css("display:block;font:600 14px 'Archivo',sans-serif;margin-bottom:8px")}>Instagram</a>
                    <a href="https://www.facebook.com/monkeyradioindia" target="_blank" rel="noopener" onClick={v.outboundClick('facebook')} style={css("display:block;font:600 14px 'Archivo',sans-serif;margin-bottom:8px")}>Facebook</a>
                    <a href="https://www.mixcloud.com/monkeyradioindia/" target="_blank" rel="noopener" onClick={v.outboundClick('mixcloud')} style={css("display:block;font:600 14px 'Archivo',sans-serif")}>Follow on Mixcloud</a>
                  </div>
                  <div>
                    <div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-bottom:11px")}>Contact</div>
                    <a href="mailto:monkeyradio.in@gmail.com" style={css("display:block;font:600 14px 'Archivo',sans-serif;margin-bottom:8px;white-space:nowrap")}>monkeyradio.in@gmail.com</a>
                    <button onClick={v.goSubmit} style={css("display:block;background:none;border:0;padding:0;cursor:pointer;text-align:left;font:600 14px 'Archivo',sans-serif;color:#201e1d")}>Submit a show</button>
                  </div>
                  <div>
                    <div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-bottom:11px")}>Explore</div>
                    <button onClick={v.nav} data-view="browse" style={css("display:block;background:none;border:0;padding:0;margin-bottom:8px;cursor:pointer;text-align:left;font:600 14px 'Archivo',sans-serif;color:#201e1d")}>Archive</button>
                    <button onClick={v.nav} data-view="djs" style={css("display:block;background:none;border:0;padding:0;margin-bottom:8px;cursor:pointer;text-align:left;font:600 14px 'Archivo',sans-serif;color:#201e1d")}>Selectors</button>
                    <button onClick={v.nav} data-view="about" style={css("display:block;background:none;border:0;padding:0;margin-bottom:8px;cursor:pointer;text-align:left;font:600 14px 'Archivo',sans-serif;color:#201e1d")}>About the station</button>
                    <button onClick={v.nav} data-view="legal" style={css("display:block;background:none;border:0;padding:0;cursor:pointer;text-align:left;font:600 14px 'Archivo',sans-serif;color:#201e1d")}>Terms &amp; Privacy</button>
                  </div>
                </div>
              </div>
            </div>

            <div style={css("border-top:1px solid #d7d3d3;padding:16px 0 8px;display:flex;gap:10px 20px;flex-wrap:wrap;align-items:center;justify-content:space-between")}>
              <span style={css("font:500 11px 'Archivo',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#6a6666")}>&copy; {new Date().getFullYear()} Monkey Foundation</span>
              <span style={css("font:500 11px 'Archivo',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#6a6666")}>Hyderabad, India</span>
            </div>
          </div>
        </footer>

        {v.playing && (v.isSm ? (
          <div className="mri-mp" data-exp={v.playerExpanded ? '1' : '0'}>
            <div className="mp-head">
              <button onClick={v.collapsePlayer} aria-label="Minimise player" className="mp-hbtn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block")}><path d="m6 9 6 6 6-6"></path></svg>
              </button>
              <span className="mp-kicker">Now Playing</span>
              <button onClick={v.stopPlaying} aria-label="Stop playback" className="mp-hbtn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block")}><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
              </button>
            </div>
            <div className="mp-body">
              <ArtBg url={v.now.pic} aria-hidden="true" onClick={v.openMix} data-key={v.now.key} className="mp-cover" base="aspect-ratio:1;background-size:cover;background-position:center;background-color:#eae9e9;border:1px solid #d7d3d3;cursor:pointer" />
              <div>
                <div className="mp-when">{v.now.when} / Monkey Radio India</div>
                <h2 className="mp-title" role="button" tabIndex={0} aria-label={"Show details: " + v.now.name} onClick={v.openMix} onKeyDown={v.openMixKey} data-key={v.now.key} style={css("cursor:pointer")}>{v.now.name}</h2>
                <div className="mp-dj">Selected by <strong>{v.now.dj}</strong></div>
                {v.upNextName ? <div className="mp-next">Up next &middot; {v.upNextName}</div> : null}
              </div>
              <button onClick={v.cycleSleep} className="mp-radio" data-on={v.sleepOn ? '1' : '0'} aria-label="Sleep timer" title="Stop playback after this show or a set time">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>
                {v.sleepLabel}
              </button>
              <div className="mp-row3">
                <button onClick={v.playPrev} disabled={!v.canPrev} className="mp-abtn" aria-label="Previous show" style={css(v.canPrev ? "" : "opacity:.38;pointer-events:none")}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><polygon points="19 20 9 12 19 4"></polygon><line x1="5" x2="5" y1="19" y2="5"></line></svg>
                  Prev
                </button>
                <button onClick={v.playNext} className="mp-abtn" aria-label="Next show">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" x2="19" y1="5" y2="19"></line></svg>
                  Next
                </button>
                <button onClick={v.toggleFav} data-key={v.now.key} className="mp-abtn" style={css("color:" + v.now.favFg)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill={v.now.favFill} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
                  Save
                </button>
                <button onClick={v.shareNow} className="mp-abtn">
                  {v.shared
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><path d="M20 6 9 17l-5-5"></path></svg>
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" x2="12" y1="2" y2="15"></line></svg>}
                  {v.shared ? 'Copied' : 'Share'}
                </button>
                <button onClick={v.enterAmbient} className="mp-abtn" aria-label="Ambient mode" title="Distraction-free now-playing view">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><path d="M8 3H5a2 2 0 0 0-2 2v3"></path><path d="M21 8V5a2 2 0 0 0-2-2h-3"></path><path d="M3 16v3a2 2 0 0 0 2 2h3"></path><path d="M16 21h3a2 2 0 0 0 2-2v-3"></path></svg>
                  Ambient
                </button>
              </div>
            </div>
            <div className="mp-mini">
              <ArtBg tag="button" url={v.now.pic} onClick={v.expandPlayer} aria-label="Open player" className="mp-mthumb" />
              <button onClick={v.expandPlayer} className="mp-mmeta">
                <span className="mp-mtitle">{v.now.name}</span>
                <span className="mp-mdj">{v.now.dj}</span>
              </button>
              <button onClick={v.toggleFav} data-key={v.now.key} aria-label="Save show" className="mp-mbtn" style={css("color:" + v.now.favFg)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={v.now.favFill} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block")}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
              </button>
              <button onClick={v.playNext} aria-label="Next show" className="mp-mbtn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block")}><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" x2="19" y1="5" y2="19"></line></svg>
              </button>
              <button onClick={v.stopPlaying} aria-label="Stop playback" className="mp-mbtn is-close">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block")}><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
              </button>
            </div>
            <div className="mp-scrub">
              {v.playerErr ? (
                <div className="mp-scruberr">
                  <span>Player couldn't load.</span>
                  <div className="mp-scruberr-act">
                    <button onClick={v.retryPlayer} type="button">Retry</button>
                    <a href={v.now.url} target="_blank" rel="noopener">Open on Mixcloud ↗</a>
                  </div>
                </div>
              ) : null}
              {/* Mixcloud's own mini widget is the transport - play/scrub/time
                  and the Mixcloud logo + click-through, kept visible and
                  unmodified as their embed terms require. Pinned at the bottom
                  of the dock so it stays on screen in both the collapsed bar
                  and the expanded sheet - playing a show never needs the sheet
                  opened first. Our progress bars (home slides, ambient mode,
                  lock screen) are driven off the widget's JS events, not this
                  element's visibility. */}
              <iframe ref={v.playerRef} title="Mixcloud player" src={v.playerSrc} className={"mp-mc" + (v.playerErr ? " is-off" : "")} width="100%" height="60" frameBorder="0" allow="autoplay" onError={v.playerIframeError}></iframe>
            </div>
          </div>
        ) : (
          <div style={css("position:fixed;left:0;right:0;bottom:0;z-index:70;background:#fff;border-top:2px solid #201e1d")}>
            <div className="mri-dockrow" style={css("max-width:1560px;margin:0 auto;padding:10px clamp(16px,3.2vw,32px);display:flex;align-items:center;gap:12px;flex-wrap:wrap")}>
              <ArtBg url={v.now.pic} aria-hidden="true" onClick={v.openMix} data-key={v.now.key} base="width:60px;height:60px;background-size:cover;background-position:center;background-color:#eae9e9;border:1px solid #d7d3d3;flex:none;cursor:pointer" />
              <div className="mri-nowmeta" style={css("min-width:140px;max-width:250px")}>
                <div role="button" tabIndex={0} aria-label={"Show details: " + v.now.name} onClick={v.openMix} onKeyDown={v.openMixKey} data-key={v.now.key} style={css("font:600 13px 'Archivo',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer")}>{v.now.name}</div>
                <div style={css("font:500 10px 'Archivo',sans-serif;letter-spacing:.1em;color:#6a6666;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>Selected by <strong style={css("font-weight:700;color:#201e1d")}>{v.now.dj}</strong></div>
                {v.upNextName ? <div style={css("font:600 9.5px 'Archivo',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#6c6c6c;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>Next &middot; {v.upNextName}</div> : null}
              </div>
              <div style={css("flex:1;min-width:240px;display:flex;align-items:center;gap:12px")}>
                {v.playerErr ? (
                  <div style={css("flex:none;display:flex;align-items:center;gap:12px;font:600 10px 'Archivo',sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#6a6666")}>
                    <span style={css("white-space:nowrap")}>Player couldn't load</span>
                    <button onClick={v.retryPlayer} type="button" className="h-accent-text" style={css("border:0;background:none;color:#201e1d;font:inherit;letter-spacing:inherit;text-transform:inherit;cursor:pointer;padding:0;text-decoration:underline")}>Retry</button>
                    <a href={v.now.url} target="_blank" rel="noopener" style={css("white-space:nowrap")}>Open on Mixcloud ↗</a>
                  </div>
                ) : null}
                {/* Mixcloud's own mini widget is the transport - visible and
                    unmodified per their embed terms (logo + click-through
                    intact). The home-slide / ambient / lock-screen progress
                    bars run off the widget's JS events, not this node. */}
                <iframe ref={v.playerRef} title="Mixcloud player" src={v.playerSrc} className={"mp-mc" + (v.playerErr ? " is-off" : "")} width="100%" height="60" frameBorder="0" allow="autoplay" onError={v.playerIframeError}></iframe>
              </div>
              <button onClick={v.cycleSleep} aria-label="Sleep timer" title="Stop after this show or a set time" className="mri-sleepbtn" style={css("display:flex;align-items:center;gap:9px;border:1px solid #201e1d;background:" + (v.sleepOn ? "#201e1d" : "transparent") + ";color:" + (v.sleepOn ? "#f3f2f2" : "#201e1d") + ";border-radius:0;padding:10px 13px;font:600 10.5px 'Archivo',sans-serif;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;white-space:nowrap")}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>
                <span className="mri-sleeplabel">{v.sleepOn ? 'Sleep · ' + v.sleepShort : 'Sleep'}</span>
              </button>
              <button onClick={v.playPrev} disabled={!v.canPrev} aria-label="Previous show" className="h-invert mri-dockbtn" style={css("width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:1px solid #201e1d;background:none;color:#201e1d;border-radius:0;cursor:" + (v.canPrev ? "pointer" : "not-allowed") + ";opacity:" + (v.canPrev ? "1" : ".38") + ";pointer-events:" + (v.canPrev ? "auto" : "none"))}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block")}><polygon points="19 20 9 12 19 4"></polygon><line x1="5" x2="5" y1="19" y2="5"></line></svg>
              </button>
              <button onClick={v.playNext} aria-label="Next show" className="h-invert mri-dockbtn" style={css("width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:1px solid #201e1d;background:none;color:#201e1d;cursor:pointer;border-radius:0")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block")}><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" x2="19" y1="5" y2="19"></line></svg>
              </button>
              <button onClick={v.toggleFav} data-key={v.now.key} aria-label="Save show" className="h-accent-border mri-dockbtn" style={css("width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:1px solid #201e1d;background:none;color:" + v.now.favFg + ";cursor:pointer;border-radius:0")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={v.now.favFill} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block")}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
              </button>
              <button onClick={v.enterAmbient} aria-label="Ambient mode" title="Distraction-free now-playing view" className="h-invert mri-dockbtn" style={css("width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:1px solid #201e1d;background:none;color:#201e1d;cursor:pointer;border-radius:0")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block")}><path d="M8 3H5a2 2 0 0 0-2 2v3"></path><path d="M21 8V5a2 2 0 0 0-2-2h-3"></path><path d="M3 16v3a2 2 0 0 0 2 2h3"></path><path d="M16 21h3a2 2 0 0 0 2-2v-3"></path></svg>
              </button>
              <button onClick={v.stopPlaying} aria-label="Close player" className="h-invert mri-dockbtn" style={css("width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:1px solid #201e1d;background:none;color:#201e1d;cursor:pointer;border-radius:0")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block")}><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
              </button>
            </div>
          </div>
        ))}

        {/* Always mounted, never conditionally rendered - a live region has
            to already exist in the accessibility tree before its content
            changes, or most screen readers never pick up the announcement.
            Idle state is fully transparent (see .mri-toast in index.html). */}
        <div role="status" aria-live="polite" className="mri-toast" data-show={v.toast ? '1' : '0'} style={css("position:fixed;left:50%;z-index:90;bottom:" + v.toastBottom + ";transform:translateX(-50%);background:#201e1d;color:#f3f2f2;font:600 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;padding:12px 20px;border:2px solid #201e1d;white-space:nowrap;pointer-events:none")}>{v.toast}</div>

        {v.playing && v.resumeAt ? (
          <div role="status" style={css("position:fixed;left:50%;z-index:91;bottom:" + v.resumeBottom + ";transform:translateX(-50%);display:flex;align-items:center;gap:12px;max-width:calc(100vw - 24px);background:#201e1d;color:#f3f2f2;font:600 11px 'Archivo',sans-serif;letter-spacing:.06em;padding:8px 8px 8px 16px;border:2px solid #201e1d;white-space:nowrap")}>
            <span>Resumed from {v.resumeAtLabel}</span>
            <button onClick={v.startOver} type="button" style={css("flex:none;border:1px solid #f3f2f2;background:none;color:#f3f2f2;font:inherit;letter-spacing:.1em;text-transform:uppercase;padding:6px 10px;cursor:pointer")}>Start over</button>
            <button onClick={v.dismissResume} type="button" aria-label="Dismiss" style={css("flex:none;border:0;background:none;color:#f3f2f2;cursor:pointer;padding:4px;display:flex")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={css("display:block")}><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
            </button>
          </div>
        ) : null}

      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(<Component />);
