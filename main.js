/* ==========================================================================
   Bewerbung · Bruno Fisher — Motion
   Lenis (Smooth Scroll) + GSAP/ScrollTrigger. Nur transform & opacity.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;

  // CDN nicht erreichbar → statische Seite ohne Animationen.
  if (!window.gsap || !window.ScrollTrigger) {
    root.classList.remove('js');
    return;
  }
  window.__bf = true;

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  var reduce = root.classList.contains('reduce');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var expoOut = function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); };

  /* ----------------------------------------------------------------------
     Hilfsfunktionen
     ---------------------------------------------------------------------- */

  // Wörter in Maske + Inner-Span packen (SplitText-Ersatz, inkl. verschachtelter Elemente)
  function splitWords(el) {
    var words = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span');
            var i = document.createElement('span');
            w.className = 'w';
            i.className = 'wi';
            i.textContent = part;
            w.appendChild(i);
            frag.appendChild(w);
            words.push(i);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    })(el);
    return words;
  }

  // Buchstaben für den Namen
  function splitChars(el) {
    var chars = [];
    var text = el.textContent;
    el.textContent = '';
    text.split('').forEach(function (c) {
      var s = document.createElement('span');
      s.className = 'ch';
      s.textContent = c;
      el.appendChild(s);
      chars.push(s);
    });
    return chars;
  }

  // Deterministische Zufallszahlen für die Skyline
  function rng(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
  }

  function buildSkyline(svg, seed, minH, maxH, fill, windowLayers) {
    var r = rng(seed);
    var W = 1600, H = 320, x = -20, d = '', win = [[], []];
    while (x < W + 20) {
      var w = 34 + Math.floor(r() * 70);
      var h = minH + Math.floor(r() * (maxH - minH));
      var top = H - h;
      d += 'M' + x + ' ' + H + 'V' + top + 'H' + (x + w) + 'V' + H + 'Z';
      if (r() > .72) d += 'M' + (x + w / 2 - 1) + ' ' + top + 'V' + (top - 14 - Math.floor(r() * 26)) + 'h2V' + top + 'Z';
      if (windowLayers) {
        for (var wy = top + 14; wy < H - 10; wy += 16) {
          for (var wx = x + 8; wx < x + w - 8; wx += 12) {
            var p = r();
            if (p > .86) win[0].push('M' + wx + ' ' + wy + 'h4v6h-4z');
            else if (p > .78) win[1].push('M' + wx + ' ' + wy + 'h4v6h-4z');
          }
        }
      }
      x += w + Math.floor(r() * 8);
    }
    var ns = 'http://www.w3.org/2000/svg';
    var path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', fill);
    svg.appendChild(path);
    if (windowLayers) {
      [['#ffb347', .85], ['#ff8a3d', .4]].forEach(function (c, i) {
        var wp = document.createElementNS(ns, 'path');
        wp.setAttribute('d', win[i].join(''));
        wp.setAttribute('fill', c[0]);
        wp.setAttribute('opacity', c[1]);
        svg.appendChild(wp);
      });
    }
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacy(); });
    }
    return Promise.resolve(legacy());
    function legacy() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  /* ----------------------------------------------------------------------
     Aufbau
     ---------------------------------------------------------------------- */

  var skyFar = $('.sky-far'), skyNear = $('.sky-near');
  buildSkyline(skyFar, 7, 40, 150, '#0d0c14', false);
  buildSkyline(skyNear, 21, 30, 200, '#07070a', true);

  var nameChars = [];
  $$('.name-line').forEach(function (l) { nameChars = nameChars.concat(splitChars(l)); });

  var splitTargets = $$('.split').map(function (el) { return { el: el, words: splitWords(el) }; });

  // Lenis
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  var hash = location.hash;
  var hashTarget = hash && hash.length > 1 && hash !== '#start' ? $(hash) : null;
  var skipIntro = reduce || !!hashTarget;

  function scrollToTarget(target, immediate) {
    if (!target) return;
    if (lenis) {
      lenis.scrollTo(target, { immediate: !!immediate, force: !!immediate, duration: 1.8, easing: expoOut });
    } else {
      target.scrollIntoView();
    }
  }

  /* ----------------------------------------------------------------------
     Scroll-Animationen
     ---------------------------------------------------------------------- */

  var nav = $('.nav');
  var introDone = false;

  function setupScroll() {
    // Fortschrittsbalken
    gsap.to('.progress span', {
      scaleX: 1, ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.2 }
    });

    // Navigation: runter ausblenden, hoch einblenden
    var navHidden = false;
    function navTo(hide) {
      if (hide === navHidden || !introDone) return;
      navHidden = hide;
      gsap.to(nav, { yPercent: hide ? -110 : 0, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
    }
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        var y = self.scroll();
        if (y < 160 || self.direction === -1) navTo(false);
        else if (self.direction === 1) navTo(true);
      }
    });
    nav.addEventListener('focusin', function () { navTo(false); });

    // Aktive Section in der Navigation
    var links = $$('[data-link]');
    function setActive(id) {
      links.forEach(function (a) { a.classList.toggle('is-active', a.dataset.link === id); });
    }
    $$('[data-nav]').forEach(function (el) {
      var id = el.dataset.nav;
      ScrollTrigger.create({
        trigger: el, start: 'top 55%', end: 'bottom 55%',
        onToggle: function (self) { if (self.isActive) setActive(id); }
      });
    });

    // Hero-Parallax
    if (!reduce) {
      var heroSt = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
      gsap.to('.hero__inner', { yPercent: 26, opacity: 0, ease: 'none', scrollTrigger: heroSt });
      gsap.to('.hero__cue-wrap', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=240', scrub: true } });
      gsap.to(skyFar, { yPercent: 14, ease: 'none', scrollTrigger: heroSt });
      gsap.to(skyNear, { yPercent: 34, ease: 'none', scrollTrigger: heroSt });
    }

    // Headlines: wortweise per Maske enthüllen
    splitTargets.forEach(function (t) {
      gsap.from(t.words, {
        yPercent: reduce ? 0 : 118,
        opacity: reduce ? 0 : 1,
        duration: reduce ? 0.8 : 1.15,
        ease: 'expo.out',
        stagger: reduce ? 0 : 0.07,
        scrollTrigger: { trigger: t.el, start: 'top 86%', once: true }
      });
    });

    // Fließtext / Karten: sanft hochfaden
    var dist = reduce ? 0 : 40;
    gsap.set('.reveal', { y: dist, opacity: 0 });
    ScrollTrigger.batch('.reveal', {
      start: 'top 90%',
      once: true,
      onEnter: function (batch) {
        gsap.to(batch, { y: 0, opacity: 1, duration: reduce ? 0.6 : 1.1, ease: 'power3.out', stagger: 0.12, overwrite: true });
      }
    });

    // Zahlen hochzählen
    $$('[data-count]').forEach(function (el) {
      var end = parseFloat(el.dataset.count);
      if (reduce) return;
      var o = { v: 0 };
      el.textContent = '0';
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: function () {
          gsap.to(o, {
            v: end, duration: 1.8, ease: 'power2.out',
            onUpdate: function () { el.textContent = Math.round(o.v); }
          });
        }
      });
    });

    // Erfahrungs-Timeline
    var tlEl = $('#timeline');
    if (tlEl) {
      var stations = $$('.station');
      if (reduce) {
        stations.forEach(function (s) { s.classList.add('is-lit'); });
        gsap.set('.timeline__fill', { scaleY: 1 });
      } else {
        gsap.fromTo('.timeline__fill', { scaleY: 0 }, {
          scaleY: 1, ease: 'none',
          scrollTrigger: { trigger: tlEl, start: 'top 62%', end: 'bottom 62%', scrub: 0.4 }
        });
        stations.forEach(function (s) {
          ScrollTrigger.create({
            trigger: s, start: 'top+=70 62%', end: 'max',
            toggleClass: { targets: s, className: 'is-lit' }
          });
        });
      }
    }

    setupLevel();
    setupSignature();
  }

  /* Gepinnter Monolog */
  function setupLevel() {
    var level = $('#level');
    if (!level || reduce) return;

    var col = $('.level__col');
    var items = $$('.level__col > *');
    var dim = 0.24;
    var centers = [];

    function measure() {
      centers = items.map(function (it) { return it.offsetTop + it.offsetHeight / 2; });
      gsap.set(col, { y: -centers[0] });
    }
    measure();
    ScrollTrigger.addEventListener('refreshInit', measure);

    gsap.set(items, { opacity: 0, y: 32 });

    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: level,
        start: 'top top',
        end: function () { return '+=' + Math.round(window.innerHeight * (items.length * 0.62 + 0.9)); },
        pin: true,
        refreshPriority: 1, // Pin-Spacer zuerst anlegen, damit alle Trigger darunter korrekt rechnen
        scrub: 0.7,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });

    items.forEach(function (it, i) {
      tl.to(it, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, i);
      if (i > 0) {
        tl.to(items[i - 1], { opacity: dim, duration: 0.6, ease: 'power1.out' }, i);
        tl.to(col, {
          y: function () { return -centers[i]; },
          duration: 0.9, ease: 'power2.inOut'
        }, i - 0.15);
      }
    });

    // Glühen beim letzten Satz
    tl.fromTo('.level__glow', { opacity: 0 }, { opacity: 1, duration: 1, ease: 'power2.out' }, items.length - 1);
    // Halten am Ende
    tl.to({}, { duration: 0.9 });

    // 14 → 20: die Linie wächst, kommt aber nie ganz an
    var total = tl.duration();
    tl.fromTo('.lv-line i', { scaleX: 0 }, { scaleX: 0.8, duration: total, ease: 'none' }, 0);
    tl.fromTo('.lv-14', { opacity: 0.35, x: 0 }, { opacity: 1, x: function () { return window.innerWidth * 0.015; }, duration: total, ease: 'none' }, 0);
    tl.fromTo('.lv-20', { opacity: 0.25 }, { opacity: 1, duration: total, ease: 'none' }, 0);
  }

  /* Signatur zeichnen */
  function setupSignature() {
    var paths = $$('.sig__p');
    if (!paths.length) return;
    if (reduce) return;
    gsap.set(paths, { strokeDashoffset: 1 });
    var draw = gsap.timeline({ paused: true })
      .to(paths[0], { strokeDashoffset: 0, duration: 0.9, ease: 'power1.inOut' })
      .to(paths[1], { strokeDashoffset: 0, duration: 1.6, ease: 'power1.inOut' }, '-=0.1')
      .to(paths[2], { strokeDashoffset: 0, duration: 0.7, ease: 'power2.out' }, '-=0.2');
    ScrollTrigger.create({
      trigger: '.signoff', start: 'top 72%', once: true,
      onEnter: function () { draw.play(); }
    });
  }

  /* ----------------------------------------------------------------------
     Interaktion
     ---------------------------------------------------------------------- */

  function setupInteraction() {
    // Anker mit Smooth Scroll
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (!id || id.length < 2) return;
        var target = $(id);
        if (!target) return;
        e.preventDefault();
        scrollToTarget(target, false);
        try { history.replaceState(null, '', id); } catch (err) { /* file:// */ }
        if (id === '#main') target.focus({ preventScroll: true });
      });
    });

    // Discord kopieren
    var toast = $('.toast');
    var toastTimer;
    function showToast(msg) {
      toast.textContent = msg;
      toast.classList.add('is-on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 2000);
    }
    $$('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var value = btn.dataset.copy;
        Promise.resolve(copyText(value)).then(function (ok) {
          showToast(ok ? 'Kopiert!' : 'Discord: ' + value);
        });
      });
    });

    // Karten-Glow folgt der Maus
    if (fine) {
      $$('.fact').forEach(function (c) {
        c.addEventListener('pointermove', function (e) {
          var r = c.getBoundingClientRect();
          c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
          c.style.setProperty('--my', (e.clientY - r.top) + 'px');
        });
      });
    }

    // Custom-Cursor (nur Desktop mit Maus)
    var cursor = $('.cursor');
    if (fine && !reduce && cursor) {
      var glow = $('.cursor__glow'), dot = $('.cursor__dot');
      var gx = gsap.quickTo(glow, 'x', { duration: 0.7, ease: 'power3' });
      var gy = gsap.quickTo(glow, 'y', { duration: 0.7, ease: 'power3' });
      var dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
      var dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
      window.addEventListener('pointermove', function (e) {
        root.classList.add('has-cursor');
        gx(e.clientX); gy(e.clientY); dx(e.clientX); dy(e.clientY);
      }, { passive: true });
      document.addEventListener('pointerover', function (e) {
        cursor.classList.toggle('is-hot', !!e.target.closest('a, button, .fact, .chip'));
      });
      document.addEventListener('mouseleave', function () { root.classList.remove('has-cursor'); });
    }
  }

  /* ----------------------------------------------------------------------
     Intro
     ---------------------------------------------------------------------- */

  var loader = $('.preloader');
  var heroMeta = $$('.hero__meta > *');

  function finishIntro() {
    introDone = true;
    root.classList.remove('is-loading');
    if (loader) loader.remove();
    if (lenis) lenis.start();
    ScrollTrigger.refresh();
    if (hashTarget) scrollToTarget(hashTarget, true);
  }

  setupScroll();
  setupInteraction();

  if (skipIntro) {
    loader.remove();
    if (!reduce) gsap.from(nameChars, { yPercent: 110, duration: 1, stagger: 0.04, ease: 'expo.out', delay: 0.1 });
    else gsap.from('.hero__inner', { opacity: 0, duration: 1 });
    introDone = true;
    if (lenis) lenis.start();
    var late = function () {
      ScrollTrigger.refresh();
      if (hashTarget) scrollToTarget(hashTarget, true);
    };
    if (document.readyState === 'complete') late(); else window.addEventListener('load', late);
  } else {
    root.classList.add('is-loading');
    gsap.set(nameChars, { yPercent: 112 });
    gsap.set(heroMeta, { opacity: 0, y: 18 });
    gsap.set('.hero__cue', { opacity: 0 });
    gsap.set(nav, { yPercent: -100, opacity: 0 });

    var countEl = $('.preloader__count span');
    var bar = $('.preloader__bar span');
    var counter = { v: 0 };

    var fontsReady = document.fonts && document.fonts.ready
      ? Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1400); })])
      : Promise.resolve();

    fontsReady.then(function () {
      var tl = gsap.timeline({ onComplete: finishIntro });
      tl.to(counter, {
        v: 100, duration: 0.95, ease: 'power2.inOut',
        onUpdate: function () { countEl.textContent = ('00' + Math.round(counter.v)).slice(-3); }
      }, 0)
        .to(bar, { scaleX: 1, duration: 0.95, ease: 'power2.inOut' }, 0)
        .to('.preloader__inner', { opacity: 0, y: -16, duration: 0.3, ease: 'power2.in' }, 1.0)
        .to(loader, { yPercent: -100, duration: 0.85, ease: 'expo.inOut' }, 1.1)
        .to(nameChars, { yPercent: 0, duration: 1.1, stagger: 0.05, ease: 'expo.out' }, 1.5)
        .to(heroMeta, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out' }, 2.0)
        .to('.hero__cue', { opacity: 1, duration: 0.9, ease: 'power2.out' }, 2.3)
        .to(nav, { yPercent: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, 2.1);
      // Scrollen schon freigeben, sobald der Vorhang oben ist
      tl.call(function () { introDone = true; if (lenis) lenis.start(); root.classList.remove('is-loading'); }, null, 2.0);
    });
  }

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
