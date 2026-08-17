/*
 * Renders the Open Graph cards in this directory to PNG.
 *
 * Open Graph images have to be static files at absolute URLs, so they are
 * generated once and committed rather than built on the fly. This script
 * exists so the next one is a two-minute job instead of a Photoshop session.
 *
 *   python3 -m http.server 8765 &     # from the repo root
 *   node assets/og/render.js
 *
 * Needs Playwright (npx playwright install chromium), which is a dev-only
 * dependency — the site itself still has no build step and no packages.
 */
const { chromium } = require('playwright');
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const CARDS = [{ src: '/assets/og/home.html', out: 'home.png' }];
const SIZE = { width: 1200, height: 630 };   // the size every platform expects

(async () => {
  const browser = await chromium.launch(
    process.env.CHROME ? { executablePath: process.env.CHROME } : {}
  );
  const ctx = await browser.newContext({ viewport: SIZE, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  for (const card of CARDS) {
    await page.goto(BASE + card.src, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const out = path.join(__dirname, card.out);
    await page.screenshot({ path: out });
    console.log(`${card.out}  ${SIZE.width}x${SIZE.height}`);
  }

  await browser.close();
})();
