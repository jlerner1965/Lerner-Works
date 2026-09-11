/*
 * Renders the Open Graph link-preview cards to PNG.
 *
 * Open Graph images have to be static files at absolute URLs, so they are
 * generated once and committed rather than built on the fly. One template
 * (card.html) takes the eyebrow and title as query parameters.
 *
 *   python3 -m http.server 8765 &     # from the repo root
 *   node assets/og/render.js
 *
 * Needs Playwright (npx playwright install chromium), which is a dev-only
 * dependency — the site itself still has no build step and no packages.
 *
 * If a page's h1 changes, change its entry here and re-render: a preview
 * that contradicts the page is worse than a plain one.
 */
const { chromium } = require('playwright');
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const SIZE = { width: 1200, height: 630 };   // the size every platform expects
const CARDS = [
  { out: 'home.png',     k: 'Web design & marketing · Boulder County', t: 'A website that brings in work. Built by the person you actually talk to.' },
  { out: 'work.png',     k: 'Work · Case studies',                      t: 'What was wrong, what I built, and what it cost to decide.' },
  { out: 'services.png', k: 'Services & pricing',                       t: 'Three services, one process, prices you can read before you call.' },
  { out: 'about.png',    k: 'About · James Lerner',                     t: 'One person. The one you talk to.' },
  { out: 'contact.png',  k: 'Contact',                                  t: 'Three ways to reach me. All of them reach me.' },
];

(async () => {
  const browser = await chromium.launch(
    process.env.CHROME ? { executablePath: process.env.CHROME } : {}
  );
  const ctx = await browser.newContext({ viewport: SIZE, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  for (const card of CARDS) {
    const q = new URLSearchParams({ k: card.k, t: card.t }).toString();
    await page.goto(`${BASE}/assets/og/card.html?${q}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const out = path.join(__dirname, card.out);
    await page.screenshot({ path: out });
    console.log(`${card.out}  ${SIZE.width}x${SIZE.height}`);
  }

  await browser.close();
})();
