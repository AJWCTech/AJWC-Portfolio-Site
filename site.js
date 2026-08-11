/* ============================================================
   Site behaviour, in one external file.

   This exists so the Content-Security-Policy can forbid inline
   scripts entirely (script-src 'self', no 'unsafe-inline').
   Every block below is guarded, so the same file is safe to load
   on any page - it simply does nothing where the element is absent.
   Loaded with `defer`, so the DOM is already parsed.
============================================================ */
(function () {
  'use strict';

  /* --- Mobile navigation toggle --------------------------------- */
  var toggle = document.querySelector('.nav-toggle');
  var navLinks = document.querySelector('.nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', function () {
      var open = navLinks.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('open');
      });
    });
  }

  /* --- Contact form result banner ------------------------------- */
  var success = document.getElementById('msg-success');
  var error = document.getElementById('msg-error');
  if (success || error) {
    var status = new URLSearchParams(window.location.search).get('status');
    if (status === 'success' && success) {
      success.style.display = 'block';
    } else if (status === 'error' && error) {
      error.style.display = 'block';
    }
  }

  /* --- Share links -----------------------------------------------
     Built from the current address so they keep working if the site
     moves to a different domain. */
  var shareEmail = document.getElementById('share-email');
  var shareLinkedin = document.getElementById('share-linkedin');
  if (shareEmail || shareLinkedin) {
    var pageUrl = window.location.href.split('#')[0].split('?')[0];
    if (shareEmail) {
      shareEmail.href = 'mailto:?subject=' + encodeURIComponent('Archie Cook — CV') +
        '&body=' + encodeURIComponent('You can view the CV here: ' + pageUrl);
    }
    if (shareLinkedin) {
      shareLinkedin.href = 'https://www.linkedin.com/sharing/share-offsite/?url=' +
        encodeURIComponent(pageUrl);
    }
  }

  /* --- CV viewer, small screens ----------------------------------
     Google's viewer fetches the PDF from its own servers, so it needs
     an absolute URL it can reach. Build that from wherever this page
     is served. On a host Google cannot reach (localhost, a private
     network, file://) leave the direct-PDF fallback in the markup. */
  var mobileViewer = document.querySelector('.mobile-viewer');
  if (mobileViewer) {
    var loc = window.location;
    var host = loc.hostname;
    var reachable =
      /^https?:$/.test(loc.protocol) &&
      host !== 'localhost' && host !== '127.0.0.1' && host !== '[::1]' &&
      !/\.local$/.test(host) &&
      !/^10\./.test(host) &&
      !/^192\.168\./.test(host) &&
      !/^172\.(1[6-9]|2[0-9]|3[01])\./.test(host);

    if (reachable) {
      var pdf = new URL(mobileViewer.getAttribute('src'), loc.href).href;
      mobileViewer.src = 'https://docs.google.com/gview?url=' +
        encodeURIComponent(pdf) + '&embedded=true';
    }
  }

  /* --- Hero entrance animation (Motion.dev) -----------------------
     Progressive enhancement: hero content is fully visible in plain
     HTML/CSS, so nothing breaks if Motion.js fails to load or the
     user has requested reduced motion - this only adds motion on top.

     The overline reads like a case-file status stamp ("Case File 004
     — Status: Open" in mono, stamp-red), so it gets its own beat - a
     left-to-right clip-path wipe, like a line printing to a terminal
     - rather than the plain fade-up used for the rest of the hero.
     One signature moment, everything else stays quiet. */
  var heroOverline = document.querySelector('#hero .overline.hero-anim-item');
  var heroRest = document.querySelectorAll('#hero .hero-anim-item:not(.overline)');
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && window.Motion) {
    if (heroOverline) {
      window.Motion.animate(
        heroOverline,
        { clipPath: ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'] },
        { duration: 0.5, easing: 'ease-out' }
      );
    }
    if (heroRest.length) {
      window.Motion.animate(
        heroRest,
        { opacity: [0, 1], transform: ['translateY(18px)', 'translateY(0px)'] },
        { duration: 0.7, delay: function (i) { return 0.15 + i * 0.12; }, easing: [0.22, 1, 0.36, 1] }
      );
    }
  }

  /* --- Redaction reveal, touch support (Case File) -----------------
     Hover/focus already reveal via CSS alone with zero JS (see
     .redact/.redact-bar in style.css) - this only adds tap-to-toggle
     for touch devices, which have no hover state. */
  var redactions = document.querySelectorAll('.redact');
  redactions.forEach(function (el) {
    el.addEventListener('click', function () {
      el.classList.toggle('is-revealed');
    });
  });

  /* --- Exhibit section scroll reveal (GSAP ScrollTrigger) ---------
     .exhibit-reveal's CSS animation (see style.css) is the no-JS /
     reduced-motion fallback - it just fades in on load. When GSAP is
     available and motion is allowed, this replaces that with a real
     scroll-triggered reveal instead, and turns the CSS animation off
     so the two don't fight each other. */
  var exhibits = document.querySelectorAll('.exhibit-reveal');
  if (exhibits.length && !reduceMotion && window.gsap && window.ScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    exhibits.forEach(function (el) {
      el.style.animation = 'none';
      el.style.opacity = '';
      window.gsap.fromTo(el,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true }
        }
      );
    });
  }

  /* --- Module index cards stamp-in (anime.js) ----------------------
     Triggered on scroll into view via IntersectionObserver (native,
     no extra dependency) rather than on page load, consistent with
     the exhibit sections above - nothing on this page animates purely
     because the page loaded. */
  var moduleGrid = document.querySelector('.module-index');
  if (moduleGrid && !reduceMotion && window.anime && 'IntersectionObserver' in window) {
    var moduleObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          window.anime.animate(entry.target.querySelectorAll('li'), {
            opacity: [0, 1],
            scale: [0.96, 1],
            delay: window.anime.stagger(80),
            duration: 420,
            ease: 'outQuad'
          });
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    moduleObserver.observe(moduleGrid);
  }
})();
