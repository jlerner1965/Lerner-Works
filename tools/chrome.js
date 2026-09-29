/*
 * The shared chrome — the nav at the top of every page and the footer grid
 * at the bottom — from one source.
 *
 * The site has no build step and no includes, so those two blocks are copied
 * into every page, and copies drift: before this existed the footer's
 * service-area line had two wordings on the site at once. This script owns
 * both blocks. It renders them for each page (the relative prefix for its
 * depth, aria-current for its section, the contact details from
 * tools/contact.js) and either checks that every page carries exactly that
 * markup or rewrites it to.
 *
 *   node tools/chrome.js            # check every page; exit 1 if any differs
 *   node tools/chrome.js --write    # rewrite the nav and footer grid on every page
 *
 * To change the nav or the footer grid: edit the templates below, run
 * --write, commit. One edit and one command.
 *
 * What it does not own: the "Next step" heading and lede above the footer
 * grid, which are written per page on purpose, and everything inside <main>.
 * Dev-only; it ships nothing to a visitor.
 */
const fs = require('fs');
const path = require('path');
const { CONTACT } = require('./contact.js');

const ROOT = path.join(__dirname, '..');
const WRITE = process.argv.includes('--write');

// The year in the copyright line. A constant rather than the clock, so the
// check does not start failing at midnight on 1 January; bump it and --write.
const YEAR = 2026;

// Which nav item a page lights up, by its top-level directory.
const SECTIONS = { work: 'Work', services: 'Services', about: 'About', contact: 'Contact' };

const walk = (d, out = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p, out) : e.name.endsWith('.html') && out.push(p);
  }
  return out;
};

const nav = (P, section) => {
  const cur = (s) => (section === s ? ' aria-current="page"' : '');
  return `<nav class="nav" id="top" aria-label="Main">
  <div class="wrap nav__in">
    <a class="brand" href="${P}">Lerner Works<small>Web design &amp; marketing · Boulder County</small></a>
    <div class="nav__links">
      <a href="${P}work/"${cur('work')}>Work</a>
      <a href="${P}services/"${cur('services')}>Services</a>
      <a href="${P}about/"${cur('about')}>About</a>
      <a href="${P}contact/"${cur('contact')}>Contact</a>
      <a class="nav__tel" href="${CONTACT.telHref}">${CONTACT.telText}</a>
      <a class="btn btn--go" href="${CONTACT.booking}">Book a call</a>
    </div>
    <details class="menu">
      <summary><span class="menu__bars" aria-hidden="true"></span>Menu</summary>
      <div class="menu__panel">
        <a href="${P}work/"${cur('work')}>Work</a>
        <a href="${P}services/"${cur('services')}>Services</a>
        <a href="${P}about/"${cur('about')}>About</a>
        <a href="${P}contact/"${cur('contact')}>Contact</a>
        <hr />
        <a href="${CONTACT.telHref}">Call ${CONTACT.telText}</a>
        <a href="mailto:${CONTACT.email}">${CONTACT.email}</a>
        <a class="btn btn--go" href="${CONTACT.booking}">Book a call</a>
      </div>
    </details>
  </div>
</nav>`;
};

const foot = (P) => `    <div class="foot">
      <div>
        <p class="foot__brand">Lerner Works</p>
        <p>Web design and marketing for small businesses in Boulder County. One person, start to finish.</p>
      </div>
      <div>
        <p class="foot__h">Site</p>
        <ul>
          <li><a href="${P}work/">Work</a></li>
          <li><a href="${P}services/">Services &amp; pricing</a></li>
          <li><a href="${P}about/">About</a></li>
          <li><a href="${P}contact/">Contact</a></li>
        </ul>
      </div>
      <div>
        <p class="foot__h">Contact</p>
        <ul>
          <li><a href="${CONTACT.telHref}">${CONTACT.telText}</a></li>
          <li><a href="mailto:${CONTACT.email}">${CONTACT.email}</a></li>
          <li><a href="${CONTACT.booking}">Book a call</a></li>
        </ul>
      </div>
      <div>
        <p class="foot__h">Service area</p>
        <p>Based in Niwot, providing <a href="${P}boulder-county-web-design/">web design across Boulder County</a>, including Boulder, Longmont, Louisville, Lafayette and Erie. Further afield by video call.</p>
      </div>
    </div>
    <div class="foot__bar">
      <span>© ${YEAR} Lerner Works · James Lerner · Niwot, Colorado</span>
      <span><a href="#top">Back to top</a></span>
    </div>`;

// The two blocks as they sit in a page. The footer regex stops at the first
// </div> after the bar opens, which is the bar's own: it holds only spans.
const NAV_RE = /<nav class="nav" id="top" aria-label="Main">[\s\S]*?<\/nav>/;
const FOOT_RE = /    <div class="foot">[\s\S]*?<div class="foot__bar">[\s\S]*?<\/div>/;

const pages = walk(ROOT)
  .map((f) => path.relative(ROOT, f).replace(/\\/g, '/'))
  .filter((f) => !f.startsWith('assets/'))   // the OG card template is not a page
  .sort();

const drift = [];
for (const rel of pages) {
  const abs = path.join(ROOT, rel);
  const s = fs.readFileSync(abs, 'utf8');
  const depth = rel.split('/').length - 1;
  const P = depth === 0 ? './' : '../'.repeat(depth);
  const section = SECTIONS[rel.split('/')[0]] ? rel.split('/')[0] : null;

  const wantNav = nav(P, section);
  const wantFoot = foot(P);
  const haveNav = (s.match(NAV_RE) || [])[0];
  const haveFoot = (s.match(FOOT_RE) || [])[0];
  if (!haveNav) { drift.push(`${rel}: no nav block found`); continue; }
  if (!haveFoot) { drift.push(`${rel}: no footer grid found`); continue; }

  const parts = [];
  if (haveNav !== wantNav) parts.push('nav');
  if (haveFoot !== wantFoot) parts.push('footer');
  if (!parts.length) continue;
  drift.push(`${rel}: ${parts.join(' and ')} differ${parts.length === 1 ? 's' : ''}`);
  if (WRITE) fs.writeFileSync(abs, s.replace(NAV_RE, wantNav).replace(FOOT_RE, wantFoot));
}

if (!drift.length) {
  console.log(`  ✓ nav and footer are identical on all ${pages.length} pages`);
  process.exit(0);
}
if (WRITE) {
  console.log(`  rewrote ${drift.length} page(s):\n     ` + drift.join('\n     '));
  console.log('\n  re-run without --write to confirm');
  process.exit(0);
}
console.error(`  ✗ ${drift.length} page(s) differ from tools/chrome.js:\n     ` + drift.join('\n     '));
console.error('\n  run: node tools/chrome.js --write');
process.exit(1);
