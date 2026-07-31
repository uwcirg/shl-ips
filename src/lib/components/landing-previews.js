/* Landing carousel mocks — plain JS, no JSX/React.
   Every function returns an HTML string.

   Exports: miniPhone, miniQR, previewRecords, previewHome, previewNotes,
            previewShare, previewPrivacy, previewAll, MOCK_CSS

   Usage:
     document.head.insertAdjacentHTML('beforeend', '<style>' + MOCK_CSS + '</style>');
     el.innerHTML = previewRecords();

   MOCK_CSS carries only the vars + .it tile classes these mocks need, so the
   file is self-contained; drop it if you already load the prototype stylesheet. */

const MOCK_CSS = `
:root{
  --blue:#1E5AA8; --blue-2:#16467F; --blue-ink:#123A66;
  --ink:#12212E; --muted:#5B6B7C; --line:#DCE3EA;
  --summary:#1E5AA8;
  --t-blue-soft:#E4EEFA; --t-gold:#7A5B00; --t-gold-soft:#FBF0CE;
  --t-lime:#3E5E14; --t-lime-soft:#E9F3D6;
  --t-magenta:#8A2A6B; --t-magenta-soft:#F9E4F1;
  --t-coral:#9B2C2C; --coral-soft:#FBE6E4; --blue-soft:#DCE8F6;
}
.it{background:#EEF3F8;color:var(--ink);}
.it.blue{background:var(--t-blue-soft);color:var(--blue);}
.it.good{background:var(--t-lime-soft);color:var(--t-lime);}
.it.magenta{background:var(--t-magenta-soft);color:var(--t-magenta);}
`;

/* ── icons ──────────────────────────────────────────────────── */
const ICON_PATHS = {
  flask:   '<path d="M9 3v6L3 19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2L15 9V3"/><line x1="9" y1="3" x2="15" y2="3"/>',
  pill:    '<path d="M10.5 20.5L20.5 10.5a4.95 4.95 0 0 0-7-7L3.5 13.5a4.95 4.95 0 0 0 7 7Z"/><path d="M8.5 8.5l7 7"/>',
  syringe: '<path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3a1 1 0 0 1-.7.3H4l1.7-3.4a1 1 0 0 1 .3-.4L17 5"/><path d="m9 11 4 4"/>',
  steth:   '<path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/>',
  share:   '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
  plus:    '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  lock:    '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
};
function icon(name, size) {
  size = size || 18;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] || ''}</svg>`;
}
function tile(kind, name) {
  return `<span class="it ${kind}" style="width:19px;height:19px;flex:0 0 19px;border-radius:6px;display:grid;place-items:center">${icon(name, 10)}</span>`;
}
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── shell ──────────────────────────────────────────────────── */
function miniPhone(inner) {
  return `<div class="mini-phone" style="width:200px;height:220px;border-radius:22px;overflow:hidden;background:#fff;box-shadow:0 22px 48px rgba(0,0,0,.34);border:4px solid rgba(255,255,255,.28);display:flex;flex-direction:column;font-family:Inter,system-ui,sans-serif">${inner}</div>`;
}
function head(title, eyebrow, pad) {
  return `<div style="background:var(--blue);color:#fff;padding:${pad || '11px 12px'}">${eyebrow ? `<div style="font-size:8px;opacity:.82;font-weight:700;letter-spacing:.08em">${esc(eyebrow)}</div>` : ''}<div style="font-size:${eyebrow ? 13 : 12}px;font-weight:800;${eyebrow ? 'margin-top:2px' : ''}">${esc(title)}</div></div>`;
}

/* ── QR ─────────────────────────────────────────────────────── */
const QR_PATTERN = [
  1,1,1,0,1,0,1,1,1, 1,0,1,0,0,0,1,0,1, 1,1,1,0,1,0,1,1,1,
  0,0,0,1,0,1,0,0,0, 1,0,1,0,1,1,0,1,0, 0,1,0,1,0,0,1,0,1,
  1,1,1,0,1,0,1,1,1, 1,0,1,1,0,1,1,0,1, 1,1,1,0,1,0,0,1,1,
];
function miniQR() {
  const cells = QR_PATTERN
    .map(v => `<div style="background:${v ? 'var(--ink)' : 'transparent'};border-radius:1px"></div>`)
    .join('');
  return `<div style="display:grid;grid-template-columns:repeat(9,1fr);gap:0px;width:60px;height:60px">${cells}</div>`;
}

/* ── 1 · records ────────────────────────────────────────────── */
const RECORD_ROWS = [
  { t: 'Hemoglobin A1C',    s: '01/12/26 · 6.4%',      tag: 'Review',     tc: 'var(--t-gold)',    tb: 'var(--t-gold-soft)',    ic: 'flask',   k: 'blue' },
  { t: 'LDL Cholesterol',   s: '01/12/26 · 102 mg/dL', tag: 'Normal',     tc: 'var(--t-lime)',    tb: 'var(--t-lime-soft)',    ic: 'flask',   k: 'blue' },
  { t: 'Lisinopril 10 mg',  s: 'Daily · City Clinic',  tag: 'Active',     tc: 'var(--t-magenta)', tb: 'var(--t-magenta-soft)', ic: 'pill',    k: 'magenta' },
  { t: 'Influenza vaccine', s: '10/12/25',             tag: 'Up to date', tc: 'var(--t-lime)',    tb: 'var(--t-lime-soft)',    ic: 'syringe', k: 'good' },
];
function previewRecords() {
  const rows = RECORD_ROWS.map(r => `<div style="display:flex;align-items:center;gap:7px;background:#fff;border:1px solid var(--line);border-radius:8px;padding:5px 6px">${tile(r.k, r.ic)}<div style="flex:1;min-width:0"><div style="font-size:8.5px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.t)}</div><div style="font-size:7px;color:var(--muted)">${esc(r.s)}</div></div><span style="font-size:6.5px;font-weight:800;color:${r.tc};background:${r.tb};padding:2px 5px;border-radius:5px;white-space:nowrap">${esc(r.tag)}</span></div>`).join('');
  return miniPhone(
    head('Your records', 'MY HEALTH', '11px 12px 9px') +
    `<div style="padding:8px 9px;display:flex;flex-direction:column;gap:5px">${rows}</div>`
  );
}

