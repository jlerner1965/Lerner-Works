/*
 * Measures every public page the way a visitor's browser would: number of
 * requests, which origins they go to, bytes transferred, and whether any
 * JavaScript ran. The numbers quoted in /work/lernerworks/ come from this.
 *
 *   python3 -m http.server 8765 &     # from the repo root
 *   node tools/measure.js             # prints a table
 *   node tools/measure.js --shots     # also writes the case-study screenshots
 *
 * Dev-only; needs Playwright like assets/og/render.js.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const PAGES = ['/', '/work/', '/work/aragocor-minerals/', '/work/hm-mechanical/', '/work/lernerworks/', '/services/', '/about/', '/contact/'];
const SHOTS = process.argv.includes('--shots');

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
    rows.push({ page: p, requests: reqs.length, external: external.length, scripts, kb: (bytes / 1024).toFixed(1), byType });
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
})();
