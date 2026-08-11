# AJWC Portfolio Site

Source for Archie Cook's portfolio — a static site presenting a BSc (Hons)
Cyber Security degree's coursework, projects and CV.

No build step, no framework, no bundler. Plain HTML, CSS and JavaScript,
uploaded as-is to an Apache host.

## Design

The visual identity is "Case File" — a dossier/investigation theme rather than
a generic dark-mode portfolio:

| | |
|---|---|
| Paper | `#E4DFCE` manila, `#D9D2BC` panels |
| Ink | `#1C1A15` text, `#55503F` secondary |
| Accent | `#A32626` stamp red |
| Display | Archivo |
| Body | IBM Plex Sans |
| Labels | Courier Prime |

Navigation reads as folder tabs, sections as "Exhibits", module listings as
date-stamped index cards. The signature interaction is a redaction bar that
wipes away on hover, focus or tap.

## Structure

```
index.html              Home
Projects.html           Project index, plus the per-discipline pages
university-projects.html
cv.html  view.html      CV, and the in-browser viewer
Contact.html            Contact form front-end
contact.php             Form handler (honeypot, per-IP rate limit,
                        same-origin check, hardened session cookie)
style.css               All styling; design tokens live in :root
site.js                 All behaviour, in one external file
hero-3d.js              The one Three.js scene (homepage hero only)
.htaccess               Security headers, CSP, caching, hidden-dir blocking
Assets/
  fonts/                Self-hosted woff2 (no Google Fonts request at runtime)
  vendor/               Self-hosted animation libraries
  Uni Work Pages/       Per-module pages
```

## Animation

Four libraries, each doing one job it is actually suited to, rather than one
library stretched across everything:

| Library | Used for |
|---|---|
| Motion.dev | Hero entrance |
| GSAP + ScrollTrigger | Section reveals on scroll |
| anime.js | Module-list stagger |
| Three.js | A single procedural 3D case-file opening in the hero |

All of it is progressive enhancement. Every block is guarded, so the page is
fully readable and usable if any script fails to load, and every animation is
gated behind `prefers-reduced-motion: reduce`.

## Why the libraries are vendored

The site's Content-Security-Policy is `script-src 'self'` with no
`'unsafe-inline'` and no CDN origins, so an injected `<script>` tag cannot
execute. That means every dependency has to be served from this origin.
Fonts are self-hosted for the same reason plus a privacy one: loading them
from Google would disclose every visitor's IP to Google before they had
interacted with the page.

Pinned versions — these do not auto-update, so they need reviewing
periodically:

- GSAP 3.15.0, ScrollTrigger 3.15.0
- anime.js 4.5.0
- Three.js r185
- Motion 13.1.0

## Not in this repository

The coursework archive (`Assets/Cyber Sec Uni Work/`) is roughly 966 MB —
two screen-recordings alone are 412 MB and 226 MB, both over GitHub's 100 MB
per-file limit. It is deployed directly to the web host, so some asset links
in the per-module pages resolve only on the live site, not from a local
clone.

## Local preview

Any static server will do, from the repository root:

```
npx serve
```

`contact.php` needs PHP, so the contact form only works on the live host.

## Licence

Coursework, writing and images are © Archie Cook — see `terms.html`, which
includes an academic integrity clause. The vendored libraries in
`Assets/vendor/` keep their own licences (MIT, except GSAP under the
GreenSock standard licence).
