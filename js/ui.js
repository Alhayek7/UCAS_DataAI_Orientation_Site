// أدوات واجهة مشتركة
import { icon } from './icons.js';
import { LEVELS, BADGES, TEAMS } from './content.js';
export { icon };

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const html = (strings, ...vals) => strings.reduce((a, s, i) => a + s + (i < vals.length ? vals[i] : ''), '');
/** يحيط الأجزاء الإنجليزية بـ bdi لتبقى سليمة داخل النص العربي */
export const en = (t) => `<bdi class="en">${esc(t)}</bdi>`;
export const nf = (n) => new Intl.NumberFormat('en-US').format(n);
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export function levelOf(xp) { let i = 0; LEVELS.forEach((l, k) => { if (xp >= l.xp) i = k; }); const cur = LEVELS[i], nxt = LEVELS[i + 1]; return { i, cur, nxt, pct: nxt ? Math.min(100, Math.round(((xp - cur.xp) / (nxt.xp - cur.xp)) * 100)) : 100, need: nxt ? nxt.xp - xp : 0 }; }

/** الشارات تُحسب من الإحصاءات (لا تحتاج جدولًا) */
export function earnedBadges(me, extra = {}) {
  const e = new Set();
  if (!me) return e;
  if (me.answered_count >= 1) e.add('first');
  if (me.correct_count >= 5) e.add('sharp');
  if ((me.best_streak || 0) >= 3) e.add('streak3');
  if ((me.best_streak || 0) >= 6) e.add('streak6');
  for (const k of ['idea', 'voter', 'curious', 'explorer', 'critic', 'finisher']) if (extra[k]) e.add(k);
  return e;
}

export function toast(msg, kind = '') {
  let box = $('#toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg; box.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in')); setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, 2600);
}

export function countUp(el, to, { dur = 900, from = 0, fmt = nf, pre = '', suf = '' } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = pre + fmt(to) + suf; return; }
  const t0 = performance.now(); const step = (t) => { const k = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - k, 3); el.textContent = pre + fmt(Math.round(from + (to - from) * e)) + suf; if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step);
}

// ---------- confetti ----------
let cf;
export function confetti(n = 120, origin = { x: 0.5, y: 0.35 }) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!cf) { cf = document.createElement('canvas'); cf.id = 'confetti'; document.body.appendChild(cf); cf.ctx = cf.getContext('2d'); cf.parts = []; }
  const fit = () => { cf.width = innerWidth * devicePixelRatio; cf.height = innerHeight * devicePixelRatio; }; if (cf.width !== innerWidth * devicePixelRatio) fit();
  const cols = ['#2F6BFF', '#7ED321', '#F2A900', '#FFFFFF', '#FF5C7A', '#6A5CFF'];
  for (let i = 0; i < n; i++) cf.parts.push({ x: origin.x * cf.width, y: origin.y * cf.height, vx: (Math.random() - 0.5) * 16 * devicePixelRatio, vy: (-Math.random() * 14 - 4) * devicePixelRatio, g: 0.38 * devicePixelRatio, s: (5 + Math.random() * 7) * devicePixelRatio, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[i % cols.length], life: 1 });
  if (!cf.run) { cf.run = true; const loop = () => { const g = cf.ctx; g.clearRect(0, 0, cf.width, cf.height); cf.parts = cf.parts.filter(p => p.life > 0 && p.y < cf.height + 40); cf.parts.forEach(p => { p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.992; p.r += p.vr; p.life -= 0.005; g.save(); g.globalAlpha = Math.max(0, p.life); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.6); g.restore(); }); if (cf.parts.length) requestAnimationFrame(loop); else { cf.run = false; g.clearRect(0, 0, cf.width, cf.height); } }; requestAnimationFrame(loop); }
}

// ---------- QR ----------
export async function qrSvg(text, size = 220) {
  const qrcode = window.qrcode; if (!qrcode) return '';
  const q = qrcode(0, 'M'); q.addData(text); q.make(); const n = q.getModuleCount(); const cell = size / (n + 4); let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${((c + 2) * cell).toFixed(2)} ${((r + 2) * cell).toFixed(2)}h${cell.toFixed(2)}v${cell.toFixed(2)}h-${cell.toFixed(2)}z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="QR"><rect width="100%" height="100%" rx="${size * 0.05}" fill="#fff"/><path d="${d}" fill="#0A2A6B"/></svg>`;
}
export function joinUrl() {
  const base = (location.origin + location.pathname).replace(/present\.html$/, '').replace(/[^/]*$/, (m) => (m.endsWith('.html') ? '' : m));
  const p = new URLSearchParams(location.search); const keep = new URLSearchParams(); if (p.get('demo')) keep.set('demo', '1'); if (p.get('s')) keep.set('s', p.get('s'));
  return base + (keep.toString() ? '?' + keep : '');
}

export function teamChip(team) { const t = TEAMS[team]; return t ? `<span class="tchip ${team}">${icon(t.icon, 14)}${t.short}</span>` : ''; }
export function badgeHtml(b, on) { return `<div class="bdg ${on ? 'on' : ''}" title="${esc(b.desc)}">${icon(b.icon, 22)}<b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`; }
export { BADGES, LEVELS, TEAMS };

/** عدّاد تنازلي يعيد دالة إيقاف. ends: ISO | ms */
export function countdown(endsAt, offset, cb, tickMs = 200) {
  const end = typeof endsAt === 'number' ? endsAt : new Date(endsAt).getTime(); let on = true;
  const tick = () => { if (!on) return; const left = Math.max(0, end - (Date.now() + (offset || 0))); cb(left); if (left > 0) setTimeout(tick, tickMs); }; tick();
  return () => { on = false; };
}
export const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

// ---------- reactions (floating emoji) ----------
export function floatReaction(layer, emoji, left) {
  const el = document.createElement('div'); el.className = 'float-react'; el.textContent = emoji; el.style.left = (left ?? (10 + Math.random() * 80)) + '%'; el.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px'); layer.appendChild(el); setTimeout(() => el.remove(), 3200);
}
