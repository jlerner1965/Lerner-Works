/*
 * The shared chrome — the nav at the top of every page, the footer grid
 * at the bottom, and the favicon in the <head> — from one source.
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
 * --write, commit. One edit and one command. To change the logo: replace
 * assets/brand/lw-mark.svg (same viewBox, one <path>, one <rect>) and run
 * --write; the nav mark and the favicon are both drawn from it.
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

// The logo mark beside the name in the nav: the "LW." monogram, traced from
// the supplied logo (assets/brand/lw-logo-source.jpg) into
// assets/brand/lw-mark.svg. The path is read from that file, so the master
// and the nav cannot drift. Inline rather than an <img>, so it costs no
// request; coloured by class in site.css, because the content-security policy
// forbids inline styles. aria-hidden: the link's text already says the name.
const MARK_SVG = fs.readFileSync(path.join(ROOT, 'assets', 'brand', 'lw-mark.svg'), 'utf8');
const MARK_D = MARK_SVG.match(/<path[^>]* d="([^"]+)"/)[1];
const MARK_DOT = MARK_SVG.match(/<rect[^>]*?( x="[^"]+" y="[^"]+" width="[^"]+" height="[^"]+" rx="[^"]+")/)[1];
const MARK = `<svg class="brand__mark" viewBox="0 0 893 450" aria-hidden="true" focusable="false"><path class="brand__ink" d="${MARK_D}"/><rect class="brand__dot"${MARK_DOT}/></svg>`;

// The favicon: the same mark on a white rounded tile, as a data: URI so it is
// not a request (the content-security policy allows data: images for exactly
// this). Colours are the logo's own, as attributes: a favicon cannot read
// site.css. Encoded the way the browser needs and no further, so it stays
// readable in the source.
const FAVICON_SVG = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>"
  + "<rect width='64' height='64' rx='10' fill='#fff'/>"
  + "<svg x='4' y='17.9' width='56' height='28.2' viewBox='0 0 893 450'>"
  + `<path fill='#0D2C43' d='${MARK_D}'/><rect fill='#019673'${MARK_DOT.replace(/"/g, "'")}/></svg></svg>`;
const FAVICON = `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(FAVICON_SVG).replace(/%27/g, "'").replace(/%3D/g, '=').replace(/%2F/g, '/').replace(/%3A/g, ':')}" />`;

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
    <a class="brand" href="${P}">${MARK}<span>Lerner Works<small>Web design &amp; marketing<span class="brand__sep"> · </span>Boulder County</small></span></a>
    <div class="nav__links">
      <a href="${P}work/"${cur('work')}>Work</a>
      <a href="${P}services/"${cur('services')}>Services</a>
      <a href="${P}about/"${cur('about')}>About</a>
      <a href="${P}contact/"${cur('contact')}>Contact</a>
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
const ICON_RE = /<link rel="icon" href="data:image\/svg\+xml,[^"]*" \/>/;

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
  const haveIcon = (s.match(ICON_RE) || [])[0];
  if (!haveNav) { drift.push(`${rel}: no nav block found`); continue; }
  if (!haveFoot) { drift.push(`${rel}: no footer grid found`); continue; }
  if (!haveIcon) { drift.push(`${rel}: no data: favicon found`); continue; }

  const parts = [];
  if (haveNav !== wantNav) parts.push('nav');
  if (haveFoot !== wantFoot) parts.push('footer');
  if (haveIcon !== FAVICON) parts.push('favicon');
  if (!parts.length) continue;
  drift.push(`${rel}: ${parts.join(' and ')} differ${parts.length === 1 ? 's' : ''}`);
  if (WRITE) fs.writeFileSync(abs, s.replace(NAV_RE, wantNav).replace(FOOT_RE, wantFoot).replace(ICON_RE, () => FAVICON));
}

if (!drift.length) {
  console.log(`  ✓ nav, footer and favicon are identical on all ${pages.length} pages`);
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
