/*!
 * Simple Consent Banner v1.0.1
 * Yes/no cookie consent for Webflow sites.
 *
 * - Blocks scripts marked  <script type="text/plain" data-consent-script>
 *   and iframes marked     <iframe data-consent-src="..."> until the visitor accepts.
 * - Sends Google Consent Mode v2 signals (default denied, granted on accept).
 * - Banner UI is built and styled in Webflow; this script only finds it by attributes:
 *     data-consent="banner"   the banner wrapper (set to Display: None in Webflow)
 *     data-consent="accept"   the accept button
 *     data-consent="decline"  the decline button
 *     data-consent="open"     optional link/button that re-opens the banner
 *   Optional on the wrapper: data-consent-display="flex" (display value used when shown, default "block")
 */
(function () {
  'use strict';

  var VERSION = 1;                    // bump this to ask every visitor again
  var STORAGE_KEY = 'consent-banner';
  var ACCEPT_DAYS = 365;              // how long a "yes" is remembered
  var DECLINE_DAYS = 180;             // how long a "no" is remembered

  var activated = false;              // blocked scripts already un-blocked on this page view

  /* ---- Google Consent Mode v2 ---- */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied'
  });

  /* ---- stored choice ---- */
  function readChoice() {
    try {
      var data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!data || data.v !== VERSION || Date.now() > data.exp) return null;
      return data.choice; // 'yes' | 'no'
    } catch (e) { return null; }
  }

  function saveChoice(choice) {
    var days = choice === 'yes' ? ACCEPT_DAYS : DECLINE_DAYS;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        v: VERSION,
        choice: choice,
        exp: Date.now() + days * 864e5
      }));
    } catch (e) { /* private mode etc. — banner will just show again */ }
  }

  /* ---- banner element ---- */
  function banner() { return document.querySelector('[data-consent="banner"]'); }

  function showBanner() {
    var b = banner();
    if (b) b.style.display = b.getAttribute('data-consent-display') || 'block';
  }

  function hideBanner() {
    var b = banner();
    if (b) b.style.display = 'none';
  }

  /* ---- consent granted: signal Google + un-block scripts and iframes ---- */
  function grant() {
    gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted'
    });

    var blocked = document.querySelectorAll('script[type="text/plain"][data-consent-script]');
    for (var i = 0; i < blocked.length; i++) {
      var old = blocked[i];
      var s = document.createElement('script');
      for (var j = 0; j < old.attributes.length; j++) {
        var a = old.attributes[j];
        if (a.name !== 'type' && a.name !== 'data-consent-script') s.setAttribute(a.name, a.value);
      }
      s.text = old.text;
      old.parentNode.replaceChild(s, old);
    }

    var frames = document.querySelectorAll('iframe[data-consent-src]');
    for (var k = 0; k < frames.length; k++) {
      frames[k].src = frames[k].getAttribute('data-consent-src');
    }

    activated = true;
  }

  /* ---- best-effort cleanup of common tracking cookies on decline ---- */
  function cleanupCookies() {
    var prefixes = ['_ga', '_gid', '_gcl', '_fbp', '_fbc', '_ttp', '_tt_enable_cookie', '_pin_', '_scid', '_uetsid', '_uetvid', 'li_'];
    var names = document.cookie.split(';').map(function (c) {
      return c.split('=')[0].trim();
    });
    var host = location.hostname;
    var domains = [''];
    var parts = host.split('.');
    for (var i = 0; i < parts.length - 1; i++) {
      domains.push(parts.slice(i).join('.'));
    }
    names.forEach(function (name) {
      var tracked = prefixes.some(function (p) { return name.indexOf(p) === 0; });
      if (!tracked) return;
      domains.forEach(function (d) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' +
          (d ? '; domain=' + d : '');
      });
    });
  }

  /* ---- button actions ---- */
  function accept() {
    saveChoice('yes');
    grant();
    hideBanner();
  }

  function decline() {
    saveChoice('no');
    hideBanner();
    cleanupCookies();
    gtag('consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied'
    });
    // If tracking was already running on this page view (visitor changed their mind),
    // reload so nothing keeps tracking.
    if (activated) location.reload();
  }

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-consent]') : null;
    if (!t) return;
    var role = t.getAttribute('data-consent');
    if (role === 'accept') { e.preventDefault(); accept(); }
    else if (role === 'decline') { e.preventDefault(); decline(); }
    else if (role === 'open') { e.preventDefault(); showBanner(); }
  });

  /* ---- init ---- */
  function init() {
    var choice = readChoice();
    if (choice === 'yes') grant();
    else if (choice === null) showBanner();
    // choice === 'no': banner stays hidden, nothing loads
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // tiny debug/utility API
  window.consentBanner = {
    open: showBanner,
    choice: readChoice,
    reset: function () { localStorage.removeItem(STORAGE_KEY); showBanner(); }
  };
})();
