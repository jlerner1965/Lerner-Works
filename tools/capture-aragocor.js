/*
 * Re-capture the three AragoCor screenshots the case study uses.
 *
 * The old ones were 1265x712 viewport slices: they cut through a card row,
 * carried the browser scrollbar down the right edge and rounded corners at
 * the top. Each capture here is framed on a real boundary instead — the hero
 * as it arrives, and each grid band complete — and clipped to clientWidth so
 * the scrollbar is never in frame.
 *
 * Chromium here does not trust the agent proxy CA and disabling verification
 * is not an option, so Node fetches every request and Chromium only ever sees
 * bytes Node has already verified.
 */
const { chromium } = require('playwright');
const OUT = process.argv[2] || 'case-studies/aragocor';
const SITE = 'https://www.aragocorminerals.com';

const settle = async (p) => {
  await p.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 70)); }
    window.scrollTo(0, 0);
  });
  await p.waitForTimeout(1400);
  await p.evaluate(() => document.fonts && document.fonts.ready);
};

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await ctx.route('**/*', async (route) => {
    const u = route.request().url();
    if (!u.startsWith('http')) return route.continue();
    try {
      const r = await fetch(u);
      const body = Buffer.from(await r.arrayBuffer());
      const h = {};
      r.headers.forEach((v, k) => { if (!/^(content-encoding|content-length|transfer-encoding)$/i.test(k)) h[k] = v; });
      route.fulfill({ status: r.status, headers: h, body });
    } catch (e) { route.abort(); }
  });
  const p = await ctx.newPage();

  // 1 ── the home hero, as a visitor meets it
  await p.goto(SITE + '/', { waitUntil: 'networkidle' });
  await settle(p);
  const cw = await p.evaluate(() => document.documentElement.clientWidth);
  await p.screenshot({ path: `${OUT}/01-home-hero.png`, clip: { x: 0, y: 0, width: cw, height: 1000 } });
  console.log(`01-home-hero      ${cw}x1000   hero as it arrives`);

  // 2 ── the applications band, complete
  const appBand = await p.evaluate(() => {
    const h = [...document.querySelectorAll('h2')].find(x => x.textContent.replace(/\s+/g, ' ').includes('One mineral'));
    let n = h.parentElement, best = null;
    while (n && n !== document.body) {
      const r = n.getBoundingClientRect();
      if (r.width >= innerWidth * 0.9 && r.height < 2200) best = n;
      if (r.width >= innerWidth * 0.9 && r.height >= 2200) break;
      n = n.parentElement;
    }
    const r = best.getBoundingClientRect();
    return { top: Math.round(r.top + scrollY), height: Math.round(r.height) };
  });
  // fullPage, because a clip below the fold is "outside the resulting image"
  // when the screenshot is only the viewport.
  await p.screenshot({ path: `${OUT}/03-home-applications.png`, fullPage: true,
    clip: { x: 0, y: appBand.top, width: cw, height: appBand.height } });
  console.log(`03-applications   ${cw}x${appBand.height}   complete band, no sliced row`);

  // 3 ── the product grades, with the particle sizing the caption points at
  await p.goto(SITE + '/products/', { waitUntil: 'networkidle' });
  await settle(p);
  const prod = await p.evaluate(() => {
    // Frame from the page heading down past the last card, so every grade
    // shows its sizing line — that is what the figure is there to show.
    const h1 = document.querySelector('h1');
    const cards = [...document.querySelectorAll('article,li,div')]
      .filter(e => /AG-CAL|GL-CAL|WT-CAL|PL-CAL/.test(e.textContent || '') && e.getBoundingClientRect().height > 180 && e.getBoundingClientRect().width < innerWidth * 0.5);
    if (!cards.length) return null;
    const top = Math.round(h1.getBoundingClientRect().top + scrollY) - 90;
    const bottom = Math.round(Math.max(...cards.map(c => c.getBoundingClientRect().bottom + scrollY))) + 40;
    return { top: Math.max(0, top), height: bottom - Math.max(0, top), cards: cards.length };
  });
  if (!prod) { console.log('products: card grid not found'); }
  else {
    await p.screenshot({ path: `${OUT}/04-products.png`, fullPage: true, clip: { x: 0, y: prod.top, width: cw, height: prod.height } });
    console.log(`04-products       ${cw}x${prod.height}   ${prod.cards} grade cards, sizing included`);
  }
  await b.close();
})();
