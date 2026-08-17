# Lerner Works — personal freelance website

One-page site for **James Lerner · Lerner Works** — web design & marketing for
small businesses in Boulder County. The whole site is a single static file,
`index.html`, with no build step and no dependencies beyond Google Fonts.

## Preview locally

Open `index.html` in a browser, or run a tiny server:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Publish with GitHub Pages (free)

1. Merge this branch into `main`.
2. On GitHub: **Settings → Pages → Source: Deploy from a branch**, pick
   `main` and `/ (root)`, then save.
3. The site goes live at `https://jlerner1965.github.io/Lerner-Works/`.
   A custom domain (e.g. `lernerworks.com`) can be added on the same
   settings page later.

## Before launch — find and replace in `index.html`

- [ ] `YOUR-PHONE` — your business phone number (appears in the nav and footer;
      the `tel:` links need digits only, e.g. `tel:+13035551234`)
- [ ] `YOUR-BOOKING-LINK` — a Cal.com or Calendly URL (both have free tiers)
- [ ] The **PHOTO** placeholder in "Who you're hiring" — a real headshot
      matters more than anything else on the page
- [ ] `james@lernerworks.com` — set up as a real mailbox
- [ ] The two `PROJECT NAME` cards under "Recent work" — fill in the concept
      projects, and replace them with paid client work as it wraps
