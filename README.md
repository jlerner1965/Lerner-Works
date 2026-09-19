# Lerner Works — freelance website

Site for **James Lerner · Lerner Works** — web design & marketing for small
businesses in Boulder County. Hand-written static HTML: no build step, no
framework, no JavaScript in the visitor's browser, and no third-party
requests at all.

```
index.html                            home
work/index.html                       /work/ — case study index
work/inside-the-towns/index.html      own project — the seven-town network
work/townofniwot/index.html           own project — community guide (now redirects)
work/aragocor-minerals/index.html     client project
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
case-studies/inside-the-towns/        hub capture + seven town thumbnails
areas/<town>/index.html               service-area pages — SCAFFOLDED, noindex,
                                      unwritten; see "Service-area pages"
tools/set-image-dims.py               writes real image sizes into the HTML
tools/measure.js                      requests / bytes / scripts per page,
                                      and --table emits the markup for them
tools/check-host.js                   proves the site names exactly one host
tools/contact.js                      single source for phone, email, booking
tools/optimize-images.js              screenshot → JPEG, card thumbnails
robots.txt · sitemap.xml
```

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
  Every project carries a label saying what kind of work it was, and unpaid
  work is never dressed as a commission. Outcomes in the "At a glance" strips
  are limited to things that can be counted.
- **Placeholder slots look like placeholders.** Anything the site does not
  have yet is marked with a `PLACEHOLDER` comment in the source and the dashed
  `.cs-slot` treatment on the page, so nothing unfinished can be mistaken for
  shipped work. One is left: traffic and usage on `/work/inside-the-towns/`.
  Grep for `PLACEHOLDER` before launch.
- **Accessibility is checked, not assumed.** Every page passes axe-core at
  WCAG 2.2 AA at 1280, 860 and 390 px. One colour token failed that bar —
  `--slate-2` — and was darkened along its own hue to fix it; it carries a
  comment saying what it was and why it moved. Re-run axe after any colour
  change: that one token was worth 325 violations.
- **Screenshots of other sites** are taken from a local build of that
  site's repository, at 1600×1000 and 390×844 at 2×, and kept under
  `case-studies/<slug>/`. The Niwot shots came from
  `jlerner1965/townofniwot.com` at its launch-readiness commit and are kept as
  the record of the site as it launched — townofniwot.com now 301s to
  insideniwot.com, so they cannot be re-taken from the live domain. Inside the
  Towns screenshots come from a local build of `jlerner1965/insidethetowns`.
- **Numbers on `/work/lernerworks/` are measured.** If you change anything
  that affects page weight, re-run `tools/measure.js` and update the table.

## Shared furniture

`assets/site.css` is the single source of truth for colour, type and every
component. Pages carry no CSS of their own.

The nav and footer are identical across all eight pages except for the
relative prefix (`./`, `../`, `../../`) and the `aria-current` link. When
you change one, change all of them — a grep for `class="nav"` finds every
copy.

## Phone, email and the booking link

These three appear about 180 times across the nine pages. There is no build
step and no includes, so there is no partial to edit — `tools/contact.js` is
the single source instead. The values live in one object at the top of it:

```sh
node tools/contact.js            # check every page agrees; exits 1 if not
node tools/contact.js --write    # rewrite every page to match
```

To change a number, an address or the booking link: **edit `CONTACT` in that
file, run `--write`, commit.** One edit and one command. Do not hand-edit the
pages and hope a grep caught them all — that is the failure this replaces.

```sh
node tools/contact.js --check-live   # also confirms the booking link answers 200
```

The booking link is a plain `<a href>` to Calendly, never an embedded widget.
An embed would be a third-party request, and the site makes none.

**Open: the CTA copy and the event disagree.** Twelve CTAs say "Book a
20-minute call" and the Calendly event is still 30 minutes. The fix is on
Calendly's side. `CONTACT.booking` points at `/30min` because that is the URL
that answers — `/20min` 404s — and a dead booking link loses the enquiry
outright, where a label that overstates the call by ten minutes merely
misdescribes it.

