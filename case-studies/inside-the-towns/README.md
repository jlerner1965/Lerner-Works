# Inside the Towns — screenshots

All eight captures are in place. They were taken on September 19, 2026 from a
local build of `jlerner1965/insidethetowns` at commit `b0db0e3`, the same way
the Niwot shots were taken — from the repository, never from the live domain.

```
01-hub.jpg        1600×1000  the insidethetowns.com hub home page (lead image, and the OG image)
01-hub-thumb.jpg   800×500   derived by tools/optimize-images.js, for the /work/ and home cards
niwot.jpg          480×300   one per town, for the cards in the network diagram
lyons.jpg          480×300
berthoud.jpg       480×300
erie.jpg           480×300
johnstown.jpg      480×300
timnath.jpg        480×300
elizabeth.jpg      480×300
```

480 px covers the diagram card, which is about 234 CSS px at its widest and so
468 device px on a 2× screen. All eight together cost less than one of the
full-size screenshots on the Niwot study.

## Re-taking them

```sh
cd <insidethetowns>
npm install
TOWN=hub npm run build          # or niwot, lyons, berthoud, erie, johnstown, timnath, elizabeth
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

Re-take them if a town's design changes, or when a town is added to the
network — a new town needs a card in the diagram in
`work/inside-the-towns/index.html` and a `<slug>.jpg` here.

## Still open: traffic and usage

The one slot left. It is the `.cs-slot` under "Result" in the case study,
marked `PLACEHOLDER` in the source. Fill it from the analytics the network
actually runs, with the date range and the source stated, the way
`/work/lernerworks/` quotes its own measurements.

Do not estimate. Everything else on that page can be counted from the
repository, and an unsourced traffic figure would be the only claim on it a
reader cannot check. Until it is filled, the page says plainly that the
numbers are not there yet — which is better than a number nobody can stand
behind.
