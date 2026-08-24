# Lerner Works — freelance website

Site for **James Lerner · Lerner Works** — web design & marketing for small
businesses in Boulder County. Hand-written static HTML: no build step, no
framework, no third-party requests at all.

```
index.html                            home
robots.txt                            allows everything, points at the sitemap
sitemap.xml                           all three pages
assets/site.css                       @font-face, tokens, nav, buttons,
                                      footer, case-study template
assets/fonts/                         self-hosted woff2
work/index.html                       /work/ — case study index
work/aragocor-minerals/index.html     /work/aragocor-minerals/
work/hm-mechanical/index.html         /work/hm-mechanical/ — unsolicited concept case study
concepts/hm-mechanical/               two-page noindex H&M concept
case-studies/aragocor/                screenshots for that case study
case-studies/hm-mechanical/           before-and-after evidence for H&M
tools/set-image-dims.py               writes real image sizes into the HTML
```

The H&M concept is intentionally excluded from the sitemap and carries a
`noindex,nofollow,noarchive` robots directive on both pages. Its public case
study is indexable. The final after PageSpeed measurement should be recorded
only after the owner has seen the concept and a reachable noindex preview has
been approved.

`assets/site.css` is the single source of truth for colour, type and the
shared furniture. Page-specific CSS lives in a `<style>` block in the page
that needs it, loaded *after* the stylesheet so it wins on the cascade.

## Open Graph images

The link preview for the home page is `assets/og/home.png` — a typographic
card built from the site's own colour, type and headline. No stock imagery.

It is generated, not hand-drawn. The source is `assets/og/home.html`; render
it with:

```sh
python3 -m http.server 8765 &     # from the repo root
node assets/og/render.js
```

Playwright is the only thing this needs (`npx playwright install chromium`)
and it is dev-only — the site itself still has no build step and no packages.

**If you change the home page `h1`, re-render the card.** It quotes that
headline verbatim, and a preview that contradicts the page is worse than a
plain one. `assets/og/home.html` carries `noindex`, so the source never shows
up in search results.

The case studies use their own lead image as the OG image instead, which is
the right call — a real screenshot of the work beats a generated card. `/work/`
currently borrows the AragoCor hero; give it its own card via `render.js`
if you'd rather it stood on its own.

## "Who you're hiring"

The bio section runs on copy alone — there is no portrait. It previously
carried a 4:5 headshot in a 300px left column; the image, the two-column
`.bio` grid and the `.bio__photo` rule all came out together, so the section
is now a single column of text like `#process`.

If a photo ever goes back in, rebuild the grid rather than dropping an `<img>`
into the flow, and mind this: an `<img>`'s `height` attribute wins over
`aspect-ratio` as a presentational hint, so `height:auto` is what makes the
ratio apply at all. Re-run `python3 tools/set-image-dims.py --write`
afterwards so the `width`/`height` attributes match the file.

## Fonts

Public Sans and Source Serif 4 are **self-hosted** in `assets/fonts/`. A page
therefore makes zero requests to any other origin — no DNS, no TLS handshake,
and no CSS-then-font request chain, which is the slow part of using Google
Fonts. Each page preloads the two latin files it will certainly need.

Both are variable fonts, so one file covers the whole weight range — hence one
`@font-face` per subset rather than one per weight. Only **latin** and
**latin-ext** are shipped; cyrillic, greek and vietnamese are not. The
`unicode-range` descriptors mean a browser downloads latin-ext only if a page
actually contains one of those characters, so English copy costs ~77 KB.

Two deliberate limits, both unchanged from what Google Fonts was serving:

- **No `opsz` axis.** Google can serve Source Serif 4 with its optical-size
  axis, but that file is 119 KB against 50 KB for the weight-only build. The
  headings are visually identical at the sizes used here, so it isn't worth
  70 KB on the critical path. To reverse it, re-download with
  `family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700`.
- **Subscripts and arrows fall back.** `₃` in "CaCO₃" (U+2083), and `→` / `←`
  (U+2192 / U+2190) sit outside the latin subset's `unicode-range`, so they
  render in the system font. Google's own subsets exclude them too, so this
  is not a regression — just don't be surprised by a slightly different arrow.

To update a font, re-download the woff2 from Google Fonts, drop it in
`assets/fonts/` under the same filename, and check the `unicode-range` in
`assets/site.css` still matches what Google's CSS declares for that subset.

## Preview locally

