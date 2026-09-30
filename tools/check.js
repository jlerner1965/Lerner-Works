/*
 * Pre-flight. Everything that can be checked without a browser, in one
 * command, so a deploy is a decision rather than a hope.
 *
 *   node tools/check.js
 *
 * It runs the file-level checks that already exist — contact details
 * (contact.js), one host (check-host.js), the shared chrome (chrome.js),
 * image dimensions (set-image-dims.py) — and adds the ones a portfolio site
 * is judged on first:
 *
 *   - every internal link and image resolves, fragments included
 *   - one h1 per page, no skipped heading levels, alt text on every image
 *   - a title, a description and a canonical on every page; titles and
 *     descriptions unique across the indexable pages
 *   - the same favicon, and a link to /apple-touch-icon.png, on every page
 *   - every JSON-LD block parses
 *   - noindex pages are out of the sitemap, and every lastmod is a real,
 *     past date
 *   - anything marked PLACEHOLDER is listed, so it cannot ship unnoticed
 *
 * Exit 1 on any failure. The browser checks — accessibility and the
 * content-security policy — are tools/audit.js. Dev-only.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const fails = [];
const warns = [];

const walk = (d, out = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p, out) : e.name.endsWith('.html') && out.push(p);
  }
  return out;
};
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
// Blank out comments with same-length spaces so offsets stay valid and
// commented-out markup is invisible to every scan below.
const mask = (s) => s.replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length));

const pages = walk(ROOT).filter((f) => !rel(f).startsWith('assets/')).sort();
const docs = new Map(pages.map((f) => [f, mask(fs.readFileSync(f, 'utf8'))]));
const ids = new Map([...docs].map(([f, s]) => [f, new Set([...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]));
const isNoindex = (s) => /<meta name="robots"[^>]*noindex/.test(s);

// ── 1. sub-checks that already exist ─────────────────────────────────────
const run = (label, cmd, args, ok) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  if (!ok(r, out)) fails.push(`${label}:\n${out.trim().split('\n').map((l) => '      ' + l).join('\n')}`);
};
run('contact details (tools/contact.js)', 'node', ['tools/contact.js'], (r) => r.status === 0);
run('one host (tools/check-host.js)', 'node', ['tools/check-host.js'], (r) => r.status === 0);
run('shared chrome (tools/chrome.js)', 'node', ['tools/chrome.js'], (r) => r.status === 0);
run('image dimensions (tools/set-image-dims.py)', 'python3', ['tools/set-image-dims.py'], (r, out) => {
  const m = out.match(/(\d+) already correct, (\d+) to update, (\d+) missing/);
  return r.status === 0 && m && m[2] === '0' && m[3] === '0';
});

// ── 2. every internal link and image resolves ────────────────────────────
for (const [f, s] of docs) {
  for (const m of s.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|data:|\/\/)/.test(url)) continue;
    const [pathPart, frag] = url.split('#');
    const query = pathPart.indexOf('?');
    const clean = query >= 0 ? pathPart.slice(0, query) : pathPart;
    let target = f;
    if (clean) {
      target = path.resolve(path.dirname(f), clean);
      if (clean.endsWith('/')) target = path.join(target, 'index.html');
      if (!fs.existsSync(target)) { fails.push(`${rel(f)}: "${url}" does not resolve (${rel(target)})`); continue; }
      if (fs.statSync(target).isDirectory()) { fails.push(`${rel(f)}: "${url}" names a directory without a trailing slash`); continue; }
    }
    if (frag !== undefined && frag !== '' && target.endsWith('.html')) {
      const set = ids.get(target) || new Set([...mask(fs.readFileSync(target, 'utf8')).matchAll(/\sid="([^"]+)"/g)].map((x) => x[1]));
      if (!set.has(frag)) fails.push(`${rel(f)}: "${url}" — no id="${frag}" in ${rel(target)}`);
    }
  }
}

// ── 3. headings, alt text, head tags ─────────────────────────────────────
const titles = new Map();
const descs = new Map();
const icons = new Set();
for (const [f, s] of docs) {
  const hs = [...s.matchAll(/<h([1-6])\b/g)].map((m) => +m[1]);
  const h1s = hs.filter((h) => h === 1).length;
  if (h1s !== 1) fails.push(`${rel(f)}: ${h1s} h1 elements (want exactly 1)`);
  let prev = 0;
  for (const h of hs) { if (h > prev + 1) { fails.push(`${rel(f)}: heading level skips from h${prev} to h${h}`); break; } prev = h; }

  for (const m of s.matchAll(/<img\b[^>]*>/g)) if (!/\salt="/.test(m[0])) fails.push(`${rel(f)}: <img> without alt — ${m[0].slice(0, 80)}`);
  for (const m of s.matchAll(/<img\b[^>]*>/g)) if (!/\swidth="\d+"/.test(m[0]) || !/\sheight="\d+"/.test(m[0])) fails.push(`${rel(f)}: <img> without width/height — ${m[0].slice(0, 80)}`);

  const title = (s.match(/<title>([^<]*)<\/title>/) || [])[1];
  const desc = (s.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  const canon = (s.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (!title) fails.push(`${rel(f)}: no <title>`);
  if (!desc) fails.push(`${rel(f)}: no meta description`);
  if (!canon) fails.push(`${rel(f)}: no canonical`);
  if (!/<meta name="viewport"/.test(s)) fails.push(`${rel(f)}: no viewport meta`);
  if (!/<html lang="/.test(s)) fails.push(`${rel(f)}: no lang on <html>`);
  // No script owns the <head>, so the icons are checked here: every page
  // declares the same favicon and links the home-screen icon at the root.
  const icon = (s.match(/<link rel="icon" href="([^"]+)"/) || [])[1];
  if (!icon) fails.push(`${rel(f)}: no <link rel="icon">`);
  else if (icons.size && !icons.has(icon)) fails.push(`${rel(f)}: favicon differs from the other pages'`);
  else icons.add(icon);
  if (!/<link rel="apple-touch-icon" href="(?:\.\/|(?:\.\.\/)+)apple-touch-icon\.png"/.test(s)) fails.push(`${rel(f)}: no <link rel="apple-touch-icon"> to /apple-touch-icon.png`);
  if (!isNoindex(s)) {
    if (!/property="og:title"/.test(s) || !/property="og:image"/.test(s)) fails.push(`${rel(f)}: missing og:title or og:image`);
    if (title) { if (titles.has(title)) fails.push(`${rel(f)}: title duplicates ${titles.get(title)}`); titles.set(title, rel(f)); }
    if (desc) { if (descs.has(desc)) fails.push(`${rel(f)}: description duplicates ${descs.get(desc)}`); descs.set(desc, rel(f)); }
    if (title && title.length > 75) warns.push(`${rel(f)}: title is ${title.length} characters; search results cut around 60–70`);
    if (desc && desc.length > 170) warns.push(`${rel(f)}: description is ${desc.length} characters; search results cut around 155–160`);
  }

  // JSON-LD is data, not code; it still has to parse.
  for (const m of s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { fails.push(`${rel(f)}: JSON-LD does not parse — ${e.message}`); }
  }
  // The site ships no JavaScript to visitors; a script that is not JSON-LD is a regression.
  for (const m of s.matchAll(/<script\b([^>]*)>/g)) {
    if (!/type="application\/ld\+json"/.test(m[1])) fails.push(`${rel(f)}: a <script> that is not JSON-LD — the site ships no JavaScript`);
  }
  // Nor any inline style: the content-security policy refuses them.
  if (/\sstyle="/.test(s) || /<style\b/.test(s)) fails.push(`${rel(f)}: inline style — every rule belongs in assets/site.css (the CSP allows no inline styles)`);
}

// ── 4. sitemap: noindex pages out, dates real and past ───────────────────
const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
for (const [f, s] of docs) {
  const canon = (s.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (isNoindex(s) && canon && locs.includes(canon)) fails.push(`sitemap.xml: lists ${canon}, which is noindex (${rel(f)})`);
}
const today = new Date().toISOString().slice(0, 10);
for (const m of sm.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m[1]) || isNaN(Date.parse(m[1]))) fails.push(`sitemap.xml: lastmod "${m[1]}" is not a date`);
  else if (m[1] > today) fails.push(`sitemap.xml: lastmod ${m[1]} is in the future`);
}

// ── 5. placeholders: visible in the report, never silently shipped ───────
for (const f of pages) {
  const raw = fs.readFileSync(f, 'utf8');
  const n = (raw.match(/PLACEHOLDER/g) || []).length;
  if (n && !rel(f).startsWith('areas/')) warns.push(`${rel(f)}: ${n} PLACEHOLDER mark(s) — deliberate, and should stay marked until filled`);
}
const scaffolds = pages.filter((f) => rel(f).startsWith('areas/') && /UNWRITTEN/.test(docs.get(f)));
if (scaffolds.length) warns.push(`${scaffolds.length} unwritten service-area scaffold(s) under areas/ — noindex, unlinked, not in the sitemap`);

// ── report ───────────────────────────────────────────────────────────────
for (const w of warns) console.log(`  · ${w}`);
if (fails.length) {
  console.error(`\n  ✗ ${fails.length} problem(s):\n` + fails.map((x) => `    - ${x}`).join('\n'));
  process.exit(1);
}
console.log(`\n  ✓ ${pages.length} pages: links resolve, headings in order, head tags present and unique, JSON-LD parses, sitemap sound, chrome and contact details in step`);
