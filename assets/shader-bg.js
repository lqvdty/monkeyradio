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
 * Settings below mirror the <ShaderGradient> props supplied by the design:
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

  // <ShaderGradient> config, verbatim from the design brief.
  var GRADIENT_PROPS = {
    animate: 'on',
    axesHelper: 'off',
    brightness: 1.2,
    cAzimuthAngle: 180,
    cDistance: 3.6,
    cPolarAngle: 90,
    cameraZoom: 1,
    color1: '#ff5005',
    color2: '#dbba95',
    color3: '#d0bce1',
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

  var root = null;      // active React root
  var targetEl = null;  // the <div> we were last asked to mount into

  function render(lib) {
    var h = lib.React.createElement;
    root = lib.createRoot(targetEl);
    root.render(
      h(
        lib.ShaderGradientCanvas,
        {
          style: { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' },
          pixelDensity: GRADIENT_PROPS.pixelDensity,
          fov: GRADIENT_PROPS.fov,
          // Ambient mode's mount node is full-screen and unquestionably in
          // view; render the WebGL canvas immediately rather than waiting on
          // the default IntersectionObserver gate.
          lazyLoad: false
        },
        h(lib.ShaderGradient, GRADIENT_PROPS)
      )
    );
  }

  window.MRIShaderBG = {
    // Mount the gradient into `el`. Safe to call repeatedly with the same
    // node (no-op while one is already live).
    mount: function (el) {
      if (!el || (el === targetEl && root)) return;
      targetEl = el;
      loadLib().then(function (lib) {
        // Bail if we were unmounted (or re-pointed) while the CDN loaded.
        if (targetEl !== el || root) return;
        try {
          render(lib);
        } catch (e) {
          if (window.console) console.warn('[MRIShaderBG] render failed', e);
        }
      }).catch(function (e) {
        if (window.console) console.warn('[MRIShaderBG] load failed', e);
      });
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
  if (window.__mriShaderEl) window.MRIShaderBG.mount(window.__mriShaderEl);
})();