/* ── 2 · home ───────────────────────────────────────────────── */
const HOME_CARDS = [
  { t: 'Medical history', ic: 'steth',   k: 'blue' },
  { t: 'Lab results',     ic: 'flask',   k: 'good' },
  { t: 'Medications',     ic: 'pill',    k: 'magenta' },
  { t: 'Immunizations',   ic: 'syringe', k: 'good' },
];
function previewHome() {
  const cards = HOME_CARDS.map(c => `<div style="background:#fff;border:1px solid var(--line);border-radius:8px;padding:6px 7px;display:flex;flex-direction:column;gap:4px">${tile(c.k, c.ic)}<div style="font-size:8px;font-weight:700;color:var(--ink);line-height:1.1">${esc(c.t)}</div></div>`).join('');
  return miniPhone(
    `<div style="background:var(--blue);color:#fff;padding:11px 12px 10px"><div style="font-size:12px;font-weight:800">Hi, Alex</div><div style="font-size:7.5px;opacity:.85;margin-top:1px">What would you like to do today?</div></div>` +
    `<div style="padding:8px 9px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">${cards}</div>` +
    `<div style="margin-top:5px;background:var(--summary);color:#fff;border-radius:8px;padding:6px 8px;display:flex;align-items:center;gap:6px">${icon('share', 11)}<span style="font-size:8.5px;font-weight:700">Share summary</span></div></div>`
  );
}

/* ── 3 · share ──────────────────────────────────────────────── */
function previewShare() {
  return miniPhone(
    head('Share summary') +
    `<div style="padding:10px 12px;display:flex;flex-direction:column;align-items:center">` +
      `<div style="font-size:8.5px;font-weight:800;color:var(--ink);margin-bottom:8px">Alex's Summary · 5/21/26</div>` +
      `<div style="width:76px;height:76px;border-radius:10px;background:#fff;border:1px solid var(--line);display:grid;place-items:center">${miniQR()}</div>` +
      `<div style="font-size:7.5px;color:var(--muted);margin-top:8px;text-align:center;line-height:1.4">Expires in 7 days · passcode on</div>` +
      `<div style="margin-top:8px;display:flex;gap:5px;width:100%">` +
        `<div style="flex:1;background:var(--summary);color:#fff;border-radius:6px;padding:5px 0;text-align:center;font-size:7.5px;font-weight:800">Copy link</div>` +
        `<div style="background:#fff;border:1px solid var(--line);color:var(--ink);border-radius:6px;padding:5px 9px;font-size:7.5px;font-weight:700">Print</div>` +
      `</div>` +
    `</div>`
  );
}

