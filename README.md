# Simple Consent Banner

A minimal yes/no cookie consent system for Webflow sites. One small script (no dependencies),
banner UI built and styled natively in Webflow.

**What it does**

- Blocks all marked analytics/marketing scripts until the visitor clicks accept (prior consent, GDPR/ePrivacy)
- Blocks marked iframes (YouTube, Maps, …) the same way
- Sends Google Consent Mode v2 signals (default denied → granted on accept)
- Remembers accept for 12 months, decline for 6 months (no nagging)
- Lets the visitor change their mind via a footer link; on withdraw it deletes common
  tracking cookies (`_ga*`, `_gid`, `_gcl*`, `_fbp`, `_fbc`) and reloads

**What it deliberately isn't:** a full consent platform. No granular categories, no consent
logging, no geo-targeting. Clients who run heavy ad operations and want maximum data recovery
should use a platform they control themselves (Cookiebot, CookieYes, …).

---

## One-time setup (you)

1. The files live in the public GitHub repo `miikka-werkamo/evastebanneri`.
2. Publish a release with tag `v1.0.0` (GitHub → Releases → Create a new release).
3. The script is then served free by jsDelivr:
   `https://cdn.jsdelivr.net/gh/miikka-werkamo/evastebanneri@1/banner.js`
   (`@1` = latest 1.x release — bugfix releases reach all client sites automatically,
   allow up to ~24 h for jsDelivr's cache. Pin `@1.0.0` instead if you want zero surprises.)

## Per-client setup (~15 min)

### 1. Add the banner component

Build the banner once in Webflow, save as a component, paste into each project.
Structure (style freely — the script only reads the attributes):

| Element                     | Custom attribute            |
|-----------------------------|-----------------------------|
| Banner wrapper div          | `data-consent` = `banner`   |
| Accept button               | `data-consent` = `accept`   |
| Decline button              | `data-consent` = `decline`  |
| Footer link "Evästeasetukset" (optional but recommended) | `data-consent` = `open` |

- Set the wrapper to **Display: None** in Webflow — the script shows it only when needed.
- If the wrapper's layout is flex, also add `data-consent-display` = `flex` on it.
- Decline must be as visible as accept (Traficom requirement) — no hiding it behind a link.
- Include a link to the site's cookie/privacy page in the banner text.

### 2. Add the script

Site Settings → Custom Code → **Head Code**:

```html
<script src="https://cdn.jsdelivr.net/gh/miikka-werkamo/evastebanneri@1/banner.js" defer></script>
```

### 3. Add the client's tracking snippets — blocked

Paste each snippet where it would normally go (usually Footer Code), but change
`<script>` to `<script type="text/plain" data-consent-script>`. Example with GA4:

```html
<script type="text/plain" data-consent-script
        src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>
<script type="text/plain" data-consent-script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXX');
</script>
```

Same treatment for Meta Pixel, LinkedIn, Hotjar, etc. — every snippet gets
`type="text/plain" data-consent-script`.

> ⚠️ Do **not** use Webflow's built-in integrations (Site Settings → Apps & Integrations →
> Google Analytics ID, etc.) — those load unconditionally and bypass consent. All tracking
> goes through custom code in the blocked form.

### 4. Cookie-setting iframes

**YouTube — the simple rule:** always embed via `youtube-nocookie.com` instead of
`youtube.com`. Regular embeds set tracking cookies on page load (before consent!);
nocookie embeds set no cookies until the visitor clicks play. With nocookie you normally
don't need to block the iframe at all — the video works even for decliners.

In Webflow specifically:

- ✅ **YouTube element** with **Privacy mode ON** → serves from youtube-nocookie.com. Use this.
- ✅ Custom **Embed element** with a `youtube-nocookie.com/embed/...` iframe.
- ❌ **Video element / video in Rich Text** → wraps the regular cookie-setting youtube.com
  player via a third party (Embedly), no privacy option, and the generated iframe can't be
  consent-blocked. Don't use these for YouTube.

For iframes that do set cookies on load and can't be switched (regular YouTube embeds you
can't change, Google Maps, some widgets), rename the `src` to `data-consent-src`:

```html
<iframe data-consent-src="https://www.google.com/maps/embed?pb=..." ...></iframe>
```

The iframe stays empty until consent. Check the published page's iframes to see which
domain they actually load from — YouTube's own share dialog defaults to the tracking domain.

### 5. Test on the published site

- [ ] Fresh incognito window: banner shows, DevTools → Application → Cookies is empty
- [ ] Accept: analytics loads (Network tab), cookies appear, banner gone
- [ ] Reload: banner stays gone, analytics still loads
- [ ] Clear site data, decline: banner gone, no cookies, stays gone on next page
- [ ] Footer link reopens the banner; declining after accepting removes `_ga*` cookies

## Re-asking everyone

If a client's tracking setup changes substantially (new vendors), consent must be
re-collected: bump `VERSION` in `banner.js` and tag a new release. Every visitor
gets the banner again.

## Legal checklist per client (not handled by the banner)

- The site needs a cookie/privacy page (evästeseloste) listing what's used, why, and for
  how long — the banner must link to it, otherwise consent isn't "informed".
- The banner must not block use of the site (no cookie walls).
- Strictly necessary cookies (e.g. Webflow ecommerce cart) don't need consent and should
  not be blocked.
