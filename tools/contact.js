/*
 * The single source for the three details that appear on every page: the
 * phone number, the email address and the booking link.
 *
 * The site has no build step and no includes — that is one of the four
 * constraints it is built on — so a header partial is not available. This is
 * the next best thing: the values live here once, and the script finds every
 * copy of them in the HTML and either checks or rewrites it. Changing a
 * number is one edit and one command, not thirty edits and a grep you hope
 * was complete.
 *
 *   node tools/contact.js            # check every page agrees; exit 1 if not
 *   node tools/contact.js --write    # rewrite every page to match
 *
 * To change a detail: edit CONTACT below, run --write, then commit. Dev-only;
 * it ships nothing to a visitor.
 *
 * The booking URL is a plain link, never an embedded widget — an embed would
 * be a third-party request, and the site makes none.
 */
const fs = require('fs');
const path = require('path');

const CONTACT = {
  // Digits only, as a tel: URI. Both forms below are generated from it.
  telHref: 'tel:+19492059056',
  telText: '(949) 205-9056',
  email: 'james@lernerworks.com',
  // ── PENDING: flip to /20min once the Calendly event is renamed ──────────
  // The CTA copy says "Book a 20-minute call" in twelve places, and the event
  // is still 30 minutes, so the label and the booking are out of step. The fix
  // is on Calendly's side, not here.
  //
  // This points at /30min because that is the URL that answers. /20min 404s
  // today, and a dead booking link is far worse than a label that overstates
  // the call by ten minutes — one loses the enquiry, the other mildly
  // misdescribes it.
  //
  // When the event is renamed:  change this line, run `node tools/contact.js
  // --write`, run `node tools/contact.js --check-live`, commit. That is the
  // whole job — it rewrites all forty-six links.
  booking: 'https://calendly.com/james-lernerworks/30min',
};

// Anything matching the left pattern must read as the right value.
const RULES = [
  [/tel:\+\d{10,}/g,                                CONTACT.telHref, 'phone href'],
  [/\(\d{3}\) \d{3}-\d{4}/g,                        CONTACT.telText, 'phone text'],
  [/[a-z.]+@lernerworks\.com/g,                     CONTACT.email,   'email'],
  [/https:\/\/calendly\.com\/[A-Za-z0-9-]+\/[A-Za-z0-9-]+/g, CONTACT.booking, 'booking link'],
];

const ROOT = path.join(__dirname, '..');
const WRITE = process.argv.includes('--write');
const LIVE = process.argv.includes('--check-live');

const walk = (d, out = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p, out) : e.name.endsWith('.html') && out.push(p);
  }
  return out;
};

const main = () => {
const rows = [];
let wrong = 0;
for (const f of walk(ROOT)) {
  let s = fs.readFileSync(f, 'utf8');
  const before = s;
  const counts = {};
  for (const [re, want, label] of RULES) {
    const found = s.match(re) || [];
    counts[label] = found.length;
    const bad = found.filter((x) => x !== want);
    if (bad.length) {
      wrong += bad.length;
      rows.push({ file: path.relative(ROOT, f), detail: label, found: [...new Set(bad)].join(', '), want });
      if (WRITE) s = s.replace(re, want);
    }
  }
  if (WRITE && s !== before) fs.writeFileSync(f, s);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total) console.log(`  ${String(total).padStart(3)}  ${path.relative(ROOT, f).padEnd(34)} ` +
    Object.entries(counts).filter(([, n]) => n).map(([k, n]) => `${k}:${n}`).join('  '));
}

// A booking link that 404s is the one failure here a reader would actually
// feel, and it cannot be caught by comparing files to each other.
const checkLive = async () => {
  if (!LIVE) return true;
  try {
    const r = await fetch(CONTACT.booking, { redirect: 'follow' });
    if (r.status === 200) { console.log(`\n  ✓ booking link answers 200: ${CONTACT.booking}`); return true; }
    console.error(`\n  ✗ booking link returned ${r.status}: ${CONTACT.booking}`);
    return false;
  } catch (e) {
    console.error(`\n  ✗ booking link unreachable: ${CONTACT.booking} — ${e.message}`);
    return false;
  }
};

if (!rows.length) {
  console.log(`\n  ✓ every page agrees with tools/contact.js`);
  checkLive().then((ok) => process.exit(ok ? 0 : 1));
  return;
}
console.error(`\n  ✗ ${wrong} value(s) disagree with tools/contact.js:`);
for (const r of rows) console.error(`     ${r.file}  ${r.detail}: found ${r.found}, want ${r.want}`);
if (WRITE) { console.error('\n  rewritten — re-run without --write to confirm'); process.exit(0); }
console.error('\n  run: node tools/contact.js --write');
process.exit(1);
};
main();
