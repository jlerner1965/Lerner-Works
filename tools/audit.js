/*
 * The browser checks: accessibility and the content-security policy, on
 * every indexable page.
 *
 *   node tools/audit.js                 # every page in the sitemap
 *   node tools/audit.js /contact/       # one page
 *
 * It serves the repository itself, with the headers from vercel.json, so the
 * policy is tested as Vercel will send it rather than as it was written down.
 * Two passes per page:
 *
 *   1. CSP — the page loads under the real policy. Any securitypolicyviolation
 *      event, console error or failed request fails the run. This is what
 *      proves "no inline styles, no scripts, nothing from anywhere else".
 *   2. axe — WCAG 2.2 AA at 1280, 860 and 390 px, and once more at 390 with
 *      the mobile menu open, since that is the one state a reader creates.
 *      axe is injected over the policy (bypassCSP), which is the only way to
 *      run a script on a page that forbids scripts.
 *
 * Needs Playwright and axe-core, resolvable from NODE_PATH:
 *   npm install -g playwright axe-core && npx playwright install chromium
 * Dev-only; it ships nothing to a visitor.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const WIDTHS = [1280, 860, 390];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json' };

// The headers Vercel will send, read from the same file it reads them from.
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const HEADERS = (vercel.headers || []).filter((h) => h.source === '/(.*)').flatMap((h) => h.headers);

const only = process.argv[2];
const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const PAGES = [...sm.matchAll(/<loc>https:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]).filter((p) => !only || p === only);

const serve = () => new Promise((resolve) => {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    for (const h of HEADERS) res.setHeader(h.key, h.value);
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  server.listen(0, '127.0.0.1', () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }));
});

const scrollThrough = (page) => page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
    window.scrollTo(0, y);
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 40)));
  }
  window.scrollTo(0, 0);
});

(async () => {
  const { server, base } = await serve();
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const fails = [];
  let axeRuns = 0;

  for (const p of PAGES) {
    // ── 1. CSP, console, requests ──
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      const problems = [];
      await page.addInitScript(() => {
        window.__csp = [];
        document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective}: ${e.blockedURI || e.sourceFile || 'inline'} (line ${e.lineNumber})`));
      });
      page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
      page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()} ${r.failure()?.errorText || ''}`));
      page.on('response', (r) => { if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`); });
      await page.goto(base + p, { waitUntil: 'networkidle' });
      await scrollThrough(page);
      await page.waitForLoadState('networkidle');
      for (const v of await page.evaluate(() => window.__csp)) problems.push(`CSP ${v}`);
      // A policy that let the stylesheet through leaves the page styled; a
      // page that fell back to browser defaults would still "load".
      const styled = await page.evaluate(() => getComputedStyle(document.body).fontFamily.includes('Public Sans'));
      if (!styled) problems.push('stylesheet did not apply (body is not in Public Sans)');
      for (const x of problems) fails.push(`${p}: ${x}`);
      await ctx.close();
    }

    // ── 2. axe at three widths, plus the open menu ──
    for (const w of WIDTHS) {
      const states = w === 390 ? ['closed', 'menu open'] : ['closed'];
      for (const state of states) {
        const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, bypassCSP: true });
        const page = await ctx.newPage();
        await page.addInitScript(AXE);
        await page.goto(base + p, { waitUntil: 'networkidle' });
        if (state === 'menu open') await page.evaluate(() => { const d = document.querySelector('details.menu'); if (d) d.open = true; });
        const r = await page.evaluate((tags) => axe.run(document, { runOnly: { type: 'tag', values: tags } }), TAGS);
        axeRuns++;
        for (const v of r.violations) {
          fails.push(`${p} @${w}${state === 'menu open' ? ' (menu open)' : ''}: [${v.impact}] ${v.id} — ${v.help} ×${v.nodes.length}\n      ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('\n      ')}`);
        }
        await ctx.close();
      }
    }
    process.stdout.write(`  ${p.padEnd(32)} ${fails.some((f) => f.startsWith(p + ':') || f.startsWith(p + ' ')) ? '✗' : '✓'}\n`);
  }

  await browser.close();
  server.close();
  if (fails.length) {
    console.error(`\n  ✗ ${fails.length} problem(s):\n` + fails.map((f) => `    - ${f}`).join('\n'));
    process.exit(1);
  }
  console.log(`\n  ✓ ${PAGES.length} pages under the vercel.json headers: no CSP violations, no console errors, no failed requests; axe clean in ${axeRuns} runs (${TAGS.join(', ')})`);
})();
