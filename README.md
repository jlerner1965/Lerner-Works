# Lerner Works — freelance website

Site for **James Lerner · Lerner Works** — web design & marketing for small
businesses in Boulder County. Hand-written static HTML: no build step, no
framework, no dependencies beyond Google Fonts.

```
index.html                            home
assets/site.css                       shared tokens, nav, buttons, footer,
                                      case-study template
work/index.html                       /work/ — case study index
work/aragocor-minerals/index.html     /work/aragocor-minerals/
case-studies/aragocor/                images for that case study
```

`assets/site.css` is the single source of truth for colour, type and the
shared furniture. Page-specific CSS lives in a `<style>` block in the page
that needs it, loaded *after* the stylesheet so it wins on the cascade.

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
3. Put images in `case-studies/<slug>/`. Every `<img>` needs an explicit
   `width` and `height` (the real pixel dimensions) so nothing shifts while
   the page loads, plus `loading="lazy"` on everything below the lead image.
4. Add a card to `work/index.html` — swap one of the `wcard--soon`
   placeholders for an `<a class="wcard" href="./<slug>/">`.

No page-specific CSS should be needed; the `.cs-*` classes cover it.

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

Note: the `canonical` and `og:` URLs are written as `https://lernerworks.com/…`.
They are absolute by necessity (Open Graph requires it) and are wrong until the
custom domain is attached. Everything else uses relative paths, so the site
works correctly on either host.

## Before launch — find and replace

Across `index.html`, `work/index.html` and `work/aragocor-minerals/index.html`:

- [ ] `YOUR-PHONE` — your business phone number (appears in the nav and footer;
      the `tel:` links need digits only, e.g. `tel:+13035551234`)
- [ ] `YOUR-BOOKING-LINK` — a Cal.com or Calendly URL (both have free tiers)

In `index.html` only:

- [ ] The **PHOTO** placeholder in "Who you're hiring" — a real headshot
      matters more than anything else on the page
- [ ] `james@lernerworks.com` — set up as a real mailbox
- [ ] The two `PROJECT NAME` cards under "Recent work"

In the case study:

- [ ] Drop the four PNGs into `case-studies/aragocor/` — see the README there
- [ ] `05-calculator.png` is still a dashed placeholder box; the markup that
      replaces it is in an HTML comment directly above it
