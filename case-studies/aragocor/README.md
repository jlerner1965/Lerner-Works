# AragoCor case study images

Drop the four PNGs here. The case study at `/work/aragocor-minerals/`
references them at `../../case-studies/aragocor/<file>`.

| File | Placement | Export size |
|---|---|---|
| `01-home-hero.png` | Lead image (also the OG image) | 1600 × 900 |
| `03-home-applications.png` | "What I built" — structure paragraph | 1600 × 1000 |
| `04-products.png` | "What I built" — graded products paragraph | 1600 × 1000 |
| `05-calculator.png` | "Then: the sourcing tool" | 1600 × 1000 |

`05-calculator.png` is not exported yet. Its slot in the page is a dashed
placeholder at the right aspect ratio; the markup that replaces it is in an
HTML comment directly above it.

**If your exports are a different size**, update the `width` and `height`
attributes on the matching `<img>` to the real pixel dimensions, and update
`og:image:width` / `og:image:height` in `<head>` for the hero. The CSS sets
`height:auto`, so a mismatch won't distort the image — but the attributes are
what reserve the right amount of space before the file loads, which is what
keeps the page from shifting.

No stock photography here — these are screenshots of real work only.
