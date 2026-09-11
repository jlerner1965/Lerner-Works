# Lerner Works — freelance website

Site for **James Lerner · Lerner Works** — web design & marketing for small
businesses in Boulder County. Hand-written static HTML: no build step, no
framework, no JavaScript in the visitor's browser, and no third-party
requests at all.

```
index.html                            home
work/index.html                       /work/ — case study index
work/townofniwot/index.html           client project — community guide
work/aragocor-minerals/index.html     client project
work/hm-mechanical/index.html         independent concept (labelled as such)
work/lernerworks/index.html           this site, as a case study
services/index.html                   services, process, guarantee, pricing, FAQ
about/index.html                      who you're hiring, how I work, what I won't do
contact/index.html                    three ways to reach James
assets/site.css                       @font-face, tokens, nav, every component,
                                      the case-study template
assets/fonts/                         self-hosted woff2
assets/og/                            link-preview cards: card.html template,
                                      render.js, and the rendered PNGs
case-studies/<slug>/                  screenshots used by that case study
concepts/hm-mechanical/               two-page noindex H&M concept
tools/set-image-dims.py               writes real image sizes into the HTML
tools/measure.js                      requests / bytes / scripts per page
tools/optimize-images.js              screenshot → JPEG, card thumbnails
robots.txt · sitemap.xml
```

The H&M concept is intentionally excluded from the sitemap and carries a
`noindex,nofollow,noarchive` robots directive on both pages. Its public case
study is indexable, is labelled "Independent concept" in the card, the badge,
the facts panel and a disclosure note, and must stay that way.

## Principles the site is built on

These are the things a change should not break, because the site's argument
depends on them.

- **No third-party requests.** No analytics, no font CDN, no embedded
  booking widget. Calendly is a plain link. `tools/measure.js` reports the
  "external" count per page; it must stay 0.
- **No JavaScript for visitors.** The mobile menu is a `<details>` element.
  The only `<script>` on the site is the JSON-LD structured data on the
  home page, which is data, not code. `measure.js` counts scripts; 0.
- **No invented proof.** No testimonials, client counts or logo walls.
  Concept work is labelled everywhere it appears. Outcomes in the
  "At a glance" strips are limited to things that can be counted.
- **Screenshots of client sites** are taken from a local build of the
  client's repository, at 1600×1000 and 390×844 at 2×, and kept under
  `case-studies/<slug>/`. The Niwot shots came from
  `jlerner1965/townofniwot.com` at its launch-readiness commit; re-take them
  if that site's design changes.
- **Numbers on `/work/lernerworks/` are measured.** If you change anything
  that affects page weight, re-run `tools/measure.js` and update the table.

## Shared furniture

`assets/site.css` is the single source of truth for colour, type and every
component. Pages carry no CSS of their own.

The nav and footer are identical across all eight pages except for the
relative prefix (`./`, `../`, `../../`) and the `aria-current` link. When
you change one, change all of them — a grep for `class="nav"` finds every
copy.

## Open Graph images

Link previews for the five section pages are typographic cards built from
the site's own colour and type, rendered from one template:

```sh
python3 -m http.server 8765 &     # from the repo root
NODE_PATH=/opt/node22/lib/node_modules node assets/og/render.js
```

`assets/og/card.html` takes the eyebrow and title as query parameters;
`render.js` lists the five cards. **If a page's h1 changes, change its
entry in `render.js` and re-render** — a preview that contradicts the page
is worse than a plain one. `card.html` carries `noindex`.

The case studies use their own lead image as the OG image — a real
screenshot of the work beats a generated card.

Playwright is the only thing any of the dev tooling needs (`npx playwright
install chromium`), and it is dev-only — the site itself still has no build
step and no packages.

## Measuring

```sh
python3 -m http.server 8765 &
node tools/measure.js             # table: requests, external, scripts, KB
node tools/measure.js --shots     # also re-takes the lernerworks screenshots
```

It loads every public page in headless Chromium at 1600 px with a cold
cache and prints what a visitor's browser would fetch. The table on
`/work/lernerworks/` is copied from this output; keep them in step.

## Images

Screenshots only, no stock photography. Two scripts keep them honest:

- `tools/optimize-images.js` re-encodes with the bundled Chromium, so
  nothing needs installing. The H&M PNG captures were converted to JPEG
  once (the 1.7 MB desktop "before" became 270 KB) and the PNGs deleted.
  It also regenerates the 800 px `-thumb.jpg` files the cards use.
