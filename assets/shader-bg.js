/* Ambient-mode WebGL backdrop — a ShaderGradient plane.
 *
 * Ambient mode (the fullscreen, chrome-free now-playing view; see
 * src/app.jsx) is the ONLY place this runs. It is deliberately kept out of
 * the main app bundle and off the critical path: the heavy dependency tree
 * (three.js + @react-three/fiber + @shadergradient/react, ~700KB) is
 * dynamically imported from a CDN the first time the viewer actually opens
 * ambient mode, and never before.
 *
 * It renders into its own React root (React 18, pulled from esm.sh) mounted
 * on a bare <div> the app hands us — completely isolated from the app's own
 * UMD React instance. If the import or the WebGL context fails for any
 * reason, we log and bail; ambient mode still has its solid #201e1d base.
 *
 * Palettes, chosen by the app from the on-air show's genre:
 *   - default       warm orange / sand / lilac
 *   - reggae        Dub & Reggae — red / gold / green on black
 *   - psychedelic   Psychedelic + Techno — violet / coral on black, on a
 *                   slow waterPlane
 * Settings mirror the <ShaderGradient> props supplied by the design:
 * https://github.com/ruucm/shadergradient#react
 */
(function () {
  'use strict';

  // @shadergradient/react declares no three / @react-three/fiber dependency
  // of its own, so esm.sh would otherwise resolve the newest fiber (v9,
  // React 19 only) and crash under our React 18 ("reading 'S'"). Pin the
  // whole stack to a mutually compatible, React-18 set.
  var DEPS = 'react@18.3.1,react-dom@18.3.1,@react-three/fiber@8.18.0,three@0.170.0';
  var REACT = 'https://esm.sh/react@18.3.1';
  var REACT_DOM_CLIENT = 'https://esm.sh/react-dom@18.3.1/client';
  var SHADERGRADIENT = 'https://esm.sh/@shadergradient/react@2.4.20?deps=' + DEPS;

  // Shared <ShaderGradient> config, verbatim from the design brief. Only the
  // colours (and a hair of camera distance) differ per palette — see VARIANTS.
  var BASE_PROPS = {
    animate: 'on',
    axesHelper: 'off',
    brightness: 1.2,
    cAzimuthAngle: 180,
    cPolarAngle: 90,
    cameraZoom: 1,
    destination: 'onCanvas',
    embedMode: 'off',
    envPreset: 'city',
    format: 'gif',
    fov: 45,
    frameRate: 10,
    gizmoHelper: 'hide',
    grain: 'on',
    lightType: '3d',
    pixelDensity: 1,
    positionX: -1.4,
    positionY: 0,
    positionZ: 0,
    range: 'disabled',
    rangeEnd: 40,
    rangeStart: 0,
    reflection: 0.1,
    rotationX: 0,
    rotationY: 10,
    rotationZ: 50,
    shader: 'defaults',
    type: 'plane',
    uAmplitude: 1,
    uDensity: 1.3,
    uFrequency: 5.5,
    uSpeed: 0.4,
    uStrength: 4,
    uTime: 0,
    wireframe: false
  };

  var VARIANTS = {
    // Default — warm orange / sand / lilac.
    'default': {
      cDistance: 3.6,
      color1: '#ff5005',
      color2: '#dbba95',
      color3: '#d0bce1'
    },
    // Dub & Reggae — red / gold / green on black.
    'reggae': {
      cDistance: 3.59,
      color1: '#ff0008',
      color2: '#dbd476',
      color3: '#2de175',
      bgColor1: '#000000',
      bgColor2: '#000000'
    },
    // Psychedelic + Techno — violet / coral fading to black, on a slow,
    // low-amplitude waterPlane with the grain off. (axesHelper is forced
    // off here even though the design export left it on — it only draws a
    // debug gizmo.)
    'psychedelic': {
      type: 'waterPlane',
      grain: 'off',
      brightness: 1.1,
      cDistance: 3.9,
      cPolarAngle: 115,
      color1: '#5606ff',
      color2: '#fe8989',
      color3: '#000000',
      bgColor1: '#000000',
      bgColor2: '#000000',
      positionX: -0.5,
      positionY: 0.1,
      rotationY: 0,
      rotationZ: 235,
      uAmplitude: 0,
      uDensity: 1.1,
      uSpeed: 0.1,
      uStrength: 1.7,
      uTime: 0.2
    }
  };

  function propsFor(variant) {
    var v = VARIANTS[variant] || VARIANTS['default'];
    var out = {};
    for (var k in BASE_PROPS) out[k] = BASE_PROPS[k];
    for (var j in v) out[j] = v[j];
    return out;
  }

  var libPromise = null;
  function loadLib() {
    if (!libPromise) {
      libPromise = Promise.all([
        import(REACT),
        import(REACT_DOM_CLIENT),
        import(SHADERGRADIENT)
      ]).then(function (mods) {
        var React = mods[0].default || mods[0];
        var createRoot = mods[1].createRoot;
        var sg = mods[2];
        return {
          React: React,
          createRoot: createRoot,
          ShaderGradientCanvas: sg.ShaderGradientCanvas,
          ShaderGradient: sg.ShaderGradient
        };
      });
    }
    return libPromise;
  }

  var lib = null;       // resolved module bag, once loaded
  var root = null;      // active React root
  var targetEl = null;  // the <div> we were last asked to mount into
  var variant = 'default';

  function paint() {
    if (!lib || !root) return;
    var h = lib.React.createElement;
    root.render(
      h(
        lib.ShaderGradientCanvas,
        {
          style: { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' },
          pixelDensity: BASE_PROPS.pixelDensity,
          fov: BASE_PROPS.fov,
          // Ambient mode's mount node is full-screen and unquestionably in
          // view; render the WebGL canvas immediately rather than waiting on
          // the default IntersectionObserver gate.
          lazyLoad: false
        },
        h(lib.ShaderGradient, propsFor(variant))
      )
    );
  }

  window.MRIShaderBG = {
    // Mount the gradient into `el`, in palette `v` ('default' | 'reggae').
    // Safe to call repeatedly; a no-op once live on the same node.
    mount: function (el, v) {
      if (v) variant = v;
      if (!el || (el === targetEl && root)) return;
      targetEl = el;
      loadLib().then(function (resolved) {
        lib = resolved;
        // Bail if we were unmounted (or re-pointed) while the CDN loaded.
        if (targetEl !== el || root) return;
        try {
          root = lib.createRoot(el);
          paint();
        } catch (e) {
          if (window.console) console.warn('[MRIShaderBG] render failed', e);
        }
      }).catch(function (e) {
        if (window.console) console.warn('[MRIShaderBG] load failed', e);
      });
    },

    // Swap the palette on an already-mounted gradient (the on-air show
    // changed genre while ambient mode stayed open).
    setVariant: function (v) {
      if (!v || v === variant) return;
      variant = v;
      paint();
    },

    unmount: function () {
      targetEl = null;
      var r = root;
      root = null;
      if (r) {
        try { r.unmount(); } catch (e) {}
      }
    }
  };

  // This module is deferred; if ambient mode opened (and the app parked a
  // mount node) before it finished loading, pick it up now.
  if (window.__mriShaderEl) window.MRIShaderBG.mount(window.__mriShaderEl, window.__mriShaderVariant);
})();
