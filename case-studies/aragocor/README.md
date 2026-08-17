# AragoCor case study images

Drop the three PNGs here. The case study at `/work/aragocor-minerals/`
references them at `../../case-studies/aragocor/<file>`.

| File | Placement | Export size |
|---|---|---|
| `01-home-hero.png` | Lead image (also the OG image) | 1600 × 1000 |
| `03-home-applications.png` | "What I built" — structure paragraph | 1600 × 1000 |
| `04-products.png` | "What I built" — graded products paragraph | 1600 × 1000 |

The sourcing-tool section carries no screenshot by decision — its two
diagrams do that work. (A slot for `tool-calculator.png` existed and was
removed; it's in git history if that ever reverses.)

The sizes above are what the HTML currently declares, not a requirement —
export at whatever size looks right. After dropping the files in, run this
from the repo root:

```sh
python3 tools/set-image-dims.py --write
```

It reads each file and writes the real dimensions into the `<img>` tags and
the `og:image` meta, so the declared sizes can't drift from the actual ones.
The CSS sets `height:auto`, so a mismatch never distorts an image — but the
attributes are what reserve the right space before the file loads, which is
what keeps the page from shifting.

Export tips, since these are screenshots of a live site:

- **Crop the browser scrollbar off.** It reads as a screenshot of a browser
  rather than a picture of the work.
- **Cut at a section boundary**, not mid-card — a row of tiles sliced in half
  at the bottom edge looks like a mistake.
- 2x a ~1265px viewport (so ~2530px wide) is plenty; the widest the case
  study ever displays them is 896px.

No stock photography here — these are screenshots of real work only.
