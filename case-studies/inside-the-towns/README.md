# Inside the Towns — screenshots

Twenty-six files, all in place. They were taken on October 11, 2026 from local
builds of `jlerner1965/insidethetowns` at commit `56c0021` (October 10), the
same way the Niwot shots were taken — from the repository, never from the live
domain. One build per site, `TOWN=<slug> npm run build`, served from `dist/`
and captured at `/` at 1600×1000, clipped to `clientWidth`.

```
01-hub.jpg        1600×1000  the insidethetowns.com hub home page (lead image, and the OG image)
01-hub-thumb.jpg   800×500   derived by tools/optimize-images.js, for the /work/ and home cards
<slug>.jpg         480×300   one per live guide, for the cards in the network diagram:
                             niwot lyons erie longmont berthoud fortcollins johnstown
                             loveland severance timnath windsor carbon-valley fort-lupton
                             black-hawk estes-park evergreen georgetown golden grand-lake
                             idaho-springs leadville manitou-springs nederland elizabeth
```

The slugs are the network's own (`src/config/towns/registry.ts`), which is why
Fort Collins is `fortcollins` and the rest are hyphenated.

480 px covers the diagram card, which is about 234 CSS px at its widest and so
468 device px on a 2× screen. The twenty-four together are about 390 KB, all
lazy-loaded.

## Re-taking them

```sh
cd <insidethetowns>
npm ci
node scripts/live-towns.ts      # the list: hub and every live guide
TOWN=hub npm run build          # then each slug in turn
python3 -m http.server 8899 --directory dist
# capture / at 1600×1000, then re-encode into this folder at the sizes above
```

Then, back in this repo:

```sh
python3 -m http.server 8765 &
node tools/optimize-images.js            # regenerates 01-hub-thumb.jpg
python3 tools/set-image-dims.py --write  # writes real pixel dimensions into the HTML
node tools/measure.js                    # update the table on /work/lernerworks/ if weights moved
```

Re-take them if a town's design changes, or when a town goes live — a new
guide needs a card in the diagram in `work/inside-the-towns/index.html`, under
its region, its palette class in `assets/site.css`, and a `<slug>.jpg` here.
Castle Rock has a config and a holding page but is not live, so it has none of
the three yet.

## Still open: traffic and usage

The one line left. It is the "Not yet measured" paragraph under "Result" in
the case study, with a comment above it in the source. Fill it from the
analytics the network actually runs, with the date range and the source
stated, the way `/work/lernerworks/` quotes its own measurements.

Do not estimate. Everything else on that page can be counted from the
repository, and an unsourced traffic figure would be the only claim on it a
reader cannot check. Until it is filled, the page says plainly that the
numbers are not there yet — which is better than a number nobody can stand
behind.
