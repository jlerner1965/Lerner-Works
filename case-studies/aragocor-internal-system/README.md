# AragoCor internal system — case study images

Three figures, all rendered on 13 October 2026 from the launch design
mock-ups in the system's repository (`jlerner1965/Internal_Systejm`,
`docs/launch/design/mocks/`, at its commit `c36a5a3` of 8 October). They are
the mock-ups the shipped v2 look was built from (launch package WP-12), not
captures of the live system: the live system holds the client's own records,
so it is not captured for a public page. The page's captions say so.

| File | Size | Placement |
|---|---|---|
| `01-dashboard.jpg` | 1600 × 1000 | Lead image, and the OG image for this page |
| `01-dashboard-thumb.jpg` | 800 × 500 | Card thumbnail for `/work/` |
| `02-new-quote.jpg` | 1200 × 750 | "What I built" — the quote and its PDF preview |
| `03-phones.jpg` | 1200 × 1250 | "What I built" — the samples and leads lists on a phone, side by side |

## What was changed before rendering

The mock-ups ship with the repository's demo data (`worker/seed-demo.sql`).
Before rendering, every person's first name and the one real company name in
that data were replaced with neutral ones, and the Tasks and Team board
entries were removed from the sidebar, because the system dropped both on
8 October 2026 (launch status item 24). One dashboard line that mentioned
@mentions and tasks was reworded for the same reason. Nothing else was
touched.

## How they were rendered

Chromium (Playwright) opened each `.html` mock-up from disk at 1440 × 900
(desktop) or 390 × 844 (phone) at 2×, and the PNGs were re-encoded to JPEG
at the sizes above. The two phone shots were placed side by side on the
mock-ups' own paper colour with a 60 px gap.

## Re-taking them

When the live system can be captured with demo data — a local run of the
Worker against the seed, as `worker/test/smoke.mjs` does — replace these
with captures of the real screens, keep the filenames, and drop the
"launch design mock-up" wording from the captions on
`work/aragocor-internal-system/index.html`. Then, from the repo root:

```sh
python3 tools/set-image-dims.py --write   # writes real dimensions into the HTML and og:image
node tools/check.js
```
