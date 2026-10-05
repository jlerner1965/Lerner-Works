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
 *
 * It also renders /apple-touch-icon.png from icon.html, so the home-screen
 * icon is drawn from the same colours and type as everything else.
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
  { out: 'contact.png',  k: 'Contact',                                  t: 'Two ways to reach me. Both of them reach me.' },
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

  // The home-screen icon: the favicon's "LW" mark, from icon.html, written to
  // the site root because that is the path iOS asks for even without a link.
  const icon = await browser.newContext({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
  const ip = await icon.newPage();
  await ip.goto(`${BASE}/assets/og/icon.html`, { waitUntil: 'networkidle' });
  await ip.evaluate(() => document.fonts.ready);
  await ip.screenshot({ path: path.join(__dirname, '..', '..', 'apple-touch-icon.png') });
  console.log('apple-touch-icon.png  180x180');

  await browser.close();
})();