/* ── 4 · notes / care preferences ─────────────────────── */
const NOTE_ENTRIES = [
  { d: 'Apr 2',  tag: 'Symptom',         tc: 'var(--t-coral)',   tb: 'var(--coral-soft)',     x: 'Dizzy in the mornings this week — want to ask about it.' },
  { d: 'Mar 28', tag: 'Care preference', tc: 'var(--t-magenta)', tb: 'var(--t-magenta-soft)', x: 'Family should be with me for any big decisions.' },
];
function previewNotes() {
  const entries = NOTE_ENTRIES.map(e => `<div style="background:#fff;border:1px solid var(--line);border-radius:8px;padding:6px 7px"><div style="display:flex;align-items:center;gap:5px;margin-bottom:3px"><span style="font-size:6.5px;font-weight:700;color:var(--muted)">${esc(e.d)}</span><span style="font-size:6.5px;font-weight:800;color:${e.tc};background:${e.tb};padding:2px 5px;border-radius:5px">${esc(e.tag)}</span></div><div style="font-size:8px;color:var(--ink);line-height:1.35">${esc(e.x)}</div></div>`).join('');
  return miniPhone(
    head('Your health story', 'MY NOTES', '11px 12px 9px') +
    `<div style="padding:8px 9px;display:flex;flex-direction:column;gap:5px">${entries}` +
      `<div style="display:flex;align-items:center;gap:6px;background:var(--t-blue-soft);border:1px solid var(--blue-soft);border-radius:8px;padding:6px 7px">${tile('blue', 'plus')}<div style="font-size:8px;font-weight:700;color:var(--blue-ink)">Add a note or missing record</div></div>` +
    `</div>`
  );
}

/* ── 5 · privacy ────────────────────────────────────────────── */
const PARTNER_LOGOS = ['images/partner-doh.png', 'images/partner-hca.png'];
function previewPrivacy() {
  const logos = PARTNER_LOGOS.map(src => `<div style="background:#fff;border:1px solid var(--line);border-radius:7px;height:44px;display:flex;align-items:center;justify-content:center;padding:5px 7px"><img src="${esc(src)}" alt="" style="max-width:100%;max-height:100%"></div>`).join('');
  return miniPhone(
    head('Your data stays yours', 'PRIVACY & TRUST') +
    `<div style="padding:10px 11px;display:flex;flex-direction:column;gap:8px">` +
      `<div style="display:flex;align-items:center;gap:7px;background:var(--t-blue-soft);border-radius:8px;padding:7px 8px">${tile('blue', 'lock')}<div style="font-size:8px;font-weight:600;color:var(--blue-ink);line-height:1.3">Nothing is shared until you choose to share it.</div></div>` +
      `<div style="font-size:6.5px;font-weight:800;color:var(--muted);letter-spacing:.08em;text-transform:uppercase">Brought to you by</div>` +
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${logos}</div>` +
    `</div>`
  );
}

/* ── all four, side by side ─────────────────────────────────── */
function previewAll() {
  const items = [
    ['1 · Records', previewRecords()],
    ['2 · Home',    previewHome()],
    ['3 · Notes',   previewNotes()],
    ['4 · Share',   previewShare()],
    ['5 · Privacy', previewPrivacy()],
  ];
  return `<div style="display:grid;grid-template-columns:repeat(3,max-content);gap:28px;justify-content:center;align-items:start;font-family:Inter,system-ui,sans-serif">${
    items.map(([cap, html]) => `<div style="display:flex;flex-direction:column;align-items:center;gap:12px"><div style="font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">${esc(cap)}</div>${html}</div>`).join('')
  }</div>`;
}

export {
  MOCK_CSS,
  icon,
  miniPhone,
  miniQR,
  previewRecords,
  previewHome,
  previewNotes,
  previewShare,
  previewPrivacy,
  previewAll,
};

if (typeof window !== 'undefined') {
  Object.assign(window, { MOCK_CSS, icon, miniPhone, miniQR, previewRecords, previewHome, previewNotes, previewShare, previewPrivacy, previewAll });
}
if (typeof module !== 'undefined') {
  module.exports = { MOCK_CSS, icon, miniPhone, miniQR, previewRecords, previewHome, previewNotes, previewShare, previewPrivacy, previewAll };
}
