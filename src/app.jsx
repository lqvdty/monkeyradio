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
  STOP = ['monkey radio india','monkeyradioindia','monkey radio','hyderabad','india','daktadub','dakta dub','dakta-dub','roots unwired','dub vibration','mr nobody','mrnobody','tune inn','souls of sound','psylenz','selekta chakkra','music manthan','disco freak','bass sanskriti','hyderabad underground movement','dj amul','dj def hawk','radio','radio show','mix','dj mix','podcast','live','guest mix','india radio','underground'];
  GENRES = [
    {id:'hiphop', label:'Hip Hop & Rap', tags:['hip hop','hip-hop','hiphop','rap','boom bap','boombap','old school hip hop','underground hip hop','g-funk','g funk','west coast hip hop','east coast hip hop','instrumental hip hop','turntablism','trap','conscious hip hop','90s hip hop','golden era','scratch']},
    {id:'funk', label:'Funk, Soul & Disco', tags:['funk','soul','r&b','rnb','r and b','disco','nu disco','motown','northern soul','boogie','rare groove','neo soul','soul funk','funk soul','1970s','1980s','70s','80s soul']},
    {id:'afro', label:'Indian Classical & World', tags:['indian classical','carnatic','hindustani','raga','raag','sitar','tabla','sarod','bansuri','classical indian','desi','bhangra','bollywood','sufi','qawwali','folk','afrobeat','afrobeats','afro house','afro','afrofunk','world','world music','latin','cumbia','reggaeton','salsa','arabic','balkan','ethiopian','ethio jazz','highlife','tropical','global bass','fusion']},
    {id:'house', label:'Techno', tags:['house','techno','deep house','tech house','minimal','minimal techno','electro','edm','dance','acid','acid house','disco house','progressive house','electronica','electronic','melodic techno','dub techno','dubtechno','italo','detroit techno']},
    {id:'psy', label:'Psychedelic', tags:['psychill','psy chill','psydub','psy dub','psybient','psytrance','psy trance','goa','goa trance','ambient','ambient dub','chillgressive','forest psy','organic house','ethnic ambient','dark psy','downtempo psy']},
    {id:'reggae', label:'Dub & Reggae', tags:['reggae','dub','dancehall','ska','roots reggae','rocksteady','riddim','dub reggae','steppers','lovers rock','ragga','reggae roots','uk dub','sound system']},
    {id:'chill', label:'Downtempo & Chill', tags:['lofi','lo-fi','lo fi','chillout','chill','chill out','downtempo','trip hop','triphop','jazz hop','beats','lounge','balearic']},
    {id:'jazz', label:'Jazz & Blues', tags:['jazz','blues','bossa nova','bossa','latin jazz','swing','soul jazz','spiritual jazz','free jazz','jazz funk','nu jazz','afro jazz']},
    {id:'rock', label:'Rock & Alternative', tags:['rock','indie','punk','surf rock','psychedelic rock','metal','garage rock','post punk','alternative','new wave','shoegaze','grunge','classic rock','indie rock','post rock']},
    {id:'bass', label:'Jungle, D&B & Bass', tags:['drum and bass','drum & bass','drum n bass','dnb','d&b','jungle','breakbeat','breaks','garage','uk garage','dubstep','bass','bass music','grime','footwork','halftime','neurofunk']},
    {id:'vinyl', label:'Vinyl Only', tags:['vinyl only','vinyl','all vinyl','45s','7 inch','vinyl mix','vinyl set','wax']},
    {id:'pop', label:'Pop & Classics', tags:['pop','90s','classics','oldies','retro','1990s','throwback','mashup','party','synthpop','city pop','80s pop']}
  ];
  MOODS = [
    {id:'latenight', label:'Late night', tags:['deep house','techno','downtempo','ambient','dub','trip hop','triphop','minimal','lofi','psydub','dub techno','underground hip hop','melodic techno']},
    {id:'monsoon', label:'Monsoon', tags:['lofi','lo-fi','ambient','downtempo','dub','trip hop','chillout','psychill','psydub','ambient dub','bossa nova','soul','jazz','indian classical','hindustani','carnatic']},
    {id:'sunday', label:'Sunday morning', tags:['soul','jazz','bossa nova','blues','chillout','r&b','lounge','funk','balearic','nu jazz']},
    {id:'party', label:'Party', tags:['funk','disco','house','afrobeat','afrobeats','dancehall','party','hip hop','pop','mashup','edm','tech house','breakbeat']},
    {id:'cratedig', label:'Crate digger', tags:['vinyl only','vinyl','old school hip hop','rare groove','45s','oldies','soul jazz','1970s','boogie','northern soul']},
    {id:'focus', label:'Focus', tags:['instrumental hip hop','ambient','jazz','lofi','beats','minimal','downtempo','psychill','organic house']}
  ];
  CACHE_KEY = 'mri.cloudcasts.v7';
  PREF_KEY = 'mri.prefs.v1';
  RESUME_KEY = 'mri.resume.v1';
  PROG_KEY = 'mri.progress.v1';

  _measure = (w) => {
    const width = w || (this._root && this._root.clientWidth) || document.documentElement.clientWidth;
    if (!width) return;
    const b = width <= 720 ? 'sm' : width <= 1080 ? 'md' : 'lg';
    if (b !== this.state.bp) this.setState({bp: b});
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
    favs: [], queue: [], history: [], shared: false, bp: 'lg', menuOpen: false,
    paused: false, playerExpanded: false, toast: '', heroIdx: 0,
    // Sleep timer, ephemeral: null | {type:'show'} | {type:'time', mins, at}.
    sleep: null,
    // Auto-generated station lineup, kept topped up to 3 at all times.
    // Ephemeral: never written to prefs, unlike the user's `queue`.
    upNext: []
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
  // (/about, /selectors, /saved, /archive?genre=house, /show/<slug>) so
  // pages are linkable, bookmarkable and back/forward works. Every handler
  // still just calls setState; componentDidUpdate pushes the URL after.
  // Internal view ids stay short; the URL slug matches the menu label.
  // Disabled under file:// (History API needs http[s]).
  ROUTE_VIEWS = ['home', 'browse', 'djs', 'library', 'about'];
  VIEW_TO_SLUG = {browse: 'archive', djs: 'selectors', library: 'saved', about: 'about'};
  SLUG_TO_VIEW = {archive: 'browse', selectors: 'djs', saved: 'library', about: 'about'};
  _routing = typeof location !== 'undefined' && /^https?:$/.test(location.protocol);

  slugOf(key) { return (key || '').replace(/^\/+|\/+$/g, '').split('/').pop(); }

  routeToPath(s) {
    if (s.detailKey) return '/show/' + this.slugOf(s.detailKey);
    const qs = new URLSearchParams();
    if (s.genre) qs.set('genre', s.genre);
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
    if (parts[0] === 'show' && parts[1]) return {_showSlug: decodeURIComponent(parts[1])};
    const view = this.SLUG_TO_VIEW[parts[0]] || (this.ROUTE_VIEWS.indexOf(parts[0]) >= 0 ? parts[0] : 'home');
    return {view, detailKey: null, genre: q.get('genre'), mood: q.get('mood'), dj: q.get('dj'), query: q.get('q') || ''};
  }

  resolveShowSlug(slug) {
    const it = this.state.items.find(m => this.slugOf(m.key) === slug);
    return it ? it.key : null;
  }

  applyRoute() {
    if (!this._routing) return;
    const r = this.routeFromLocation();
    if (r._showSlug) {
      const key = this.resolveShowSlug(r._showSlug);
      if (key) { this._pendingShowSlug = null; this.setState({detailKey: key}); }
      else this._pendingShowSlug = r._showSlug;   // items not loaded yet
    } else {
      this._pendingShowSlug = null;
      this.setState(r);
    }
  }

  syncUrl() {
    if (!this._routing) return;
    const target = this.routeToPath(this.state);
    if (target === location.pathname + location.search) return;
    // New keystrokes in the search box only rewrite the query, not the
    // page identity, so they replace rather than pile up history entries.
    const key = [this.state.detailKey || '', this.state.view, this.state.genre || '', this.state.mood || '', this.state.dj || ''].join('|');
    const method = key === this._routeKey ? 'replaceState' : 'pushState';
    this._routeKey = key;
    try { history[method](null, '', target); } catch (e) {}
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
    if (cached && cached.items && cached.items.length) this.setState({items: cached.items});
    this.bootAndSync(cached);
    // A show that was playing before a reload: queue it to be restored on
    // the dock (paused, at its saved position) once the archive is loaded.
    try {
      const r = JSON.parse(localStorage.getItem(this.RESUME_KEY) || 'null');
      if (r && r.key && r.pos > 5) this._pendingResume = r;
    } catch (e) {}
    this._onKey = (e) => { if (e.key === 'Escape') this.setState({detailKey: null, playerExpanded: false}); };
    window.addEventListener('keydown', this._onKey);
    // Persist the playhead when the tab is hidden or closed, not just on
    // the throttled progress tick.
    this._onHide = () => { if (this.state.nowKey && this._wpos > 5) this.saveResume(this.state.nowKey, this._wpos); };
    window.addEventListener('pagehide', this._onHide);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this._onHide(); });
    this._onPop = () => this.applyRoute();
    window.addEventListener('popstate', this._onPop);
    this.applyRoute();
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
    if (this._ro) this._ro.disconnect();
    if (this._heroRotate) clearInterval(this._heroRotate);
    clearTimeout(this._toastT);
    clearTimeout(this._sleepT);
    (this._timers || []).forEach(t => { clearTimeout(t); });
    document.body.style.overflow = '';
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

  NOT_A_DJ = ['indiearth','monkey radio','monkeyradio','monkey sound','tune inn','souls of sound','music manthan','disco freak','bass sanskriti','dub vibration','roots unwired','daktadub','dakta dub','hyderabad underground movement','hyderabad hi fi','hi fi hyderabad','sunday special','sunday live','excursions in','guest mix','radio show','podcast'];
  ALIASES = ['dj def hawk','selekta chakkra','dj amul','psylenz','berencz balazs','dj makarun'];

  djFrom(raw) {
    let s = (raw || '').replace(/│/g, '|').trim();
    const flat = x => (x || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const alias = this.ALIASES.find(a => flat(s).indexOf(flat(a)) === 0);
    if (alias) return alias.replace(/\b\w/g, c => c.toUpperCase());
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
    this.GENRES.forEach(g => {
      const sc = this.genreScore(m, g);
      if (sc > bestSc) { bestSc = sc; best = g.id; }
    });
    this._pgMap.set(m, best);
    return best;
  }
  inGenre(m, id) { return this.primaryGenre(m) === id; }
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
      if (q && !(m.name.toLowerCase().includes(q) || m.dj.toLowerCase().includes(q) || m.tags.some(t => t.includes(q)))) return false;
      return true;
    });
    const sort = f.sort || s.sort;
    if (sort === 'plays') out = out.slice().sort((a, b) => b.plays - a.plays);
    else if (sort === 'longest') out = out.slice().sort((a, b) => b.len - a.len);
    else if (sort === 'oldest') out = out.slice().reverse();
    return out;
  }

  byKey(k) { return this.state.items.find(m => m.key === k); }

  play(key, opts) {
    const m = this.byKey(key);
    if (!m) return;
    // Audio streams from Mixcloud and is never cached (see sw.js), so with no
    // network the player would just render a dead iframe. Bail with a nudge
    // instead - covers every entry point: picks, auto-advance, Prev/Next,
    // Tune in and resume all funnel through here.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.flash('Offline - playback needs a connection');
      return;
    }
    opts = opts || {};
    this._cold = false;
    this._lastResumeSave = 0;
    // Replaying a mix picks up where it was last left: seek to the saved
    // per-show playhead on the widget's first play event. A brand-new show,
    // or one played through to the end, has no mark and starts at 0.
    if (key !== this.state.nowKey) {
      this.clearResume();
      this._nowSince = Date.now();   // trailing ticks from the old show don't save
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
    this._navPos -= 1;
    this.play(this._nav[this._navPos], {nav: true});
  }

  // Step forward through shows already visited via Prev, before falling
  // back to a fresh station pick.
  playFwd() {
    if (!this.canFwd()) return;
    this._navPos += 1;
    this.play(this._nav[this._navPos], {nav: true});
  }

  // Shared "advance to the next show" path: retrace the forward history if
  // Prev was used, else the manual queue, else the station lineup / pool.
  advance() {
    if (this.canFwd()) { this.playFwd(); return; }
    const s = this.state;
    const q = s.queue.slice();
    let k;
    if (q.length) { k = q.shift(); this.savePrefs({queue: q}); }
    else k = this.nextKey();
    if (k) this.play(k, {auto: true});
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
    this.clearResume();
    this.setState({nowKey: null, playerExpanded: false, sleep: null});
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
        try {
          w.events.pause.on(() => {
            // A show switch briefly fires pause on the outgoing stream; that
            // is not a real pause and its position belongs to the old show.
            if (Date.now() - (this._nowSince || 0) < 1500) return;
            this.setState({ paused: true }); this.setMSState('paused');
            if (this.state.nowKey && this._wpos > 5) this.saveResume(this.state.nowKey, this._wpos);
          });
          w.events.play.on(() => {
            this.setState({ paused: false }); this.setMSState('playing');
            this._cold = false;
            // First play after a reload or a show switch: jump to where we
            // left off. Done here (not in `ready`) because seeking only
            // sticks once the stream has actually started buffering.
            if (this._resumeSeek != null) {
              const p = this._resumeSeek; this._resumeSeek = null;
              try { w.seek(p); } catch (e) {}
            }
          });
          // Real playback position, straight from the widget. Drives the
          // hero "on air" bar (while that show is the featured one on the
          // home screen) and the lock-screen scrubber.
          w.events.progress.on((position) => {
            const s = this.state;
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
            // The hero "on air" bar is the only thing this repaints for, and
            // it only needs whole-second resolution - cap it at 1/sec so a
            // widget that ticks faster than that doesn't force extra full
            // re-renders of the page underneath it.
            if (s.view === 'home' && !document.hidden && s.nowKey && Date.now() - (this._lastHeroTick || 0) >= 950) {
              this._lastHeroTick = Date.now();
              this.forceUpdate();
            }
          });
        } catch (e) {}
        w.events.ended.on(() => {
          this.clearResume();   // a finished show shouldn't be "resumed"
          this.clearProg(this.state.nowKey);
          if (this.state.sleep && this.state.sleep.type === 'show') {
            this.setState({sleep: null});
            this.flash('Sleep timer, stopped');
            return;
          }
          this.advance();   // play() tops the lineup back up to 3
        });
      });
    } catch (e) {}
  }
  componentDidUpdate() {
    this.bindWidget();
    // Keep the measured header height current so the show-detail modal can
    // sit below it (header stays visible while the modal is open).
    this._measure();
    // Lock the page behind the full-screen show detail so the body's
    // scrollbar disappears while it's open.
    document.body.style.overflow =
      (this.state.detailKey && this.state.bp !== 'sm') ? 'hidden' : '';
    if (this.state.detailKey) this.fetchDesc(this.state.detailKey);
    if (this._pendingShowSlug && this.state.items.length) {
      const key = this.resolveShowSlug(this._pendingShowSlug);
      this._pendingShowSlug = null;
      if (key) this.setState({detailKey: key});
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
        this._nav = [r.key];
        this._navPos = 0;
        this.setState({nowKey: r.key, paused: true, upNext: this.buildUpNext(r.key, 3)});
        this.updateMediaSession(m);
        this.flash('Resuming at ' + this.fmtLen(r.pos));
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
    // Dialog focus: the desktop/tablet detail view is a real modal
    // (role="dialog" in the render below) - opening it moves focus inside
    // (to Close, so a screen reader lands in it immediately, the way a
    // native dialog would), and closing it hands focus back to whatever
    // card opened it, same as any other modal. The mobile view is a plain
    // page, not a modal, so this only applies at bp !== 'sm'.
    if (this._focusKey !== (this.state.detailKey || '')) {
      const wasOpen = !!this._focusKey;
      const isOpen = !!this.state.detailKey;
      const isModal = this.state.bp !== 'sm';
      this._focusKey = this.state.detailKey || '';
      if (isOpen && isModal) {
        if (this._detailCloseBtn) this._detailCloseBtn.focus();
      } else if (wasOpen && !isOpen) {
        const trigger = this._detailTrigger;
        this._detailTrigger = null;
        if (trigger && document.contains(trigger)) trigger.focus();
      }
    }
    // Deferred scroll to a section (e.g. footer "Submit a show" -> the
    // About page's submission block), once that view has rendered.
    if (this._scrollTo) {
      const el = document.getElementById(this._scrollTo);
      if (el) { this._scrollTo = null; el.scrollIntoView({behavior: 'smooth', block: 'start'}); }
    }
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
    const genreChips = this.GENRES.map(g => Object.assign({id: g.id, label: g.label,
      count: items.filter(m => this.inGenre(m, g.id)).length}, chip(s.genre === g.id)))
      .filter(g => g.count > 0 || s.genre === g.id);
    const moodChips = this.MOODS.map(mo => Object.assign({id: mo.id, label: mo.label,
      count: items.filter(m => this.inMood(m, mo.id)).length}, chip(s.mood === mo.id)))
      .filter(mo => mo.count > 0 || s.mood === mo.id);

    const list = this.filtered();
    const detail = s.detailKey ? this.byKey(s.detailKey) : null;
    const now = s.nowKey ? this.byKey(s.nowKey) : null;
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
      isHome: s.view === 'home' && !(detail && s.bp === 'sm'), isBrowse: s.view === 'browse' && !(detail && s.bp === 'sm'),
      isDjs: s.view === 'djs' && !(detail && s.bp === 'sm'),
      isLibrary: s.view === 'library' && !(detail && s.bp === 'sm'), isAbout: s.view === 'about' && !(detail && s.bp === 'sm'),
      detailPage: !!detail && s.bp === 'sm',
      rootRef: this.attachRoot,
      headRef: (el) => { this._headEl = el; },
      detailOffset: (detail && s.bp !== 'sm') ? (s.headH || 0) : 0,
      isSm: s.bp === 'sm', navInline: s.bp !== 'sm', menuOpen: s.bp === 'sm' && s.menuOpen,
      searchOrder: s.bp === 'sm' ? 3 : 0,
      tuneText: 'Tune in',
      tunePadX: s.bp === 'sm' ? '13px' : '16px',
      tuneGap: s.bp === 'sm' ? '7px' : '10px',
      tuneLS: s.bp === 'sm' ? '.1em' : '.14em',
      menuBg: s.menuOpen ? '#201e1d' : 'transparent', menuFg: s.menuOpen ? '#f3f2f2' : '#201e1d',
      padBottom: (s.nowKey ? (s.bp === 'sm' ? 72 : s.bp === 'md' ? 170 : 120) : 40) + 'px',
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
      gridItems: list.slice(0, s.limit).map(m => this.card(m)),
      hasMore: list.length > s.limit, gridEmpty: !list.length && !s.indexing,
      libItems, libEmpty: !libItems.length,
      libEmptyMsg: s.tab === 'favs' ? 'Nothing saved yet. Use the save button on any show.' : s.tab === 'queue' ? 'The queue is empty. Add shows from a mix card.' : 'No listening history yet.',
      tabFavBg: tf.bg, tabFavFg: tf.fg, tabQueueBg: tq.bg, tabQueueFg: tq.fg, tabHistBg: th.bg, tabHistFg: th.fg,
      detailOpen: !!detail && s.bp !== 'sm',
      detailBottom: now ? (s.bp === 'md' ? '170px' : '120px') : '0px',
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
      toastBottom: !s.nowKey ? '28px' : s.bp === 'sm' ? (s.playerExpanded ? '112px' : '84px') : '150px',
      playing: !!now, paused: s.paused, playerExpanded: s.playerExpanded,
      now: now ? Object.assign({}, this.card(now), {
        url: now.url,
        favFg: isFav(now.key) ? '#ec3013' : '#201e1d',
        favFill: isFav(now.key) ? 'currentColor' : 'none'
      }) : {},
      playerSrc: now ? 'https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&light=1&autoplay=' + (this._cold ? '0' : '1') + '&feed=' + encodeURIComponent(now.url.replace('https://www.mixcloud.com', '')) : '',
      playerRef: (el) => { this._iframe = el; this.bindWidget(); },
      upNextName,

      goHome: () => this.setState({view: 'home', genre: null, mood: null, dj: null, query: '', detailKey: null}),
      goSubmit: () => { this._scrollTo = 'mri-submit'; this.setState({view: 'about', menuOpen: false, genre: null, mood: null, dj: null, query: '', detailKey: null}); },
      nav: (e) => { const view = e.currentTarget.dataset.view; const clear = view === 'browse' ? {} : {genre: null, mood: null, dj: null, query: ''}; this.setState(Object.assign({view, limit: 48, menuOpen: false, detailKey: null}, clear)); },
      onSearch: (e) => this.setState({query: e.target.value, view: 'browse', limit: 48, detailKey: null}),
      // Opening a show remembers the shelf it was opened from (home shelves
      // carry data-ctx), so playing it pins auto-advance to that shelf's
      // list instead of the whole archive.
      openMix: (e) => {
        this._detailCtx = this.shelfCtx(e.currentTarget.dataset.ctx);
        // Remembered so closing the dialog (Escape, the close button, or a
        // click on the backdrop) can hand focus back to whatever opened it.
        this._detailTrigger = e.currentTarget;
        this.setState({detailKey: e.currentTarget.dataset.key, shared: false});
      },
      // Show cards are non-native controls (a div, not a button - the design
      // needs the whole tile clickable), so Enter/Space have to be wired up
      // by hand to reach parity with a real button.
      openMixKey: (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        this._detailCtx = this.shelfCtx(e.currentTarget.dataset.ctx);
        this._detailTrigger = e.currentTarget;
        this.setState({detailKey: e.currentTarget.dataset.key, shared: false});
      },
      closeDetail: () => this.setState({detailKey: null}),
      detailDialogRef: (el) => { this._detailDialogEl = el; },
      detailCloseBtnRef: (el) => { this._detailCloseBtn = el; },
      // The desktop/tablet detail view is a real modal (role="dialog"
      // below) - Tab has to stay inside it while it's open rather than
      // leaking out to the page underneath.
      detailTrapKey: (e) => {
        if (e.key !== 'Tab' || !this._detailDialogEl) return;
        const focusables = this._detailDialogEl.querySelectorAll('a[href],button:not([disabled]),input,[tabindex]:not([tabindex="-1"])');
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      },
      stop: (e) => e.stopPropagation(),
      playDetail: () => this.play(s.detailKey, this._detailCtx ? {ctx: this._detailCtx} : null),
      queueDetail: () => { this.savePrefs({queue: s.queue.concat([s.detailKey]).filter((v, i, a) => a.indexOf(v) === i)}); this.setState({detailKey: null, view: 'library', tab: 'queue'}); },
      shareDetail: () => { const link = shareUrl || location.href; try { navigator.clipboard.writeText(link); } catch (e) {} this.setState({shared: true}); this.flash('Link copied'); },
      shareInstagram: () => {
        if (!shareLinks) return;
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
      shareNow: () => { try { navigator.clipboard.writeText(now ? now.url : ''); } catch (e) {} this.setState({shared: true}); this.flash('Link copied'); },
      togglePlay: () => {
        if (typeof navigator !== 'undefined' && navigator.onLine === false && !this._widget) { this.flash('Offline - playback needs a connection'); return; }
        try { this._widget && this._widget.togglePlay(); } catch (e) {}
      },
      expandPlayer: () => this.setState({playerExpanded: true}),
      collapsePlayer: () => this.setState({playerExpanded: false}),
      toggleFav: (e) => { e.stopPropagation(); const k = e.currentTarget.dataset.key; if (!k) return; this.savePrefs({favs: isFav(k) ? s.favs.filter(x => x !== k) : [k].concat(s.favs)}); },
      cycleSleep: () => this.cycleSleep(),
      sleepOn: !!s.sleep,
      sleepLabel: !s.sleep ? 'Sleep'
        : s.sleep.type === 'show' ? 'Sleep · end of show'
        : 'Sleep · ' + Math.max(1, Math.ceil((s.sleep.at - Date.now()) / 60000)) + 'm',
      sleepShort: !s.sleep ? 'Off'
        : s.sleep.type === 'show' ? 'Show'
        : Math.max(1, Math.ceil((s.sleep.at - Date.now()) / 60000)) + 'm',
      heroPlay: () => { if (!hero) return; this.play(hero.key); },
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
        if (s.nowKey) { if (s.paused) { try { this._widget && this._widget.play(); } catch (e) {} } return; }
        const pool = list.length ? list : items;
        const k = this.smartPick(pool);
        if (k) this.play(k);
      },
      pickGenre: (e) => { const id = e.currentTarget.dataset.id; this.setState({genre: s.genre === id ? null : id, view: 'browse', dj: null, limit: 48}); },
      pickMood: (e) => { const id = e.currentTarget.dataset.id; this.setState({mood: s.mood === id ? null : id, view: 'browse', dj: null, limit: 48}); },
      pickDj: (e) => this.setState({dj: e.currentTarget.dataset.id, view: 'browse', genre: null, mood: null, limit: 48}),
      pickDjKey: (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        this.setState({dj: e.currentTarget.dataset.id, view: 'browse', genre: null, mood: null, limit: 48});
      },
      openShelf: (e) => { const id = e.currentTarget.dataset.id; const g = this.GENRES.find(x => x.id === id); this.setState({view: 'browse', genre: g ? id : null, mood: null, dj: null, query: '', sort: id === 'long' ? 'longest' : id === 'latest' ? 'latest' : 'plays', limit: 48}); },
      cycleSort: () => { const order = ['latest', 'plays', 'longest', 'oldest']; this.setState({sort: order[(order.indexOf(s.sort) + 1) % order.length]}); },
      clearFilters: () => this.setState({genre: null, mood: null, dj: null, query: '', sort: 'latest', limit: 48}),
      showMore: () => this.setState({limit: s.limit + 48}),
      setTab: (e) => this.setState({tab: e.currentTarget.dataset.tab}),
      scrollShelf: (e) => { const el = document.getElementById('shelf-' + e.currentTarget.dataset.shelf); if (el) el.scrollBy({left: 440 * Number(e.currentTarget.dataset.dir), behavior: 'smooth'}); }
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

        <header ref={v.headRef} style={css("position:sticky;top:0;z-index:62;background:#f3f2f2;border-bottom:2px solid #201e1d")}>
          <div className="mri-headbar" style={css("max-width:1560px;margin:0 auto;padding:12px clamp(16px,3.2vw,32px);display:flex;align-items:center;gap:clamp(12px,2vw,26px);flex-wrap:wrap")}>
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

            <div role="search" style={css("display:flex;align-items:center;gap:8px;border-bottom:2px solid #201e1d;padding:5px 0;min-width:150px;flex:1 1 220px;order:" + v.searchOrder)}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none;color:#605d5d")}><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
              <input type="search" aria-label="Search shows" value={v.query} onChange={v.onSearch} placeholder={v.searchHint} style={css("flex:1;min-width:0;background:none;border:0;padding:2px 0;color:#201e1d;font:500 13px 'Archivo',sans-serif;outline:none;-webkit-appearance:none;appearance:none")} />
            </div>

            <button onClick={v.tuneIn} className="h-accent-bg" style={css("display:flex;align-items:center;justify-content:center;gap:" + v.tuneGap + ";background:#ec3013;color:#fff;border:0;border-radius:0;height:42px;padding:0 " + v.tunePadX + ";font:600 11px 'Archivo',sans-serif;letter-spacing:" + v.tuneLS + ";text-transform:uppercase;cursor:pointer;white-space:nowrap")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><path d="m18 14 4 4-4 4"></path><path d="m18 2 4 4-4 4"></path><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"></path><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"></path><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"></path></svg>
              <span>{v.tuneText}</span>
            </button>

            {v.isSm && (
              <button onClick={v.toggleMenu} aria-label="Menu" style={css("width:42px;height:42px;display:flex;align-items:center;justify-content:center;border:1px solid #201e1d;background:" + v.menuBg + ";color:" + v.menuFg + ";cursor:pointer;border-radius:0;flex:none")}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block")}><path d="M4 6h16"></path><path d="M4 12h16"></path><path d="M4 18h16"></path></svg>
              </button>
            )}
          </div>

          {v.menuOpen && (
            <nav style={css("border-top:1px solid #d7d3d3;padding:0 clamp(16px,3.2vw,32px) 8px")}>
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
              <button onClick={v.closeDetail} style={css("display:flex;align-items:center;gap:9px;background:none;border:0;padding:8px 0;margin-bottom:14px;cursor:pointer;color:#201e1d;font:600 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><path d="M19 12H5"></path><path d="m12 19-7-7 7-7"></path></svg>
                Back
              </button>
              <ArtBg url={v.detail.pic} role="img" aria-label="Album art" className="mri-detailart" base="width:100%;aspect-ratio:1;background-size:cover;background-position:center;background-color:#eae9e9;border:1px solid #d7d3d3" />
              <div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#ae1800;margin:18px 0 10px")}>{v.detail.when} / Monkey Radio India</div>
              <h1 style={css("font-weight:800;font-size:clamp(24px,7vw,32px);line-height:1.06;letter-spacing:-.03em;margin:0 0 12px;text-wrap:pretty")}>{v.detail.name}</h1>
              <div style={css("font:500 14px 'Archivo',sans-serif;color:#444141;margin-bottom:20px")}>Selected by <strong style={css("font-weight:700;color:#201e1d")}>{v.detail.dj}</strong></div>
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
                    <a href={v.shareLinks.facebook} target="_blank" rel="noopener" className="h-invert" aria-label="Share on Facebook" style={shareNetStyle}>{iconFacebook}</a>
                    <button onClick={v.shareInstagram} className="h-invert" aria-label="Copy caption for Instagram" style={shareNetStyle}>{iconInstagram}</button>
                    <a href={v.shareLinks.twitter} target="_blank" rel="noopener" className="h-invert" aria-label="Share on X (Twitter)" style={shareNetStyle}>{iconTwitter}</a>
                    <a href={v.shareLinks.whatsapp} target="_blank" rel="noopener" className="h-invert" aria-label="Share on WhatsApp" style={shareNetStyle}>{iconWhatsApp}</a>
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
                    <span style={css("font:500 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#6a6666")}>{shelf.sub}</span>
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
            <section style={css("padding:44px 0 0")}>
              <h1 style={css("font-weight:800;font-size:clamp(28px,3.4vw,44px);letter-spacing:-.035em;margin:0 0 10px")}>{v.browseTitle}</h1>
              <p style={css("margin:0 0 28px;font:500 11px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666")}>{v.browseCount} shows, sorted by {v.sortLabel}</p>

              <div style={css("display:flex;flex-wrap:wrap;gap:8px;padding-bottom:12px")}>
                {v.genreChips.map((g) => (
                  <button key={g.id} onClick={v.pickGenre} data-id={g.id} className="h-accent-border" style={css("border:1px solid " + g.border + ";background:" + g.bg + ";color:" + g.fg + ";border-radius:0;padding:8px 13px;font:600 11px 'Archivo',sans-serif;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;display:flex;gap:8px;align-items:center")}>{g.label}<span style={css("opacity:.55;font-weight:500")}>{g.count}</span></button>
                ))}
              </div>
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
              <p style={css("margin:0 0 30px;font:500 11px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666")}>{v.djCount} residents and guests, plus {v.unattributed} shows credited to the station</p>
              <div style={css("border-top:2px solid #201e1d")}>
                {v.djs.map((d) => (
                  <div key={d.name} role="button" tabIndex={0} aria-label={"Shows by " + d.name} onClick={v.pickDj} onKeyDown={v.pickDjKey} data-id={d.name} className="h-row mri-djrow" style={css("display:flex;flex-wrap:wrap;gap:8px 20px;align-items:center;padding:14px 0;border-bottom:1px solid #d7d3d3;cursor:pointer")}>
                    <ArtImg src={d.pic} alt="" loading="lazy" style={css("width:52px;height:52px;object-fit:cover;flex:none;border:1px solid #d7d3d3;display:block")} />
                    <div style={css("flex:1 1 220px;min-width:0;font:600 15px 'Archivo',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{d.name}</div>
                    <div style={css("flex:1 1 180px;min-width:0;font:500 12px 'Archivo',sans-serif;color:#6a6666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{d.tags}</div>
                    <div style={css("flex:none;min-width:78px;text-align:right;font:600 12px 'Archivo',sans-serif;letter-spacing:.08em;text-transform:uppercase")}>{d.count} shows</div>
                    <div style={css("flex:none;min-width:52px;text-align:right;font:500 12px 'Archivo',sans-serif;color:#6a6666")}>{d.hours} h</div>
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
                  <p style={css("font:400 17px/1.6 'Archivo',sans-serif;color:#444141;margin:0 0 18px;max-width:68ch")}>Monkey Radio India is a community radio station and streaming platform broadcasting from Hyderabad. Since 25 October 2011 it has been public, non-profit and free of commercials, with a civilian approach to broadcasting, and is run by the Monkey Foundation. It takes inspiration from <a href="https://tilos.hu" target="_blank" rel="noopener" style={css("text-decoration:underline")}>Tilos Rádió</a> in Hungary.</p>
                  <p style={css("font:400 17px/1.6 'Archivo',sans-serif;color:#444141;margin:0 0 18px;max-width:68ch")}>Founded by Dakta Dub, the station began as a meeting point for Hyderabad's underground and has grown into a platform that connects local crews with artists from across India and the world. The schedule runs live DJ sets, pre-recorded shows and conversations, with attention on artists and scenes working beyond the mainstream.</p>
                  <p style={css("font:400 17px/1.6 'Archivo',sans-serif;color:#444141;margin:0 0 18px;max-width:68ch")}>The programme moves between genres without rules. Dub, reggae and sound system music sit alongside jazz, electronic, hip hop, experimental and ambient, as well as literature and other art forms. The result is an archive of more than 900 shows, broadcast at international standards.</p>
                  <p style={css("font:400 17px/1.6 'Archivo',sans-serif;color:#444141;margin:0 0 26px;max-width:68ch")}>Beyond broadcasting, the Monkey Foundation runs events, workshops and projects that grow the community at home and abroad, working with a network of like-minded DJs, foundations and cultural spaces.</p>
                  <a href="https://www.mixcloud.com/monkeyradioindia/" target="_blank" rel="noopener" className="h-invert" style={css("display:inline-flex;align-items:center;gap:10px;border:2px solid #201e1d;color:#201e1d;padding:12px 18px;font:600 11px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase")}>
                    Follow on Mixcloud
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block;flex:none")}><path d="M7 17 17 7"></path><path d="M7 7h10v10"></path></svg>
                  </a>
                </div>
              </div>
              <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));border-top:1px solid #d7d3d3")}>
                <div style={css("padding:20px 20px 20px 0")}><div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-bottom:8px")}>Based</div><div style={css("font:600 15px 'Archivo',sans-serif")}>Hyderabad, India</div></div>
                <div style={css("padding:20px;border-left:1px solid #d7d3d3")}><div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-bottom:8px")}>Web</div><a href="http://www.monkeyradio.in" target="_blank" rel="noopener" style={css("font:600 15px 'Archivo',sans-serif")}>monkeyradio.in</a></div>
                <div style={css("padding:20px;border-left:1px solid #d7d3d3")}><div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-bottom:8px")}>Archive</div><a href="https://www.mixcloud.com/monkeyradioindia/" target="_blank" rel="noopener" style={css("font:600 15px 'Archivo',sans-serif")}>Mixcloud</a></div>
                <div style={css("padding:20px;border-left:1px solid #d7d3d3")}><div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-bottom:8px")}>Social</div><a href="https://www.instagram.com/monkeyradioindia" target="_blank" rel="noopener" style={css("font:600 15px 'Archivo',sans-serif")}>@monkeyradioindia</a></div>
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

        </main>

        <footer style={css("border-top:2px solid #201e1d;margin-top:88px")}>
          <div style={css("max-width:1560px;margin:0 auto;padding:0 clamp(16px,3.2vw,32px)")}>
            <div style={css("display:flex;gap:" + (v.isSm ? "36px" : "56px") + ";flex-direction:" + (v.isSm ? "column" : "row") + ";padding:56px 0 40px")}>

              <div style={css("flex:none;order:" + (v.isSm ? "0" : "2") + ";display:flex;flex-direction:column;align-items:" + (v.isSm ? "flex-start" : "center"))}>
                <div role="img" aria-label="The Monkey Sound System, a hand-built dub speaker stack" style={css("aspect-ratio:460/421;pointer-events:none;user-select:none;background:center/contain no-repeat " + SOUND_SYSTEM_BG + ";width:" + (v.isSm ? "min(280px,66%)" : "236px"))}></div>
                <div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-top:12px")}>Monkey Sound System</div>
              </div>

              <div style={css("flex:1;min-width:0")}>
                <div style={css("display:flex;align-items:center;gap:10px;margin-bottom:16px")}>
                  <img src="assets/logo.png" alt="" style={css("width:30px;height:28px;object-fit:contain;display:block")} />
                  <span style={css("font-weight:800;font-size:13px;letter-spacing:.02em;text-transform:uppercase")}>Monkey Radio India</span>
                </div>
                <p style={css("font:400 14px/1.6 'Archivo',sans-serif;color:#444141;margin:0 0 26px;max-width:52ch")}>Community radio and sound system culture, broadcasting from Hyderabad. Public, non-profit and free of commercials since 25 October 2011, run by the Monkey Foundation.</p>

                <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:24px 32px")}>
                  <div>
                    <div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-bottom:11px")}>Follow</div>
                    <a href="https://www.instagram.com/monkeyradioindia" target="_blank" rel="noopener" style={css("display:block;font:600 14px 'Archivo',sans-serif;margin-bottom:8px")}>Instagram</a>
                    <a href="https://www.facebook.com/monkeyradioindia" target="_blank" rel="noopener" style={css("display:block;font:600 14px 'Archivo',sans-serif;margin-bottom:8px")}>Facebook</a>
                    <a href="https://www.mixcloud.com/monkeyradioindia/" target="_blank" rel="noopener" style={css("display:block;font:600 14px 'Archivo',sans-serif")}>Follow on Mixcloud</a>
                  </div>
                  <div>
                    <div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-bottom:11px")}>Contact</div>
                    <a href="mailto:monkeyradio.in@gmail.com" style={css("display:block;font:600 14px 'Archivo',sans-serif;margin-bottom:8px;word-break:break-all")}>monkeyradio.in@gmail.com</a>
                    <button onClick={v.goSubmit} style={css("display:block;background:none;border:0;padding:0;margin-bottom:8px;cursor:pointer;text-align:left;font:600 14px 'Archivo',sans-serif;color:#201e1d")}>Submit a show</button>
                    <a href="http://www.monkeyradio.in" target="_blank" rel="noopener" style={css("display:block;font:600 14px 'Archivo',sans-serif")}>monkeyradio.in</a>
                  </div>
                  <div>
                    <div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6a6666;margin-bottom:11px")}>Explore</div>
                    <button onClick={v.nav} data-view="browse" style={css("display:block;background:none;border:0;padding:0;margin-bottom:8px;cursor:pointer;text-align:left;font:600 14px 'Archivo',sans-serif;color:#201e1d")}>Archive</button>
                    <button onClick={v.nav} data-view="djs" style={css("display:block;background:none;border:0;padding:0;margin-bottom:8px;cursor:pointer;text-align:left;font:600 14px 'Archivo',sans-serif;color:#201e1d")}>Selectors</button>
                    <button onClick={v.nav} data-view="about" style={css("display:block;background:none;border:0;padding:0;cursor:pointer;text-align:left;font:600 14px 'Archivo',sans-serif;color:#201e1d")}>About the station</button>
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

        {v.detailOpen && (
          <div role="dialog" aria-modal="true" aria-labelledby="mri-detail-title" ref={v.detailDialogRef} onKeyDown={v.detailTrapKey} style={css("position:fixed;left:0;right:0;top:" + v.detailOffset + "px;bottom:0;z-index:60;background:#f3f2f2;overflow-y:auto;-webkit-overflow-scrolling:touch")}>
            <div style={css("min-height:100%;max-width:940px;margin:0 auto;background:#f3f2f2;padding-bottom:" + v.detailBottom)}>
              <div className="mri-modalhead" style={css("position:relative;display:flex;gap:32px;padding:32px;flex-wrap:wrap;border-bottom:1px solid #d7d3d3")}>
                <ArtBg url={v.detail.pic} role="img" aria-label="Album art" base="width:min(238px,100%);aspect-ratio:1;background-size:cover;background-position:center;background-color:#eae9e9;border:1px solid #d7d3d3;flex:none" />
                <div style={css("flex:1;min-width:260px")}>
                  <div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#ae1800;margin-bottom:12px")}>{v.detail.when} / Monkey Radio India</div>
                  <h2 id="mri-detail-title" style={css("font-weight:800;font-size:27px;line-height:1.06;letter-spacing:-.03em;margin:0 0 12px;text-wrap:pretty;padding-right:40px")}>{v.detail.name}</h2>
                  <div style={css("font:500 14px 'Archivo',sans-serif;color:#444141;margin-bottom:20px")}>Selected by <strong style={css("font-weight:700;color:#201e1d")}>{v.detail.dj}</strong></div>
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
                        <a href={v.shareLinks.facebook} target="_blank" rel="noopener" className="h-invert" aria-label="Share on Facebook" style={shareNetStyle}>{iconFacebook}</a>
                        <button onClick={v.shareInstagram} className="h-invert" aria-label="Copy caption for Instagram" style={shareNetStyle}>{iconInstagram}</button>
                        <a href={v.shareLinks.twitter} target="_blank" rel="noopener" className="h-invert" aria-label="Share on X (Twitter)" style={shareNetStyle}>{iconTwitter}</a>
                        <a href={v.shareLinks.whatsapp} target="_blank" rel="noopener" className="h-invert" aria-label="Share on WhatsApp" style={shareNetStyle}>{iconWhatsApp}</a>
                      </div>
                    </div>
                  )}
                </div>
                <button ref={v.detailCloseBtnRef} onClick={v.closeDetail} aria-label="Close" className="h-close" style={css("position:fixed;top:" + (v.detailOffset + 16) + "px;right:16px;z-index:61;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:1px solid #201e1d;background:#f3f2f2;color:#201e1d;cursor:pointer;border-radius:0")}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block")}><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                </button>
              </div>
              <div style={css("padding:24px 32px 30px")}>
                <div style={css("font:600 10px 'Archivo',sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#6a6666;margin-bottom:16px")}>More in this vein</div>
                <div className="mri-row" style={css("display:flex;gap:16px;overflow-x:auto;padding-bottom:4px")}>
                  {v.related.map((m) => (
                    <div key={m.key} role="button" tabIndex={0} aria-label={m.name + ', selected by ' + m.dj} onClick={v.openMix} onKeyDown={v.openMixKey} data-key={m.key} className="h-fade" style={css("flex:none;width:124px;cursor:pointer")}>
                      <ArtImg src={m.pic} alt="" loading="lazy" style={css("width:124px;height:124px;object-fit:cover;border:1px solid #d7d3d3;display:block")} />
                      <div style={css("font:600 11.5px/1.3 'Archivo',sans-serif;margin-top:9px;height:30px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden")}>{m.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

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
              <div className="mp-scrub">
                <iframe ref={v.playerRef} title="Mixcloud player" src={v.playerSrc} width="100%" height="60" frameBorder="0" allow="autoplay" style={css("display:block;border:0")}></iframe>
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
              <button onClick={v.togglePlay} aria-label={v.paused ? 'Resume' : 'Pause'} className="mp-mbtn is-primary">
                {v.paused
                  ? <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={css("display:block")}><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
                  : <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={css("display:block")}><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>}
              </button>
              <button onClick={v.stopPlaying} aria-label="Stop playback" className="mp-mbtn is-close">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={css("display:block")}><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
              </button>
            </div>
          </div>
        ) : (
          <div style={css("position:fixed;left:0;right:0;bottom:0;z-index:70;background:#f3f2f2;border-top:2px solid #201e1d")}>
            <div className="mri-dockrow" style={css("max-width:1560px;margin:0 auto;padding:10px clamp(16px,3.2vw,32px);display:flex;align-items:center;gap:12px;flex-wrap:wrap")}>
              <ArtBg url={v.now.pic} aria-hidden="true" onClick={v.openMix} data-key={v.now.key} base="width:48px;height:48px;background-size:cover;background-position:center;background-color:#eae9e9;border:1px solid #d7d3d3;flex:none;cursor:pointer" />
              <div className="mri-nowmeta" style={css("min-width:140px;max-width:250px")}>
                <div role="button" tabIndex={0} aria-label={"Show details: " + v.now.name} onClick={v.openMix} onKeyDown={v.openMixKey} data-key={v.now.key} style={css("font:600 13px 'Archivo',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer")}>{v.now.name}</div>
                <div style={css("font:500 10px 'Archivo',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#6a6666;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{v.now.dj}</div>
                {v.upNextName ? <div style={css("font:600 9.5px 'Archivo',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#6c6c6c;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>Next &middot; {v.upNextName}</div> : null}
              </div>
              <div style={css("flex:1;min-width:240px")}>
                <iframe ref={v.playerRef} title="Mixcloud player" src={v.playerSrc} width="100%" height="60" frameBorder="0" allow="autoplay" style={css("display:block;border:0")}></iframe>
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

      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(<Component />);