When the event is renamed: change that one line, `node tools/contact.js
--write`, `node tools/contact.js --check-live`, commit. It rewrites all
sixty-six links.

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
node tools/measure.js --table     # emits the exact markup the case study uses
```

**Use `--table`.** The figures on `/work/lernerworks/` are pasted from it, not
typed. They used to be typed in two places and drifted: the home page is
307.48 KB, which one hand rounded to 306 and the other to 307, and both
readings were defensible enough that the disagreement went unnoticed. One run,
one rounding rule, one paste.

It loads every public page in headless Chromium at 1600 px with a cold
cache and prints what a visitor's browser would fetch. The table on
`/work/lernerworks/` is copied from this output; keep them in step.

## Images

Screenshots only, no stock photography. Two scripts keep them honest:

- `tools/optimize-images.js` re-encodes with the bundled Chromium, so
  nothing needs installing. Captures are converted to JPEG once and the PNGs
  deleted, so the committed JPEGs are the sources. It also regenerates the
  800 px `-thumb.jpg` files the cards use.
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
   client has approved for publication, plain `badge` with "Own project" for
   something you publish and run yourself. If a case study is ever unpaid work
   done without the business's involvement, it is an "Independent concept",
   says so everywhere it appears, and carries a disclosure `.note`.
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

No page-specific CSS should be needed; the `.cs-*` classes cover it. The one
exception is `.cs-compare`, the side-by-side before/after pair, which was
removed with the H&M study that was its only user — it is in the history if a
before-and-after case study ever returns.

### Things worth not breaking

- **The measure.** `--measure` in `assets/site.css` holds body copy to
  ~65–75 characters a line. It is set in `ch`, which is the width of "0" —
  much narrower than the average glyph in Public Sans — so the value (54ch)
  was calibrated against rendered text, not derived.
- **Heading levels.** One `h1` per page, `h2` for sections, no skips. The
  bold lead-ins inside "What I built" are `<strong>` inside the paragraph on
  purpose — they read as headings but are not, so the outline stays clean.
- **The hero h1 and the OG card say the same thing.** See Open Graph above.

## How this is published

The site is live at **lernerworks.com** on **Vercel**, deploying from `main`.
Merging to `main` is the deploy; there is no build step, so Vercel serves the
files as they are in the repo. `www.lernerworks.com` is the canonical host and
the apex redirects to it.

The Vercel project itself is configured on Vercel, not in this repo. The only
thing here is `vercel.json`, and it holds nothing but redirects:

```
/work/hm-mechanical, /work/hm-mechanical/ and below  → /work/  (308)
/concepts/ and everything below it                   → /work/  (308)
```

Those were live and the case study was in the sitemap, so removing them
without a redirect would have left 404s for anything already linking to them.
**Add a redirect here whenever a published URL goes away** — that is what the
file is for, and it is the same thing townofniwot.com does now that it points
at Inside Niwot.

One trap, learned by shipping it wrong: **a `:path*` source does not match the
bare trailing slash.** `/work/hm-mechanical/:path*` redirected
`/work/hm-mechanical` but left `/work/hm-mechanical/` returning 404 — and the
trailing-slash form is the one that was in the sitemap, so it was the only one
that actually mattered. List the trailing-slash path explicitly as its own
source. After changing this file, check both forms on the live site rather
than assuming.

**The canonical host is `www.lernerworks.com`.** Every `canonical`, `og:url`,
`og:image`, `twitter:image`, every `<loc>` in `sitemap.xml` and the `Sitemap:`
line in `robots.txt` name it, and the apex 308s to it. They agree character
for character; `tools/check-host.js` proves it.

It went that way round rather than the other because the redirect direction is
**not in this repo**. `vercel.json` carries no host rule — the apex→www 308 is
a Vercel project domain setting. Overriding it here with a `has: host` rule
would fight the domain-level redirect and risk a loop, so the URLs moved to
match the host instead of the other way about. To flip it later, change the
primary domain in Vercel first, then re-run the rewrite.

Internal links are all relative and name no host at all, so the site still
works from a local `python3 -m http.server` and would survive the flip.

## Service-area pages

`areas/boulder/`, `areas/longmont/`, `areas/louisville/`, `areas/lafayette/`
and `areas/erie/` are **scaffolded and unwritten**. Each carries
`noindex,nofollow`, appears in no sitemap, no menu and no link, and shows four
visible `BRIEF SLOT` blocks instead of copy.

They exist because the Growth tier sells "service-area pages for local search".
They are empty because the obvious way to build five of them — one template
with the town name swapped — is a doorway-page pattern, which Google treats as
one, and which would contradict every other claim on this site. Each page has
to say something true about that town that is not true of the other four.

**To ship one:** fill all four slots with real local copy, delete the
`noindex`, write a real `<title>` and description, then add it to
`sitemap.xml`, to the footer's service-area line and to any internal links,
and re-run `node tools/check-host.js` and `node tools/measure.js --table`.
Ship them one at a time; four good pages and one empty one is fine, five
thin ones is not.

## Before launch

- [x] Phone, email and booking link are real on every page.
- [x] No placeholder cards remain anywhere on the site — except the Inside the
      Towns traffic slot below, which is deliberate and marked as such.
- [x] Screenshots of this site on `/work/lernerworks/` re-taken against the
      current site (`node tools/measure.js --shots`). Re-take them whenever a
      page they show changes, or the case study argues from a stale picture.
- [ ] Confirm `james@lernerworks.com` actually receives mail.
- [ ] Rename the Calendly event to 20 minutes, then flip `CONTACT.booking` in
      `tools/contact.js` to `/20min` and run `--write`. Twelve CTAs already
      say "20-minute"; the event does not.
- [x] Apex vs `www` settled: everything names `www.lernerworks.com`, the host
      that actually serves. `node tools/check-host.js` re-proves it.
- [x] Inside the Towns screenshots — hub capture and seven town thumbnails,
      from a local build. See `case-studies/inside-the-towns/README.md`.
- [x] Every page passes axe-core at WCAG 2.2 AA, at three widths.
- [ ] Fill the Inside the Towns traffic figures — the last `PLACEHOLDER`.
      Needs a real reporting period; do not estimate.
- [ ] Run PageSpeed on https://www.lernerworks.com/ after this deploys and, if
      you quote it anywhere, quote it with the date.
