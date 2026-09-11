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
  // The H&M PNG captures were converted to JPEG once with this script
  // (1.7 MB → 270 KB for the desktop "before") and the PNGs deleted; the
  // JPEGs are now the sources. Card thumbnails are regenerated from them.
  ['case-studies/aragocor/01-home-hero.jpg',       'case-studies/aragocor/01-home-hero-thumb.jpg',       800],
  ['case-studies/hm-mechanical/04-after-home.jpg', 'case-studies/hm-mechanical/04-after-home-thumb.jpg', 800],
  ['case-studies/lernerworks/01-home.png',         'case-studies/lernerworks/01-home-thumb.jpg',         800],
];

(async () => {
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const page = await browser.newPage();
  await page.goto(BASE + '/');   // same origin as the images, or the canvas is tainted
  for (const [src, out, maxW] of JOBS) {
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
