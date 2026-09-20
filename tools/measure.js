/*
 * Measures every public page the way a visitor's browser would: number of
 * requests, which origins they go to, bytes transferred, and whether any
 * JavaScript ran. The numbers quoted in /work/lernerworks/ come from this.
 *
 *   python3 -m http.server 8765 &     # from the repo root
 *   node tools/measure.js             # prints a table
 *   node tools/measure.js --shots     # also writes the case-study screenshots
 *   node tools/measure.js --table     # prints the exact markup for that page
 *
 * --table exists because the same figure was once written by hand in two
 * places and drifted: the home page is 306.54 KB, which someone rounded to
 * 306 in the "at a glance" strip and 307 in the results table. Both readings
 * were defensible, which is what made it hard to spot. Now one run emits both,
 * rounded once, and the page is pasted from it rather than edited.
 *
 * Dev-only; needs Playwright like assets/og/render.js.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const PAGES = ['/', '/boulder-county-web-design/', '/work/', '/work/inside-the-towns/', '/work/aragocor-minerals/', '/work/townofniwot/', '/work/lernerworks/', '/services/', '/about/', '/contact/'];
const SHOTS = process.argv.includes('--shots');
const TABLE = process.argv.includes('--table');

// What each measured path is called on /work/lernerworks/.
const LABELS = {
  '/': 'Home',
  '/boulder-county-web-design/': 'Boulder County web design',
  '/work/': 'Work',
  '/work/inside-the-towns/': 'Inside the Towns',
  '/work/aragocor-minerals/': 'AragoCor Minerals',
  '/work/townofniwot/': 'TownofNiwot.com',
  '/work/lernerworks/': 'This page',
  '/services/': 'Services',
  '/about/': 'About',
  '/contact/': 'Contact',
};

// One rounding rule, applied once, used by every figure the page quotes.
const kb = (bytes) => Math.round(bytes / 1024);

(async () => {
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const rows = [];
  for (const p of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const reqs = [];
    page.on('response', async (r) => {
      const req = r.request();
      let size = 0;
      try { const b = await r.body(); size = b.length; } catch (e) {}
      reqs.push({ url: req.url(), type: req.resourceType(), status: r.status(), size });
    });
    await page.goto(BASE + p, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const scripts = await page.evaluate(() => document.querySelectorAll('script:not([type="application/ld+json"])').length);
    const external = reqs.filter(r => !r.url.startsWith(BASE));
    const bytes = reqs.reduce((a, r) => a + r.size, 0);
    const byType = {};
    for (const r of reqs) byType[r.type] = (byType[r.type] || 0) + r.size;
    rows.push({ page: p, requests: reqs.length, external: external.length, scripts, kb: (bytes / 1024).toFixed(1), bytes, byType });
    if (SHOTS && p === '/') {
      fs.mkdirSync(path.join(__dirname, '..', 'case-studies', 'lernerworks'), { recursive: true });
      await page.screenshot({ path: path.join(__dirname, '..', 'case-studies', 'lernerworks', '01-home.png') });
    }
    if (SHOTS && p === '/work/') {
      await page.screenshot({ path: path.join(__dirname, '..', 'case-studies', 'lernerworks', '02-work.png') });
    }
    await ctx.close();
  }
  if (SHOTS) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(__dirname, '..', 'case-studies', 'lernerworks', '03-home-mobile.png') });
    await ctx.close();
  }
  await browser.close();
  console.table(rows.map(r => ({ page: r.page, requests: r.requests, external: r.external, scripts: r.scripts, KB: r.kb })));
  for (const r of rows) console.log(r.page, JSON.stringify(Object.fromEntries(Object.entries(r.byType).map(([k, v]) => [k, (v / 1024).toFixed(1) + 'KB']))));

  if (!TABLE) return;
  const home = rows.find((r) => r.page === '/');
  const homeImages = home.byType.image || 0;
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  console.log('\n─── paste into the "At a glance" strip on /work/lernerworks/ ───\n');
  console.log(`        <div><dt>to load the home page in full, images included</dt><dd>${home.requests} requests</dd></div>`);
  console.log(`        <div><dt>for the whole home page, of which ${kb(homeImages)} KB is the three case-study thumbnails</dt><dd>${kb(home.bytes)} KB</dd></div>`);

  console.log('\n─── paste into the results table ───\n');
  for (const r of rows) {
    const label = LABELS[r.page] || r.page;
    console.log(`          <tr><td>${label}</td><td>${r.requests}</td><td>${r.external}</td><td>${r.scripts ? r.scripts : 'none'}</td><td>${kb(r.bytes)} KB</td></tr>`);
  }
  console.log(`\n─── and the caption date ───\n\n  Regenerated in one run of tools/measure.js on ${today}.`);
  console.log(`\n  fonts ${kb(rows[0].byType.font || 0)} KB · stylesheet ${kb(rows[0].byType.stylesheet || 0)} KB · home exactly ${home.bytes} B = ${(home.bytes / 1024).toFixed(2)} KB`);
})();