Paths between pages are relative, so a plain file open mostly works — but use
a server to get the directory URLs (`/work/`) right:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Adding the next case study

The template is `work/aragocor-minerals/index.html`. Copy the directory,
rename it to the new slug, then:

1. Replace the copy. The section order is the template: title and one-line
   summary → services and year → lead image → The situation → Constraints →
   What I built → Decisions and tradeoffs → Where it stands → CTA.
2. Update `<title>`, `<meta name="description">`, `<link rel="canonical">`
   and the `og:` / `twitter:` tags. The OG image is the lead image, as an
   absolute URL.
3. Put images in `case-studies/<slug>/`, then run
   `python3 tools/set-image-dims.py --write` — it reads each file and writes
   the real pixel dimensions into the `<img>` tags (and the `og:image` ones).
   Add `loading="lazy"` to everything below the lead image by hand.
4. Add a card to `work/index.html` — swap one of the `wcard--soon`
   placeholders for an `<a class="wcard" href="./<slug>/">`.
5. Add a `<url>` entry to `sitemap.xml`. Its `<loc>` must match the page's
   own `<link rel="canonical">` character for character.

No page-specific CSS should be needed; the `.cs-*` classes cover it.

### Image dimensions

`python3 tools/set-image-dims.py` reads every local image and reports where
the HTML disagrees with the file; `--write` applies the fix. It covers the
`<img>` tags and the `og:image:width` / `og:image:height` meta on all three
pages, ignores markup inside HTML comments, and is safe to re-run.

Run it whenever you add or re-export an image. Those attributes are what
reserve space before the file downloads — wrong numbers mean the page jumps
as it loads, which is the exact thing they exist to prevent.

Standard library Python, no packages.

### Things worth not breaking

- **The measure.** `--measure` in `assets/site.css` holds body copy to
  ~65–75 characters a line. It is set in `ch`, which is the width of "0" —
  much narrower than the average glyph in Public Sans — so the value (54ch)
  was calibrated against rendered text, not derived. Re-measure if the body
  font ever changes.
- **No client-side JS on case studies.** The home page has the calculator;
  the case studies ship zero scripts, which is most of why they load fast.
- **Heading levels.** One `h1` per page, `h2` for sections, no skips. The
  bold lead-ins inside "What I built" are `<strong>` inside the paragraph on
  purpose — they read as headings but are not, so the outline stays clean.

## Publish with GitHub Pages (free)

1. Merge this branch into `main`.
2. On GitHub: **Settings → Pages → Source: Deploy from a branch**, pick
   `main` and `/ (root)`, then save.
3. The site goes live at `https://jlerner1965.github.io/Lerner-Works/`.
   A custom domain (e.g. `lernerworks.com`) can be added on the same
   settings page later.

Note: the `canonical` and `og:` URLs, and every `<loc>` in `sitemap.xml`, are
written as `https://lernerworks.com/…`. They are absolute by necessity (Open
Graph and the sitemap spec both require it) and are wrong until the custom
domain is attached. Everything else uses relative paths, so the site works
correctly on either host.

`robots.txt` and `sitemap.xml` also only take effect at a domain root —
crawlers look for `example.com/robots.txt`, never
`example.com/project/robots.txt`. On the `github.io/Lerner-Works/` subpath
they are inert but harmless; attaching the custom domain is what switches
them on. **Do both before submitting anything to Google Search Console.**

## Before launch — find and replace

Across `index.html`, `work/index.html`, `work/hm-mechanical/index.html` and
`work/aragocor-minerals/index.html`:

- [x] `YOUR-PHONE` — now **(949) 205-9056**, written as `tel:+19492059056` in
      the nav of every page and in the home-page footer
- [x] `YOUR-BOOKING-LINK` — now `https://calendly.com/james-lernerworks/30min`
      on all ten "Book a call" buttons. It is a plain link, not an embedded
      widget, so the page still makes zero third-party requests.

In `index.html` only:

- [x] The **PHOTO** placeholder in "Who you're hiring" — gone; the section
      makes its argument in copy, with no image (see "Who you're hiring" above)
- [x] `james@lernerworks.com` — the contact address, linked from the footer.
      Confirm the mailbox actually receives before launch.
- [ ] The remaining `PROJECT NAME` card under "Recent work" — the clinic
      concept. It has a twin slot in `work/index.html` (`wcard--soon`,
      "In progress"); build both or drop both, but keep them in sync.
