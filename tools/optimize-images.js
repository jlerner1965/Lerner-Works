/*
 * Re-encodes screenshots with the bundled Chromium, so the repo needs no
 * image tooling installed. Each job is [source, output, maxWidth]: a null
 * width keeps the pixel size (PNG → JPEG), a number scales down to it.
 *
 * Card thumbnails are an 800px-wide JPEG next to each lead image, named
 * <name>-thumb.jpg, for the /work/ and home-page cards. A card never
 * displays wider than ~360 CSS px, so 800 covers a 2× screen.
 *
 *   python3 -m http.server 8765 &     # from the repo root
 *   node tools/optimize-images.js
 *
 * Dev-only; needs Playwright like assets/og/render.js. Re-run
 * tools/set-image-dims.py --write afterwards.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const ROOT = path.join(__dirname, '..');

// [source, output, maxWidth or null for same size]
const JOBS = [
  // Captures are converted to JPEG once and the PNGs deleted; the committed
  // JPEGs are the sources, and card thumbnails are regenerated from them.
  ['case-studies/aragocor/01-home-hero.jpg',       'case-studies/aragocor/01-home-hero-thumb.jpg',       800],
  // Niwot's PNG captures were converted once and deleted, so the committed
  // JPEGs are the sources now; only the thumbnail is still derived.
  ['case-studies/townofniwot/01-home.jpg',        'case-studies/townofniwot/01-home-thumb.jpg',  800],
  // Inside the Towns: the hub capture, from a local TOWN=hub build.
  ['case-studies/inside-the-towns/01-hub.jpg',    'case-studies/inside-the-towns/01-hub-thumb.jpg', 800],
  // This site's own shots come out of `measure.js --shots` as PNG. Only the
  // /work/ grid is worth re-encoding: it is full of photographs and drops
  // 262 KB to 122 KB as JPEG. The home and mobile shots are flatter UI and
  // PNG beats JPEG on both (by 4 KB and 13 KB), so they ship as captured.
  // Re-measure before adding one here; do not assume JPEG is smaller.
  ['case-studies/lernerworks/02-work.png',         'case-studies/lernerworks/02-work.jpg',               null],
  ['case-studies/lernerworks/01-home.png',         'case-studies/lernerworks/01-home-thumb.jpg',         800],
];

(async () => {
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const page = await browser.newPage();
  await page.goto(BASE + '/');   // same origin as the images, or the canvas is tainted
  for (const [src, out, maxW] of JOBS) {
    // A source that has been re-encoded and deleted leaves a stale job behind.
    // Say so and carry on: one dead entry should not stop the other seven.
    if (!fs.existsSync(path.join(ROOT, src))) {
      console.log(`${out}  SKIPPED — source missing: ${src}`);
      continue;
    }
    const dataUrl = await page.evaluate(async ({ url, maxW }) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      const scale = maxW && img.naturalWidth > maxW ? maxW / img.naturalWidth : 1;
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);   // PNG alpha → white
      ctx.drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.86);
    }, { url: `${BASE}/${src}`, maxW });
    const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
    fs.writeFileSync(path.join(ROOT, out), buf);
    const before = fs.statSync(path.join(ROOT, src)).size;
    console.log(`${out}  ${(before/1024).toFixed(0)}KB → ${(buf.length/1024).toFixed(0)}KB`);
  }
  await browser.close();
})();
