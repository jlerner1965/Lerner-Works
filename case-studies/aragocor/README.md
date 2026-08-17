# AragoCor case study images

Screenshots of the live aragocorminerals.com, all 1265 × 712 JPG.

**Referenced by the case study** at `/work/aragocor-minerals/`:

| File | Placement |
|---|---|
| `01-home-hero.jpg` | Lead image (also the OG image for this page and `/work/`) |
| `03-home-applications.jpg` | "What I built" — the structure paragraph |
| `04-products.jpg` | "What I built" — the graded-products paragraph |

**In the repo but not referenced** — kept because they're source material for
future edits, and unreferenced files are never downloaded by a visitor:

| File | Page |
|---|---|
| `02-home-process.jpg` | Home — stats row and "from ooid bank to your dock" |
| `05-industries.jpg` | Industries |
| `06-sustainability.jpg` | Sustainability |
| `07-science.jpg` | Science |

The case study deliberately runs three images, not seven — it's a long read,
and the brief was that it should read rather than scroll. `02-home-process.jpg`
is the strongest candidate if a fourth is ever wanted: it's a literal picture
of the "Copy with numbers in it" paragraph.

## Replacing any of these

Drop the new file in, keep the filename, then run from the repo root:

```sh
python3 tools/set-image-dims.py --write
```

That writes the real pixel dimensions into the `<img>` tags and the `og:image`
meta. The CSS sets `height:auto`, so a mismatch never distorts an image — but
those attributes are what reserve the right space before the file loads, which
is what keeps the page from shifting. If the new file has a different
extension, update the `src` in the HTML too.

## Known limitations of the current exports

None of these block launch, but all three would make the page look sharper:

- **The browser scrollbar is visible** down the right edge of every capture.
  It reads as a screenshot of a browser rather than a picture of the work.
- **They're 1× captures at 1265 px wide.** The lead image displays at up to
  1012 CSS px, so on any 2× display it renders soft. Re-exporting at ~2530 px
  wide would fix it; the markup needs no change beyond re-running the script.
- **Two are cut mid-section** — `04-products.jpg` slices through the product
  cards and `07-science.jpg` through a heading. Cutting at a section boundary
  looks deliberate; mid-card looks like a mistake.

No stock photography here — these are screenshots of real work only.
