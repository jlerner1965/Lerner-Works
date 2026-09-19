/*
 * Proves the site names exactly one host, everywhere, character for character.
 *
 * A canonical that points at a URL which redirects is not wrong enough to
 * break anything, which is why it survives; it is wrong enough to split what
 * a crawler indexes, and an og:image that redirects is dropped outright by
 * scrapers that will not follow one for an image. So this is checked rather
 * than remembered.
 *
 *   node tools/check-host.js                 # against the files in the repo
 *   BASE=https://www.lernerworks.com node tools/check-host.js --live
 *
 * --live fetches every canonical and diffs it against the URL that actually
 * answered, which is the only way to catch the repo and the host disagreeing.
 * Dev-only; ships nothing to a visitor.
 */
const fs = require('fs');
const path = require('path');

const HOST = process.env.HOST || 'https://www.lernerworks.com';
const ROOT = path.join(__dirname, '..');
const LIVE = process.argv.includes('--live');

const walk = (d, out = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p, out) : /\.(html|xml|txt)$/.test(e.name) && out.push(p);
  }
  return out;
};

const rel = (p) => path.relative(ROOT, p);
const fails = [];

// 1 ── no other host may appear in an absolute URL
for (const f of walk(ROOT)) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/https:\/\/((?:www\.)?lernerworks\.com)/g)) {
    if ('https://' + m[1] !== HOST) fails.push(`${rel(f)}: names https://${m[1]}, expected ${HOST}`);
  }
}

// 2 ── canonical, og:url and the served path must agree on every page
const pages = walk(ROOT).filter((f) => f.endsWith('.html'));
const canon = new Map();
for (const f of pages) {
  const s = fs.readFileSync(f, 'utf8');
  if (/<meta name="robots"[^>]*noindex/.test(s)) continue;
  const can = (s.match(/rel="canonical" href="([^"]+)"/) || [])[1];
  const ogu = (s.match(/property="og:url" content="([^"]+)"/) || [])[1];
  const dir = path.dirname(rel(f)).replace(/\\/g, '/');
  const served = HOST + (dir === '.' ? '/' : `/${dir}/`);
  if (!can) fails.push(`${rel(f)}: no canonical`);
  else {
    canon.set(can, rel(f));
    if (can !== served) fails.push(`${rel(f)}: canonical ${can} != served ${served}`);
    if (ogu && ogu !== can) fails.push(`${rel(f)}: og:url ${ogu} != canonical ${can}`);
  }
  for (const k of ['og:image', 'twitter:image']) {
    const v = (s.match(new RegExp(`(?:property|name)="${k}" content="([^"]+)"`)) || [])[1];
    if (v && !v.startsWith(HOST)) fails.push(`${rel(f)}: ${k} ${v} is not on ${HOST}`);
  }
}

// 3 ── the sitemap must be exactly the set of canonicals
const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
for (const l of locs) if (!canon.has(l)) fails.push(`sitemap.xml: <loc>${l}</loc> is no page's canonical`);
for (const c of canon.keys()) if (!locs.includes(c)) fails.push(`sitemap.xml: missing ${c} (${canon.get(c)})`);

(async () => {
  // 4 ── and, live, the URL that answers must be the URL claimed
  if (LIVE) {
    for (const [c, f] of canon) {
      try {
        const r = await fetch(c, { redirect: 'follow' });
        if (r.url !== c) fails.push(`LIVE ${f}: canonical ${c} finally served ${r.url}`);
        if (r.status !== 200) fails.push(`LIVE ${f}: ${c} returned ${r.status}`);
      } catch (e) { fails.push(`LIVE ${f}: ${c} ${e.message}`); }
    }
  }
  if (fails.length) { console.error('✗ host check failed:\n  ' + fails.join('\n  ')); process.exit(1); }
  console.log(`✓ one host, ${canon.size} pages: canonical = og:url = og:image host = sitemap <loc> = ${HOST}${LIVE ? ' = the URL that answers' : ''}`);
})();