- `tools/set-image-dims.py --write` reads every image and writes the real
  pixel dimensions into the `<img>` tags and the `og:image` meta. Those
  attributes are what reserve space before the file downloads. Run it after
  adding or re-exporting any image.

## Fonts

Public Sans and Source Serif 4 are **self-hosted** in `assets/fonts/`. A page
therefore makes zero requests to any other origin — no DNS, no TLS handshake,
and no CSS-then-font request chain. Each page preloads the two latin files
it will certainly need.

Both are variable fonts, so one file covers the whole weight range — hence
one `@font-face` per subset rather than one per weight. Only **latin** and
**latin-ext** are shipped. The `unicode-range` descriptors mean a browser
downloads latin-ext only if a page actually contains one of those
characters, so English copy costs ~76 KB.

Two deliberate limits, both unchanged from what Google Fonts was serving:
no `opsz` axis on Source Serif 4, and no italic files. Neither is a
regression. To update a font, re-download the woff2 from Google Fonts, drop
it in `assets/fonts/` under the same filename, and check the
`unicode-range` in `assets/site.css` still matches Google's CSS.

## Preview locally

Paths between pages are relative, so a plain file open mostly works — but
use a server to get the directory URLs (`/work/`) right:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Adding the next case study

Copy `work/aragocor-minerals/index.html` to `work/<slug>/index.html`, then:

1. Replace the copy. The section order is the template: badge, title and
   one-line summary → facts panel → lead image → "At a glance" outcomes →
   The situation → Constraints → What I built → Decisions and tradeoffs →
   Result → Where it stands → next case study → CTA.
2. Pick the badge honestly: `badge badge--client` for commissioned work the
   client has approved for publication, plain `badge` with "Independent
   concept" otherwise. Add the disclosure `.note` for concepts.
3. Update `<title>`, `<meta name="description">`, `<link rel="canonical">`
   and the `og:` / `twitter:` tags. The OG image is the lead image, as an
   absolute URL.
4. Put images in `case-studies/<slug>/`. Add the lead image to
   `tools/optimize-images.js` to get a `-thumb.jpg` for the cards, run it,
   then `python3 tools/set-image-dims.py --write`. Add `loading="lazy"` to
   everything below the lead image by hand.
5. Add a card to `work/index.html` (a 2×2 grid, `work-grid--2`) and, if it
   belongs among the three on the home page, to the "Selected work" grid on
   `index.html`.
6. Add a `<url>` entry to `sitemap.xml`. Its `<loc>` must match the page's
   own `<link rel="canonical">` character for character.
7. Re-run `tools/measure.js` and update the table on `/work/lernerworks/`
   if the home page weight changed.

No page-specific CSS should be needed; the `.cs-*` classes cover it.

### Things worth not breaking

- **The measure.** `--measure` in `assets/site.css` holds body copy to
  ~65–75 characters a line. It is set in `ch`, which is the width of "0" —
  much narrower than the average glyph in Public Sans — so the value (54ch)
  was calibrated against rendered text, not derived.
- **Heading levels.** One `h1` per page, `h2` for sections, no skips. The
  bold lead-ins inside "What I built" are `<strong>` inside the paragraph on
  purpose — they read as headings but are not, so the outline stays clean.
- **The hero h1 and the OG card say the same thing.** See Open Graph above.

## Publish with GitHub Pages (free)

1. Merge into `main`.
2. On GitHub: **Settings → Pages → Source: Deploy from a branch**, pick
   `main` and `/ (root)`, then save.
3. The site goes live at `https://jlerner1965.github.io/Lerner-Works/`, or
   at the custom domain once it is attached on the same settings page.

The `canonical` and `og:` URLs, and every `<loc>` in `sitemap.xml`, are
written as `https://lernerworks.com/…`. They are absolute by necessity and
are wrong until the custom domain is attached. Everything else is relative,
so the site works on either host. `robots.txt` and `sitemap.xml` only take
effect at a domain root. **Attach the domain before submitting anything to
Google Search Console.**

## Before launch

- [x] Phone, email and booking link are real on every page.
- [x] No placeholder cards remain anywhere on the site.
- [ ] Confirm `james@lernerworks.com` actually receives mail.
- [ ] Send the H&M owner the diagnosis and a private link, per the case
      study's "Where it stands".
- [ ] After the domain is attached, run PageSpeed on the live URL and, if you
      quote it anywhere, quote it with the date.
