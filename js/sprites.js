// sprites.js — toda a arte do jogo é gerada aqui, em código (pixel art procedural original).
// Puro: não usa DOM. Cada função devolve um Pix (buffer de pixels).
import { Pix, hex, rgba, mix, withAlpha, outlineOf, rng, hash2 } from './gfx.js';
import { GENOMES } from './gen.js';
import { MYTH_GENOMES } from './myth.js';
import { mythCreature } from './mythart.js';

const H = (...a) => a.map(c => hex(c));
const EYE = hex('#2a1630');
const WHITE = hex('#ffffff');
const EYE_SHINE = hex('#8f7bc4');
const BLUSH = hex('#ff7d92', 190);
const TONGUE = hex('#ff8a9a');

// ---------- formas ----------
export function tear(tx, ty, bx, by, r, pow = 1) {
  const ax = bx - tx, ay = by - ty, L = Math.hypot(ax, ay), ux = ax / L, uy = ay / L;
  return (x, y) => {
    if ((x - bx) ** 2 + (y - by) ** 2 <= r * r) return true;
    const px = x - tx, py = y - ty, along = px * ux + py * uy;
    if (along < 0 || along > L) return false;
    return Math.abs(-px * uy + py * ux) <= r * Math.pow(along / L, pow);
  };
}
function rotEl(cx, cy, rx, ry, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return (x, y) => { const dx = x - cx, dy = y - cy, u = dx * c + dy * s, v = -dx * s + dy * c; return (u / rx) ** 2 + (v / ry) ** 2 <= 1; };
}
function tri(ax, ay, bx, by, cx, cy) {
  const s = (px, py, x1, y1, x2, y2) => (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
  return (x, y) => {
    const d1 = s(x, y, ax, ay, bx, by), d2 = s(x, y, bx, by, cx, cy), d3 = s(x, y, cx, cy, ax, ay);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  };
}
const elT = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const or = (...fs) => (x, y) => fs.some(f => f(x, y));

// ---------- rosto genérico ----------
function eye(p, x, y, w, h, expr, col, side) {
  const c = col || EYE;
  if (expr === 'happy') {
    const m = y + Math.floor(h / 2);
    for (let i = 1; i < w - 1; i++) { p.set(x + i, m - 1, c); }
    p.set(x, m, c); p.set(x + w - 1, m, c); p.set(x, m + 1, c); p.set(x + w - 1, m + 1, c);
    return;
  }
  if (expr === 'closed' || expr === 'blink' || expr === 'sleep') {
    const m = y + h - 2;
    for (let i = 1; i < w - 1; i++) p.set(x + i, m, c);
    p.set(x, m - 1, c); p.set(x + w - 1, m - 1, c);
    return;
  }
  if (expr === 'hurt') { // > <
    const m = y + Math.floor(h / 2);
    const pts = [[0, -2], [1, -1], [2, 0], [1, 1], [0, 2]];
    for (const [dx, dy] of pts) { const px = side < 0 ? x + dx : x + w - 1 - dx; p.set(px, m + dy, c); p.set(px + (side < 0 ? 1 : -1), m + dy, c); }
    return;
  }
  // aberto (padrão) — oval escuro com brilho
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const corner = (j === 0 || j === h - 1) && (i === 0 || i === w - 1);
    if (!corner) p.set(x + i, y + j, c);
  }
  if (expr === 'sad') { for (let i = 0; i < w; i++) p.set(x + i, y, 0); p.set(side < 0 ? x + w - 1 : x, y + 1, 0); }
  if (expr === 'determined') { p.set(side < 0 ? x : x + w - 1, y, 0); p.set(side < 0 ? x : x + w - 1, y + 1, 0); }
  const hx = x + 1, hy = expr === 'sad' ? y + 2 : y + 1;
  p.set(hx, hy, WHITE); if (w >= 4) p.set(hx + 1, hy, WHITE); if (h >= 5) { p.set(hx, hy + 1, WHITE); if (w >= 4) p.set(hx + 1, hy + 1, WHITE); }
  if (w >= 4 && h >= 5) p.set(x + w - 2, y + h - 2, EYE_SHINE);
}
function mouth(p, cx, y, kind) {
  const c = EYE;
  if (kind === 'none') return;
  if (kind === 'cat') { p.set(cx - 3, y, c); p.set(cx - 2, y + 1, c); p.set(cx - 1, y, c); p.set(cx, y, c); p.set(cx + 1, y + 1, c); p.set(cx + 2, y, c); return; }
  if (kind === 'open') { p.rect(cx - 2, y, 4, 1, c); p.set(cx - 2, y + 1, c); p.set(cx + 1, y + 1, c); p.set(cx - 1, y + 1, TONGUE); p.set(cx, y + 1, TONGUE); p.rect(cx - 1, y + 2, 2, 1, c); return; }
  if (kind === 'frown') { p.set(cx - 2, y + 1, c); p.set(cx - 1, y, c); p.set(cx, y, c); p.set(cx + 1, y + 1, c); return; }
  if (kind === 'o') { p.rect(cx - 1, y, 2, 2, c); return; }
  if (kind === 'fang') { p.set(cx - 2, y, c); p.set(cx - 1, y + 1, c); p.set(cx, y + 1, c); p.set(cx + 1, y, c); p.set(cx, y + 2, WHITE); return; }
  // sorriso
  p.set(cx - 2, y, c); p.set(cx - 1, y + 1, c); p.set(cx, y + 1, c); p.set(cx + 1, y, c);
}
function face(p, f, expr) {
  const L = f.ex, R = 48 - f.ex - f.ew;
  const e = expr === 'neutral' ? (f.base || 'open') : expr;
  eye(p, L, f.ey, f.ew, f.eh, e, f.eyeColor, -1);
  eye(p, R, f.ey, f.ew, f.eh, e, f.eyeColor, 1);
  if (f.blushY != null && e !== 'hurt') for (let i = 0; i < 3; i++) { p.blend(L - 3 + i, f.blushY, BLUSH); p.blend(R + f.ew + i, f.blushY, BLUSH); }
  let m = f.mouth || 'smile';
  if (e === 'happy') m = 'open'; else if (e === 'sad') m = 'frown'; else if (e === 'hurt') m = 'o'; else if (e === 'sleep') m = 'o';
  if (f.mouth === 'none' && e !== 'happy') m = 'none';
  mouth(p, 24, f.my, m);
}

// ---------- criaturas (48×48) ----------
const FLAME = H('#fffbe6', '#ffe58a', '#ffbe55', '#ff8f3a', '#ef5f2f');
const WISPFLAME = H('#effcff', '#a9e8ff', '#ffe58a', '#ffa646', '#ef5f2f');

const SPECIES_ART = {
  pirilim: {
    face: { ex: 17, ey: 26, ew: 4, eh: 5, my: 33, blushY: 32 },
    draw(p, fr) {
      const s = fr ? 1 : -1;
      const body = H('#fff6d5', '#ffd66b', '#ffab45', '#ee7433');
      p.glow(29, 40, 5, 5, FLAME, tear(35 + s, 46, 29, 39, 3.6, 0.9));
      p.glow(19, 40, 5, 5, FLAME, tear(15 + s, 45, 19, 39, 3.2, 0.9));
      p.ball(24, 29, 13, 12, body);
      p.ball(11, 31, 2.8, 2.2, body); p.ball(37, 31, 2.8, 2.2, body);
      p.glow(24, 13, 7, 11, FLAME, tear(24 + s * 1.5, 3, 24, 19, 6.5, 0.85));
      p.glow(14, 14, 5, 7, FLAME, tear(12 + s, 9, 16, 18, 3.6, 0.9));
      p.glow(34, 14, 5, 7, FLAME, tear(36 + s, 9, 32, 18, 3.6, 0.9));
    },
  },
  pirilume: {
    face: { ex: 16, ey: 26, ew: 5, eh: 6, my: 34, blushY: 33, mouth: 'fang', base: 'determined' },
    draw(p, fr) {
      const s = fr ? 1 : -1;
      const gold = hex('#ffe08a'), goldD = hex('#d9a441');
      // auréola (anel de lanterna) atrás
      p.fill((x, y) => { const r = ((x - 24) / 14) ** 2 + ((y - 7) / 3.4) ** 2; return r <= 1 && r >= 0.42; }, (x, y) => y < 7 ? gold : goldD);
      const body = H('#fff6d5', '#ffcf5c', '#ff9a3c', '#e2553a');
      p.glow(33, 40, 7, 7, WISPFLAME, tear(41 + s, 46, 32, 38, 4.4, 0.9));
      p.glow(15, 40, 7, 7, WISPFLAME, tear(8 + s, 45, 16, 38, 3.8, 0.9));
      p.glow(8, 27, 9, 7, WISPFLAME, tear(2, 18 + s, 10, 29, 4, 0.8));
      p.glow(40, 27, 9, 7, WISPFLAME, tear(46, 18 + s, 38, 29, 4, 0.8));
      p.ball(24, 29, 15, 13.5, body);
      p.glow(24, 10, 8, 15, WISPFLAME, tear(24 + s * 1.5, 1, 24, 18, 7.5, 0.8));
      p.glow(13, 10, 6, 10, WISPFLAME, tear(11 + s, 5, 16, 17, 4.6, 0.85));
      p.glow(35, 10, 6, 10, WISPFLAME, tear(37 + s, 5, 32, 17, 4.6, 0.85));
    },
    after(p) { // marca de fogo-fátuo na testa
      const b = hex('#8fe3ff'), w = hex('#e8fbff');
      p.set(23, 20, b); p.set(24, 20, b); p.set(22, 21, b); p.set(23, 21, w); p.set(24, 21, w); p.set(25, 21, b); p.set(23, 22, b); p.set(24, 22, b);
    },
  },
  musgolim: {
    face: { ex: 18, ey: 31, ew: 3, eh: 4, my: 36, blushY: 35, mouth: 'cat' },
    draw(p) {
      const moss = H('#e3f7a3', '#a5d65e', '#68a843', '#3f7a35');
      const wood = H('#fff1d2', '#f1cf98', '#d6a86e', '#a87a4a');
      const leaf = H('#d4f78a', '#86cf52', '#4f9e3b', '#2f6b2c');
      const bark = H('#c58e5e', '#9c6a42', '#7a4f31', '#5a3824');
      p.ball(17, 42.5, 4.2, 2.6, bark); p.ball(31, 42.5, 4.2, 2.6, bark);
      p.ball(24, 32, 14, 11.5, moss);
      // textura de musgo
      const r = rng(7);
      for (let i = 0; i < 26; i++) { const x = 11 + r() * 26, y = 22 + r() * 9; if (p.get(x, y) >>> 24) p.set(x, y, r() > 0.5 ? moss[0] : moss[2]); }
      p.ball(24, 34, 9.5, 6.5, wood);
      p.ball(18, 14, 7.5, 3.6, leaf, rotEl(18, 14, 7.5, 3.4, -0.45));
      p.ball(30.5, 12, 8.5, 3.9, leaf, rotEl(30.5, 12, 8.5, 3.8, 0.5));
      p.line(14, 16, 21, 13, leaf[2]); p.line(27, 9, 34, 14, leaf[2]);
      p.rect(23, 15, 2, 7, hex('#4f9e3b')); p.rect(23, 15, 1, 6, hex('#86cf52'));
      // cogumelinho
      const cap = H('#ffb59a', '#f2694d', '#c94436', '#9a2f2b');
      p.rect(34, 23, 3, 3, hex('#f5ead2')); p.rect(36, 23, 1, 3, hex('#d6c7a6'));
      p.ball(35.5, 23, 5, 3.6, cap, (x, y) => ((x - 35.5) / 5) ** 2 + ((y - 23) / 3.6) ** 2 <= 1 && y < 23.5);
      p.set(34, 21, WHITE); p.set(37, 22, WHITE);
    },
  },
  gotelha: {
    face: { ex: 16, ey: 27, ew: 5, eh: 6, my: 35, blushY: 34 },
    draw(p, fr) {
      const s = fr ? 1 : 0;
      const water = H('#effdff', '#a6e6ff', '#5bb8f5', '#3478d1');
      const fin = H('#c9f1ff', '#62b5f0', '#3a84d6', '#285fb0');
      p.ball(9, 26, 6, 6, fin, tri(14, 22, 3 - s, 17, 13, 33));
      p.ball(39, 26, 6, 6, fin, tri(34, 22, 45 + s, 17, 35, 33));
      p.ball(24, 28, 14, 17, water, tear(29 + s, 4, 24, 31, 13, 0.95));
      p.ball(24, 37, 9, 6, H('#ffffff', '#dff7ff', '#bdeeff', '#9adcff'));
      // cachinho de onda na ponta
      p.set(30 + s, 5, water[0]); p.set(31 + s, 6, water[0]); p.set(31 + s, 7, water[1]);
      // rodapé de ondinhas
      for (let x = 13; x < 36; x++) { if (p.get(x, 43) >>> 24 && (x + fr) % 4 === 0) p.set(x, 43, water[1]); }
    },
  },
  brumito: {
    face: { ex: 16, ey: 23, ew: 4, eh: 5, my: 30, blushY: 29, mouth: 'cat', eyeColor: hex('#2f2160') },
    draw(p, fr) {
      const mist = H('#fbf7ff', '#ddd0ff', '#ad96f2', '#7d63cf');
      const inner = hex('#ffb3d1');
      p.ball(13, 13, 5, 6, mist, tri(10, 19, 13, 4, 21, 13));
      p.ball(35, 13, 5, 6, mist, tri(38, 19, 35, 4, 27, 13));
      p.fill(tri(12.5, 15, 13.5, 8, 17.5, 13), inner); p.fill(tri(35.5, 15, 34.5, 8, 30.5, 13), inner);
      const ph = fr ? Math.PI : 0;
      const bottom = (x) => 40 + 2.5 * Math.cos((x - 10) * Math.PI / 4.67 + ph);
      const shape = (x, y) => (y <= 24 ? ((x - 24) / 14) ** 2 + ((y - 24) / 14) ** 2 <= 1 : (Math.abs(x - 24) <= 14 - (y - 24) * 0.12 && y <= bottom(x)));
      p.ball(24, 26, 14, 16, mist, shape);
      // braços de névoa
      p.ball(9, 31, 3.2, 2.4, mist); p.ball(39, 31, 3.2, 2.4, mist);
    },
    post(p) { // fade fantasma embaixo (depois do contorno)
      for (let y = 36; y < 48; y++) for (let x = 0; x < 48; x++) {
        const c = p.get(x, y); if (c >>> 24) p.set(x, y, withAlpha(c, y > 40 ? 140 : 210));
      }
    },
    after(p) { // lua crescente na testa
      const g = hex('#ffe9a3'), g2 = hex('#ffd36b');
      p.set(23, 14, g); p.set(22, 15, g); p.set(22, 16, g2); p.set(23, 17, g2); p.set(24, 17, g2);
    },
  },
  pedrusco: {
    face: { ex: 16, ey: 28, ew: 4, eh: 3, my: 0, mouth: 'none', eyeColor: hex('#1c4a44') },
    draw(p) {
      const stone = H('#f0ede3', '#c7bfac', '#968c7a', '#665e52');
      const moss = H('#b5e67a', '#7fbf4f', '#5a9a3a', '#3f7330');
      p.ball(17, 42, 4.6, 3, stone); p.ball(31, 42, 4.6, 3, stone);
      const shape = or(elT(24, 32, 15.5, 11), elT(20.5, 22.5, 10.5, 8), elT(31, 24, 7.5, 6.5));
      p.ball(24, 28, 17, 16, stone, shape);
      // musgo no topo
      for (let x = 10; x < 39; x++) {
        let top = -1; for (let y = 0; y < 48; y++) if (p.get(x, y) >>> 24) { top = y; break; }
        if (top < 0) continue;
        const depth = 2 + Math.round(2.4 * Math.sin(x * 0.7) + hash2(x, 3) * 2);
        for (let k = 0; k < depth; k++) p.set(x, top + k, k === 0 ? moss[0] : k < depth - 1 ? moss[1] : moss[2]);
      }
      // rachaduras
      const crack = hex('#5a5347');
      p.line(13, 30, 15, 34, crack); p.line(15, 34, 14, 37, crack); p.line(34, 31, 32, 36, crack);
      // runa luminosa
      const rune = hex('#62e8cc'), runeL = hex('#d9fff6');
      p.fill((x, y) => { const d = Math.hypot(x - 24, y - 36); return d <= 4.2 && d >= 3; }, rune);
      p.set(23, 35, runeL); p.set(24, 36, runeL); p.set(23, 36, rune); p.set(24, 35, rune);
    },
    after(p, expr) {
      if (expr === 'neutral' || expr === 'open' || expr === 'determined') {
        // olhos de fenda brilhantes
        const g = hex('#7cf5d8'), w = hex('#e9fffa');
        for (const x of [16, 28]) { p.rect(x, 28, 4, 2, g); p.set(x + 1, 28, w); }
      }
    },
  },
};


// ---------- novas espécies ----------
const feet2 = (p, ramp, y = 42.5, dx = 7, r = 4.2) => { p.ball(24 - dx, y, r, 2.6, ramp); p.ball(24 + dx, y, r, 2.6, ramp); };
const crystalT = (cx, by, h, w) => (x, y) => y <= by && y >= by - h && Math.abs(x - cx) <= w * Math.min(1, (y - (by - h)) / (h * 0.4));
const BLOSSOM4 = H('#ffe0f0', '#ffaed6', '#f17fb8', '#cc5c96');
Object.assign(SPECIES_ART, {
  bolhim: {
    face: { ex: 17, ey: 27, ew: 4, eh: 5, my: 33, blushY: 32, mouth: 'cat' },
    draw(p, fr) {
      const W = H('#e6fffb', '#8fe3e0', '#4fbcc4', '#2f86a0'), B = H('#ffffff', '#f2fbff', '#d6eef5', '#b5d8e6');
      p.glow(39, 38, 7, 5, H('#d8fffb', '#8fe3e0', '#4fbcc4', '#2f86a0'), tear(46, 32 - fr, 38, 38, 3.6, 0.9));
      feet2(p, W);
      p.ball(14.5, 18.5, 4.4, 4.4, W); p.ball(33.5, 18.5, 4.4, 4.4, W);
      p.ball(14.5, 18.8, 2, 2, H('#ffe0ea', '#ffc2d6', '#f59ab8', '#d97a9a')); p.ball(33.5, 18.8, 2, 2, H('#ffe0ea', '#ffc2d6', '#f59ab8', '#d97a9a'));
      p.ball(24, 30, 13.5, 12, W);
      p.ball(24, 34.5, 8.5, 6.2, B);
      p.fill((x, y) => { const d = Math.hypot(x - 24, y - 8 + fr); return d <= 5 && d >= 3.5; }, hex('#d6f6ff'));
      p.set(22, 6 - fr, WHITE); p.set(22, 7 - fr, WHITE);
    },
    after(p) { const k = hex('#2f86a0'); p.set(16, 34, k); p.set(15, 35, k); p.set(31, 34, k); p.set(32, 35, k); },
  },
  marulho: {
    face: { ex: 16, ey: 27, ew: 5, eh: 6, my: 34, blushY: 33, base: 'determined' },
    draw(p, fr) {
      const s = fr ? 1 : 0;
      const W = H('#e6fffb', '#7fdcd8', '#3fa8bc', '#2a6f98'), B = H('#ffffff', '#eefaff', '#cde9f3', '#a8d2e4'), F = H('#e8fdff', '#9fe6ff', '#55b8f0', '#3378c8');
      p.ball(42, 34, 6, 6, F, tear(47, 23 + s, 40, 36, 4.6, 0.85));
      p.ball(7, 30, 5, 4, F, tear(2, 23 - s, 10, 31, 3.3, 0.9)); p.ball(41, 30, 5, 4, F, tear(46, 23 - s, 38, 31, 3.3, 0.9));
      feet2(p, W, 43, 8, 4.6);
      p.ball(24, 30, 15, 13.5, W);
      p.ball(24, 35, 10, 7, B);
      p.ball(20, 14, 6, 6, F, tear(31 + s, 3, 20, 15, 5.4, 0.9));
      p.ball(13, 17, 5, 5, F, tear(20 + s, 7, 13, 18, 4, 0.9));
      p.ball(29, 16, 5, 5, F, tear(38 + s, 8, 29, 17, 3.8, 0.9));
    },
    after(p) { p.ball(24, 22, 1.8, 1.8, H('#ffffff', '#fff3fb', '#f0d6ec', '#d6b4d6')); },
  },
  brotim: {
    face: { ex: 17, ey: 29, ew: 4, eh: 5, my: 35, blushY: 34 },
    draw(p, fr) {
      const Bd = H('#fbffe8', '#dff2b0', '#b5d77a', '#86ad55'), L = H('#d4f78a', '#86cf52', '#4f9e3b', '#2f6b2c');
      const t = fr * 0.06;
      p.ball(16, 12, 4, 10, L, rotEl(16, 12, 3.9, 10, -0.28 - t)); p.ball(32, 12, 4, 10, L, rotEl(32, 12, 3.9, 10, 0.28 + t));
      p.line(14, 5, 16, 18, L[2]); p.line(34, 5, 32, 18, L[2]);
      feet2(p, Bd, 43, 7, 4);
      p.ball(39, 37, 3.5, 3.5, H('#ffffff', '#f4ffe0', '#dff2b0', '#b5d77a'));
      p.ball(24, 32, 13, 11.5, Bd);
    },
    after(p) { const pk = hex('#ffaed6'), y = hex('#ffe58a'); p.set(35, 3, pk); p.set(34, 4, pk); p.set(36, 4, pk); p.set(35, 5, pk); p.set(35, 4, y); },
  },
  ipezal: {
    face: { ex: 16, ey: 30, ew: 5, eh: 5, my: 36, blushY: 35, base: 'determined' },
    draw(p, fr) {
      const Bd = H('#f6ffe0', '#cfe8a0', '#9cc46a', '#6f9448'), L = H('#d4f78a', '#86cf52', '#4f9e3b', '#2f6b2c'), bark = H('#c58e5e', '#9c6a42', '#7a4f31', '#5a3824');
      const t = fr * 0.08;
      p.ball(8, 21, 9, 3.5, L, rotEl(8, 21, 9, 3.4, -0.5 - t)); p.ball(40, 21, 9, 3.5, L, rotEl(40, 21, 9, 3.4, 0.5 + t));
      p.line(9, 33, 4, 29, bark[2]); p.line(39, 33, 44, 29, bark[2]); p.set(4, 28, L[1]); p.set(44, 28, L[1]);
      feet2(p, bark, 43.5, 8, 4.6);
      p.ball(24, 32, 14.5, 12.5, Bd);
      p.ball(24, 13, 14, 9, BLOSSOM4, or(elT(24, 12, 9, 6.5), elT(15, 15, 6, 5), elT(33, 15, 6, 5), elT(19, 8, 6, 5), elT(29, 8, 6, 5)));
      const r = rng(31);
      for (let i = 0; i < 14; i++) { const x = 11 + r() * 26, y = 4 + r() * 15; if (p.get(x, y) >>> 24) p.set(x, y, r() > 0.5 ? WHITE : BLOSSOM4[3]); }
    },
  },
  fagulho: {
    face: { ex: 15, ey: 28, ew: 5, eh: 5, my: 35, blushY: 34, mouth: 'fang' },
    draw(p, fr) {
      const s = fr ? 1 : -1;
      const R = H('#ffe0b0', '#ffa060', '#e8643a', '#b23c2a');
      p.glow(42, 27, 6, 8, FLAME, tear(46 + s, 17, 41, 31, 3.8, 0.85));
      p.ball(38, 35, 6, 4, R, rotEl(38, 35, 6, 3.6, -0.7));
      for (const [x, y] of [[13, 41.5], [21, 43], [28, 43], [35, 41.5]]) p.ball(x, y, 3.4, 2.4, R);
      p.ball(24, 32, 15, 10.5, R);
      p.ball(24, 36.5, 10, 5, H('#fff0d0', '#ffd8a0', '#f0b070', '#d08a50'));
      p.glow(17, 17, 4, 6, FLAME, tear(16 + s, 13, 17, 22, 3, 0.9));
      p.glow(24, 15, 4, 7, FLAME, tear(24 + s, 10, 24, 21, 3.4, 0.9));
      p.glow(31, 17, 4, 6, FLAME, tear(32 + s, 13, 31, 22, 3, 0.9));
    },
  },
  sapuri: {
    face: { ex: 15, ey: 21, ew: 4, eh: 5, my: 33, blushY: 32 },
    draw(p) {
      const G2 = H('#e8ffd8', '#98e0a0', '#55b07c', '#33795c'), B = H('#fffbe8', '#f4f0c8', '#dcd49e', '#b8ae78');
      p.ball(12, 42, 6, 2.8, G2); p.ball(36, 42, 6, 2.8, G2);
      p.ball(24, 33, 16, 10.5, G2);
      p.ball(17, 23, 6, 5.5, G2); p.ball(31, 23, 6, 5.5, G2);
      p.ball(24, 36.5, 10, 5.5, B);
      p.ball(24, 15.5, 9.5, 2.4, H('#c9f27a', '#7bc950', '#4b9a3a', '#2f6b2c'));
      p.ball(27, 12.5, 2.6, 2.2, BLOSSOM4);
    },
  },
  cogumelim: {
    face: { ex: 18, ey: 31, ew: 3, eh: 4, my: 37, blushY: 36 },
    draw(p) {
      const C = H('#ffd6ec', '#f58ac0', '#c9579a', '#8f3a72'), St = H('#fffaf0', '#f5ead2', '#dccba8', '#b8a47e');
      feet2(p, St, 43.5, 6, 3.5);
      p.ball(24, 35, 9.5, 8.5, St);
      p.ball(13, 35, 2.4, 2, St); p.ball(35, 35, 2.4, 2, St);
      p.ball(24, 20, 18, 12, C, (x, y) => ((x - 24) / 18) ** 2 + ((y - 22) / 12) ** 2 <= 1 && y <= 26 + 1.5 * Math.sin(x * 0.9));
      for (const [x, y, r] of [[16, 15, 2.2], [27, 12, 2.6], [33, 19, 1.8], [21, 21, 1.6], [11, 22, 1.4], [36, 13, 1.3]]) p.ball(x, y, r, r, [WHITE, WHITE, hex('#f4e6f0'), hex('#e8d0e0')]);
    },
  },
  lumiposa: {
    face: { ex: 19, ey: 27, ew: 3, eh: 4, my: 32, blushY: 31, mouth: 'cat' },
    draw(p, fr) {
      const s = fr ? 1 : 0;
      const Wg = H('#fbf3ff', '#dcc6ff', '#a98ae8', '#7458c0'), Bd = H('#fffaf0', '#f6ead0', '#e0cba0', '#bba070'), Y = H('#fff6c4', '#ffd36b', '#ffb648', '#e8903a');
      p.ball(11, 21 - s, 10, 8, Wg, rotEl(11, 21 - s, 10, 7.5, -0.5)); p.ball(37, 21 - s, 10, 8, Wg, rotEl(37, 21 - s, 10, 7.5, 0.5));
      p.ball(13, 36, 7, 5.5, Wg, rotEl(13, 36, 7, 5, 0.4)); p.ball(35, 36, 7, 5.5, Wg, rotEl(35, 36, 7, 5, -0.4));
      p.ball(9, 20 - s, 3, 3, Y); p.ball(39, 20 - s, 3, 3, Y);
      p.ball(24, 31, 8.5, 10.5, Bd);
      p.ball(24, 22, 8, 3.5, H('#ffffff', '#fff6e8', '#ecdcc0', '#d0b890'));
      const a = hex('#7458c0'); p.line(21, 19, 16, 8, a); p.line(27, 19, 32, 8, a);
      p.ball(15.5, 7.5, 2.1, 2.1, Y); p.ball(32.5, 7.5, 2.1, 2.1, Y);
    },
  },
  corujito: {
    face: { ex: 15, ey: 25, ew: 5, eh: 6, my: 0, mouth: 'none', blushY: 33 },
    draw(p) {
      const O = H('#f8ecd8', '#dcbc8e', '#ab845a', '#7a5a3a'), Dk = H('#c8a070', '#9a744a', '#74542f', '#523a20'), Wh = H('#ffffff', '#fff8ec', '#f0e0c8', '#dcc8a8');
      p.ball(13, 13, 5, 6, O, tri(9, 20, 11, 5, 19, 15)); p.ball(35, 13, 5, 6, O, tri(39, 20, 37, 5, 29, 15));
      const ft = hex('#ffb648'); for (const x of [17, 20, 26, 29]) p.rect(x, 42, 2, 2, ft);
      p.ball(24, 30, 15, 13.5, O);
      p.ball(10, 31, 4.5, 8.5, Dk); p.ball(38, 31, 4.5, 8.5, Dk);
      p.ball(18, 27, 6, 6, Wh); p.ball(30, 27, 6, 6, Wh);
      for (let i = 0; i < 3; i++) { const y = 36 + i * 2; p.set(21 + i * 3, y, Dk[1]); p.set(22 + i * 3, y + 1, Dk[1]); }
    },
    after(p) { const b = hex('#ffb648'), b2 = hex('#e8903a'); p.set(23, 31, b); p.set(24, 31, b); p.set(23, 32, b2); p.set(24, 32, b2); },
  },
  ventolim: {
    face: { ex: 17, ey: 27, ew: 4, eh: 5, my: 33, blushY: 32 },
    draw(p, fr) {
      const s = fr ? 1 : 0;
      const C = H('#ffffff', '#e6f5ff', '#bcdcf2', '#8ab4d8');
      p.ball(8, 26 - s, 6, 3.5, C, rotEl(8, 26 - s, 6, 3.2, -0.5)); p.ball(40, 26 - s, 6, 3.5, C, rotEl(40, 26 - s, 6, 3.2, 0.5));
      p.ball(24, 29, 14, 12, C, or(elT(24, 30, 13, 10), elT(15, 25, 7, 7), elT(25, 21, 8, 7.5), elT(33, 26, 6.5, 6.5), elT(16, 35, 6, 5), elT(32, 35, 6, 5)));
      p.ball(39, 39, 3, 2.4, C); p.ball(43, 41, 2, 1.6, C);
    },
    after(p) { const k = hex('#8ab4d8'); p.set(23, 17, k); p.set(24, 16, k); p.set(25, 16, k); p.set(26, 17, k); p.set(26, 18, k); p.set(25, 19, k); },
  },
  cascudo: {
    face: { ex: 17, ey: 32, ew: 4, eh: 4, my: 38, blushY: 37 },
    draw(p) {
      const Sh = H('#d6f5e6', '#7fc4a8', '#4a8f7c', '#2f5f56'), Bd = H('#fff3dc', '#f2d8a8', '#d6b078', '#a8845a');
      for (const [x, y] of [[11, 37], [37, 37], [14, 42], [34, 42]]) p.ball(x, y, 3.2, 2.2, Bd);
      p.ball(24, 9, 4, 6, Sh, tear(27, 2, 24, 13, 3.4, 0.8));
      p.ball(24, 34, 12, 8.5, Bd);
      p.ball(24, 23, 16, 11, Sh, (x, y) => ((x - 24) / 16) ** 2 + ((y - 23) / 11) ** 2 <= 1 && y < 30);
      p.line(24, 13, 24, 29, Sh[3]);
      p.ball(17, 20, 2.2, 2.2, [Sh[0], Sh[0], Sh[1], Sh[1]]); p.ball(31, 20, 2.2, 2.2, [Sh[0], Sh[0], Sh[1], Sh[1]]);
    },
  },
  geodim: {
    slit: true,
    face: { ex: 16, ey: 32, ew: 4, eh: 3, my: 0, mouth: 'none', eyeColor: hex('#3a1f5a') },
    draw(p) {
      const St = H('#e8e4f0', '#b8b0c8', '#857c98', '#5a5270'), Cr = H('#f6eaff', '#d4a8ff', '#9a6ae8', '#6a40b8');
      feet2(p, St, 43, 8, 4.4);
      p.ball(24, 33, 15, 10.5, St);
      for (const [cx, by, h, w] of [[13, 27, 9, 2.6], [18, 25, 13, 3.2], [25, 24, 17, 3.8], [32, 26, 11, 3], [36, 28, 7, 2.2]]) p.ball(cx, by - h / 2, w, h / 2, Cr, crystalT(cx, by, h, w));
    },
    after(p, expr) {
      if (expr === 'neutral') { const g = hex('#e0c4ff'), w = hex('#ffffff'); for (const x of [16, 28]) { p.rect(x, 32, 4, 2, g); p.set(x + 1, 32, w); } }
    },
  },
});
SPECIES_ART.pedrusco.slit = true;


// ---------- criaturas geradas (genoma -> pixel art) ----------
const LEAF4 = H('#d4f78a', '#86cf52', '#4f9e3b', '#2f6b2c');
const GOLD4 = H('#fff6c4', '#ffe08a', '#e8b84a', '#b8862a');
const ICE4 = H('#ffffff', '#d8f6ff', '#9fdcf5', '#6ab0d8');
const PINK4 = H('#ffe0ea', '#ffc2d6', '#f59ab8', '#d97a9a');
function genCreature(g, fr, expr) {
  const p = new Pix(48, 48);
  const r = rng(g.seed);
  const k = [1, 1.12, 1.24][g.stage] || 1;
  const rx = Math.min(16.5, g.rx * k), ry = Math.min(14.5, g.ry * k);
  const float = g.feet === 'float';
  const bottom = float ? 39.5 : 41.5;
  const cx = 24, cy = bottom - ry, top = cy - ry;
  const R = g.ramp, A = g.acc, B = g.belly;
  const s = fr ? 1 : -1;
  const flameR = g.type === 'brasa' ? FLAME : g.type === 'luz' ? H('#fffef0', '#fff4b8', '#ffd66b', '#f0b429', '#d98a1a') : [hex('#ffffff'), A[0], A[1], A[2], A[3]];
  const glowR = [hex('#ffffff'), R[0], R[1], R[2], R[3]];
  // cauda (atrás)
  const tx = cx + rx * 0.8, ty = cy + ry * 0.35;
  if (g.tail === 'flame') p.glow(tx + 3, ty - 4, 7, 8, flameR, tear(tx + 7 + s, ty - ry * 0.9, tx, ty + 2, 4, 0.85));
  else if (g.tail === 'wisp') p.glow(tx, bottom, 6, 5, glowR, tear(tx + 6 + s, bottom + 5, tx - 2, bottom - 3, 3.6, 0.9));
  else if (g.tail === 'fin') p.ball(tx + 3, ty, 6, 6, A, tear(tx + 9, ty - 8 + s, tx, ty + 2, 4.5, 0.85));
  else if (g.tail === 'leaf') p.ball(tx + 4, ty - 2, 6, 3, LEAF4, rotEl(tx + 4, ty - 2, 6, 2.8, -0.7 - s * 0.06));
  else if (g.tail === 'fluffy') p.ball(tx + 2, ty + 2, 4.6, 4.6, B);
  else if (g.tail === 'curl') { p.fill((x, y) => { const d = Math.hypot(x - tx - 4, y - ty + 2); return d <= 4.2 && d >= 2.4 && !(x < tx + 4 && y > ty - 2); }, R[2]); }
  else if (g.tail === 'bolt') { for (const [a, b2, c, d] of [[tx - 2, ty + 3, tx + 4, ty - 2], [tx + 4, ty - 2, tx + 1, ty - 3], [tx + 1, ty - 3, tx + 8, ty - 10 + s]]) { p.line(a, b2, c, d, A[1]); p.line(a + 1, b2, c + 1, d, A[1]); } }
  // asas atrás
  if (g.arms === 'wings') for (const sd of [-1, 1]) p.ball(cx + sd * (rx + 2), cy - 3 - fr, 7, 4, B, rotEl(cx + sd * (rx + 2), cy - 3 - fr, 7, 3.6, sd * -0.55));
  // orelhas (atrás do corpo)
  const ex = rx * 0.55;
  for (const sd of [-1, 1]) {
    const X = (d) => cx + sd * d;
    switch (g.ears) {
      case 'cat': p.ball(X(ex), top, 5, 6, R, tri(X(ex - 5), top + 5, X(ex + 1), top - 6 * k, X(ex + 5), top + 6)); p.fill(tri(X(ex - 2.5), top + 4, X(ex + 0.5), top - 2.5 * k, X(ex + 3), top + 4.5), PINK4[1]); break;
      case 'round': p.ball(X(ex), top + 1.5, 4.2 * k, 4.2 * k, R); p.ball(X(ex), top + 1.8, 2 * k, 2 * k, PINK4); break;
      case 'long': p.ball(X(ex - 1), top - 5, 3.6, 9 * k, R, rotEl(X(ex - 1), top - 5, 3.5, 9 * k, sd * (0.25 + fr * 0.05))); break;
      case 'leaf': p.ball(X(ex + 3), top - 1, 7, 3, LEAF4, rotEl(X(ex + 3), top - 1, 7, 2.9, sd * -0.6)); break;
      case 'horn': p.ball(X(ex + 2), top - 3, 3, 6, A, tear(X(ex + 4), top - 9 * k, X(ex), top + 3, 2.8, 0.8)); break;
      case 'antenna': p.line(X(3), top + 2, X(ex + 2), top - 8, R[3]); p.ball(X(ex + 2), top - 8.5, 2, 2, A); break;
      case 'fin': p.ball(X(rx + 2), cy - 3, 6, 6, A, tri(X(rx - 3), cy - 5, X(rx + 7), cy - 11 + fr, X(rx - 1), cy + 4)); break;
      case 'flame': p.glow(X(ex + 1), top - 2, 4, 7, flameR, tear(X(ex + 3) + s, top - 9 * k, X(ex), top + 3, 3.4, 0.9)); break;
      case 'crystal': p.ball(X(ex), top - 2, 2.6, 5, ICE4, crystalT(X(ex), top + 3, 9 * k, 2.6)); break;
      case 'wing': p.ball(X(rx + 1), top + 4, 6, 3, B, rotEl(X(rx + 1), top + 4 - fr, 6, 2.8, sd * -0.6)); break;
      case 'zigzag': for (const [a, b2, c, d] of [[X(ex), top + 3, X(ex + 2), top - 3], [X(ex + 2), top - 3, X(ex - 1), top - 3], [X(ex - 1), top - 3, X(ex + 3), top - 10]]) { p.line(a, b2, c, d, A[1]); p.line(a, b2 + 1, c, d + 1, A[2]); } break;
      default: break;
    }
  }
  // pés
  if (g.feet === 'stubby') feet2(p, R, bottom + 1.2, rx * 0.55, 4);
  else if (g.feet === 'four') for (const d of [-rx * 0.75, -rx * 0.28, rx * 0.28, rx * 0.75]) p.ball(cx + d, bottom + 1, 3, 2.2, R);
  // corpo
  let body;
  switch (g.shape) {
    case 'oval': body = elT(cx, cy, rx * 0.86, ry * 1.06); break;
    case 'wide': body = elT(cx, cy + 1, rx * 1.12, ry * 0.86); break;
    case 'drop': body = tear(cx + s * 0.5, top - 6 * k, cx, cy + ry * 0.12, rx * 0.95, 0.95); break;
    case 'pear': body = or(elT(cx, cy - ry * 0.42, rx * 0.68, ry * 0.62), elT(cx, cy + ry * 0.22, rx, ry * 0.78)); break;
    case 'ghost': { const ph = fr ? Math.PI : 0; body = (x, y) => (y <= cy ? ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 : Math.abs(x - cx) <= rx - (y - cy) * 0.12 && y <= cy + ry * 0.75 + 2 * Math.cos((x - cx + rx) * Math.PI / (rx * 0.66) + ph)); break; }
    case 'cloud': body = or(elT(cx, cy + 1, rx * 0.95, ry * 0.8), elT(cx - rx * 0.5, cy - ry * 0.25, rx * 0.5, ry * 0.55), elT(cx + rx * 0.1, cy - ry * 0.5, rx * 0.58, ry * 0.6), elT(cx + rx * 0.6, cy - ry * 0.15, rx * 0.45, ry * 0.5)); break;
    case 'blocky': body = (x, y) => Math.abs((x - cx) / rx) ** 4 + Math.abs((y - cy) / ry) ** 4 <= 1; break;
    default: body = elT(cx, cy, rx, ry);
  }
  p.ball(cx, cy, rx, ry, R, body);
  // padrão
  if (g.pattern === 'belly') p.ball(cx, cy + ry * 0.38, rx * 0.6, ry * 0.5, B, (x, y) => body(x, y) && ((x - cx) / (rx * 0.6)) ** 2 + ((y - cy - ry * 0.38) / (ry * 0.5)) ** 2 <= 1);
  else if (g.pattern === 'spots') for (let i = 0; i < 5; i++) { const x = cx + (r() * 2 - 1) * rx * 0.75, y = cy + (r() * 2 - 1) * ry * 0.6; if (body(x, y) && Math.abs(y - cy) > 2) p.ball(x, y, 1.6, 1.6, [R[0], R[0], R[1], R[1]]); }
  else if (g.pattern === 'stripes') for (let i = 0; i < 3; i++) { const y = Math.round(top + 2 + i * 2.5); for (let x = Math.round(cx - 3 - i); x <= cx + 2 + i; x++) if (body(x + 0.5, y + 0.5)) p.set(x, y, R[3]); }
  // braços (na frente)
  if (g.arms === 'nubs') { p.ball(cx - rx - 0.5, cy + 2, 2.8, 2.2, R); p.ball(cx + rx + 0.5, cy + 2, 2.8, 2.2, R); }
  else if (g.arms === 'fins') for (const sd of [-1, 1]) p.ball(cx + sd * (rx + 1), cy + 3, 4, 3, A, tri(cx + sd * (rx - 2), cy, cx + sd * (rx + 5), cy + 4 - fr, cx + sd * (rx - 1), cy + 7));
  else if (g.arms === 'leaf') for (const sd of [-1, 1]) p.ball(cx + sd * (rx + 2), cy + 2, 4.5, 2.2, LEAF4, rotEl(cx + sd * (rx + 2), cy + 2, 4.5, 2.1, sd * (0.5 + fr * 0.1)));
  const drawHead = (kind) => { switch (kind) {
    case 'flame': p.glow(cx, top - 4, 6, 9, flameR, tear(cx + s * 1.5, top - 12 * k, cx, top + 4, 5.5 * k, 0.85)); break;
    case 'tuft': for (const d of [-3, 0, 3]) p.ball(cx + d, top - 2, 2.4, 4, R, tear(cx + d * 1.3 + s, top - (d ? 6 : 8), cx + d, top + 2, d ? 2.2 : 2.6, 0.9)); break;
    case 'horn1': p.ball(cx, top - 4, 3, 6, A, tear(cx + s * 0.5, top - 10 * k, cx, top + 3, 3, 0.8)); break;
    case 'bubble': p.fill((x, y) => { const d = Math.hypot(x - cx, y - top + 6 + fr); return d <= 4.6 && d >= 3.2; }, hex('#d6f6ff')); p.set(cx - 2, top - 8 - fr, WHITE); break;
    case 'curl': p.ball(cx + 2, top - 2, 4, 5, R, tear(cx + 5 + s, top - 9, cx + 1, top + 3, 3.4, 0.9)); break;
    case 'shell': p.ball(cx + 5, top + 1, 4.5, 3.2, A); p.line(cx + 3, top - 1, cx + 5, top + 3, A[3]); p.line(cx + 7, top - 1, cx + 5, top + 3, A[3]); break;
    case 'sprout': p.rect(cx - 1, top - 5, 2, 7, LEAF4[2]); p.ball(cx - 4, top - 6, 4, 2.2, LEAF4, rotEl(cx - 4, top - 6, 4, 2, -0.5)); p.ball(cx + 4, top - 7, 4.5, 2.4, LEAF4, rotEl(cx + 4, top - 7, 4.5, 2.2, 0.5)); break;
    case 'flower': for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [-2, 2.5], [2, 2.5]]) p.ball(cx + 3 + dx, top - 1 + dy, 2.4, 2.4, A); p.ball(cx + 3, top - 1, 1.6, 1.6, GOLD4); break;
    case 'mushroom': p.ball(cx, top + 2, rx * 0.95, 7, A, (x, y) => ((x - cx) / (rx * 0.95)) ** 2 + ((y - top - 2) / 7) ** 2 <= 1 && y <= top + 3); for (const d of [-4, 3, 7]) p.ball(cx + d, top - 1 - Math.abs(d) * 0.1, 1.4, 1.4, [WHITE, WHITE, WHITE, hex('#eee4ee')]); break;
    case 'leafcrown': for (const [d, a] of [[-5, -0.9], [0, 0], [5, 0.9]]) p.ball(cx + d, top - 2, 2.4, 5, LEAF4, rotEl(cx + d, top - 2, 2.3, 5, a)); break;
    case 'halo': p.fill((x, y) => { const q = ((x - cx) / 9) ** 2 + ((y - top + 6) / 2.4) ** 2; return q <= 1 && q >= 0.4; }, GOLD4[1]); break;
    case 'crystals': case 'shards': { const C = g.head === 'shards' ? ICE4 : A; for (const [d, h, w] of [[-5, 7, 2.2], [0, 10, 2.8], [5, 7, 2.2]]) p.ball(cx + d, top - h / 2 + 2, w, h / 2, C, crystalT(cx + d, top + 3, h * k, w)); break; }
    case 'moss': for (let x = Math.round(cx - rx * 0.8); x < cx + rx * 0.8; x++) { let t2 = -1; for (let y = 0; y < 48; y++) if (body(x + 0.5, y + 0.5)) { t2 = y; break; } if (t2 >= 0) { const dpt = 2 + Math.round(1.5 * Math.sin(x * 0.8) + 1); for (let q = 0; q < dpt; q++) p.set(x, t2 + q, q ? LEAF4[2] : LEAF4[1]); } } break;
    default: break;
  } };
  drawHead(g.head); if (g.head2) drawHead(g.head2);
  // rosto
  const ew = g.ew, eh = g.eh;
  const fx = Math.round(24 - g.gap / 2 - ew), fy = Math.round(cy - ry * 0.18 - eh / 2 + 1);
  const my = fy + eh + 1;
  if (g.slit && expr === 'neutral') { for (const x of [fx, 48 - fx - ew]) { p.rect(x, fy + 1, ew, 2, A[0]); p.set(x + 1, fy + 1, WHITE); } }
  else face(p, { ex: fx, ey: fy, ew, eh, my, blushY: g.blush ? my - 1 : null, mouth: g.mouth, base: g.eyeBase }, expr);
  // marcas na testa
  const fyM = fy - 3;
  const hasH = (k) => g.head === k || g.head2 === k;
  if (g.marks) for (const sd of [-1, 1]) { const x = Math.round(cx + sd * (rx - 3.5)); for (let q = 0; q < 3; q++) if (p.get(x, Math.round(cy) + q) >>> 24) p.set(x, Math.round(cy) + q, A[1]); }
  if (g.head === 'moon') { const c1 = GOLD4[1]; p.set(23, fyM - 1, c1); p.set(22, fyM, c1); p.set(22, fyM + 1, c1); p.set(23, fyM + 2, c1); p.set(24, fyM + 2, c1); }
  if (hasH('star')) { const c1 = GOLD4[1]; p.set(23, fyM - 1, c1); p.set(24, fyM - 1, c1); p.rect(22, fyM, 4, 1, c1); p.set(23, fyM + 1, c1); p.set(24, fyM + 1, c1); }
  if (hasH('swirl')) { const c1 = R[3]; p.set(23, fyM, c1); p.set(24, fyM - 1, c1); p.set(25, fyM, c1); p.set(25, fyM + 1, c1); p.set(24, fyM + 1, c1); }
  if (hasH('zigzag')) { const c1 = A[1]; p.set(24, fyM - 2, c1); p.set(23, fyM - 1, c1); p.set(24, fyM - 1, c1); p.set(24, fyM, c1); p.set(23, fyM + 1, c1); }
  if (g.pattern === 'mask') for (let y = fy; y < fy + eh; y++) for (let x = fx - 2; x < 48 - fx + 2; x++) { const c = p.get(x, y); if (c === R[0] || c === R[1] || c === R[2]) p.set(x, y, R[3]); }
  p.outline();
  if (g.shape === 'ghost') for (let y = Math.round(cy + ry * 0.5); y < 48; y++) for (let x = 0; x < 48; x++) { const c = p.get(x, y); if (c >>> 24) p.set(x, y, withAlpha(c, 200)); }
  return p;
}

export function creature(id, frame = 0, expr = 'neutral') {
  const art = SPECIES_ART[id];
  if (!art && MYTH_GENOMES[id]) return mythCreature(MYTH_GENOMES[id], frame, expr);
  if (!art) return genCreature(GENOMES[id], frame, expr);
  const p = new Pix(48, 48);
  art.draw(p, frame);
  if (!(art.slit && expr === 'neutral')) face(p, art.face, expr);
  if (art.after) art.after(p, expr);
  p.outline();
  if (art.post) art.post(p);
  return p;
}
export const CREATURE_IDS = Object.keys(SPECIES_ART);

// ---------- companheiro em miniatura (segue o jogador) ----------
function lum(c) { const r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255; return 0.3 * r + 0.59 * g + 0.11 * b; }
// reduz 48→24 preservando contorno e olhos (pega o pixel mais escuro quando é bem escuro)
function half(src) {
  const o = new Pix(24, 24);
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    const px = [src.get(2 * x, 2 * y), src.get(2 * x + 1, 2 * y), src.get(2 * x, 2 * y + 1), src.get(2 * x + 1, 2 * y + 1)].filter(c => (c >>> 24) > 100);
    if (px.length < 2) continue;
    px.sort((a, b) => lum(a) - lum(b));
    o.set(x, y, lum(px[0]) < 70 ? px[0] : px[Math.floor(px.length / 2)]);
  }
  return o;
}
export function mini(id, frame = 0) {
  if (id !== 'pirilim' && id !== 'pirilume') return half(creature(id, frame, 'neutral'));
  const s = frame ? 1 : -1;
  if (id === 'pirilume') {
    const p = new Pix(20, 20);
    const body = H('#fff6d5', '#ffcf5c', '#ff9a3c', '#e2553a');
    p.fill((x, y) => { const r = ((x - 10) / 7) ** 2 + ((y - 3.5) / 1.6) ** 2; return r <= 1 && r >= 0.35; }, hex('#ffe08a'));
    p.glow(14, 16, 3, 3, WISPFLAME, tear(17 + s, 19, 13, 15, 2, 0.9));
    p.glow(3, 11, 4, 3, WISPFLAME, tear(1, 8 + s, 5, 12, 2, 0.8));
    p.glow(17, 11, 4, 3, WISPFLAME, tear(19, 8 + s, 15, 12, 2, 0.8));
    p.ball(10, 12, 6.2, 5.6, body);
    p.glow(10, 8, 3.4, 6, WISPFLAME, tear(10 + s * 0.6, 1, 10, 7.5, 3.2, 0.85));
    p.glow(6, 8, 2.5, 4, WISPFLAME, tear(4.5 + s * 0.5, 3, 6.5, 8, 2, 0.9));
    p.glow(14, 8, 2.5, 4, WISPFLAME, tear(15.5 + s * 0.5, 3, 13.5, 8, 2, 0.9));
    p.rect(7, 11, 1, 2, EYE); p.rect(12, 11, 1, 2, EYE);
    p.blend(6, 13, BLUSH); p.blend(13, 13, BLUSH);
    p.outline();
    return p;
  }
  const p = new Pix(16, 16);
  const body = H('#fff6d5', '#ffd66b', '#ffab45', '#ee7433');
  p.glow(10, 13, 3, 3, FLAME, tear(12 + s, 15.5, 10, 12.5, 1.8, 0.9));
  p.ball(8, 9.5, 5.2, 4.8, body);
  p.glow(8, 5, 3.2, 5, FLAME, tear(8 + s * 0.7, 0.6, 8, 5.5, 3, 0.85));
  p.rect(6, 9, 1, 2, EYE); p.rect(9, 9, 1, 2, EYE);
  p.blend(5, 11, BLUSH); p.blend(10, 11, BLUSH);
  p.outline();
  return p;
}

// ---------- personagens 16×24 (pés em y=22) ----------
export const LOOKS = {
  player: { skin: '#ffd2a8', hair: '#3b2b4f', top: '#2fa39b', accent: '#ff8a3d', bottom: '#3d3a5c', shoe: '#c2573a', style: 'spiky' },
  cida: { skin: '#e8b48c', hair: '#cfc8e0', top: '#8c5bb8', accent: '#ffd166', bottom: '#5a4a7a', shoe: '#3c2f45', style: 'bun', skirt: true },
  tito: { skin: '#c88b5e', hair: '#5a3a22', top: '#7bc950', accent: '#ffffff', bottom: '#3a5a8c', shoe: '#e8e8f0', style: 'cap', cap: '#e85d5d' },
  lia: { skin: '#ffd2a8', hair: '#d9663f', top: '#a57a4a', accent: '#5fd0c0', bottom: '#4a3a2a', shoe: '#5a3a2a', style: 'hat', cap: '#7a5638' },
  duda: { skin: '#8a5a3c', hair: '#1f1a2e', top: '#e85d5d', accent: '#ffd166', bottom: '#2f3a5c', shoe: '#f0f0f5', style: 'spiky' },
};
export function character(lookId, dir, frame) {
  // dir: 0 baixo, 1 cima, 2 esquerda, 3 direita ; frame: 0 parado, 1 passo A, 2 passo B
  if (dir === 2) return character(lookId, 3, frame).flipX();
  const L = LOOKS[lookId];
  const C = {}; for (const k in L) if (typeof L[k] === 'string' && L[k][0] === '#') C[k] = hex(L[k]);
  const p = new Pix(16, 24);
  const o = 2; // deslocamento vertical (espaço p/ coque/chapéu)
  const R = (x, y, w, h, c) => p.rect(x, y + o, w, h, c);
  const S = (x, y, c) => p.set(x, y + o, c);
  const topD = mix(C.top, hex('#000000'), 0.25), botD = mix(C.bottom, hex('#000000'), 0.2);
  const hairL = mix(C.hair, hex('#ffffff'), 0.25);
  const lu = frame === 1 ? -1 : 0, ru = frame === 2 ? -1 : 0; // perna levantada
  if (dir === 0 || dir === 1) {
    // pernas
    if (L.skirt) { R(4, 16, 8, 3, C.bottom); R(4, 18, 8, 1, botD); }
    else { R(5, 16, 6, 1, C.bottom); R(5, 17 + lu, 2, 2, C.bottom); R(9, 17 + ru, 2, 2, C.bottom); }
    R(5, 19 + lu, 2, 2, C.shoe); R(9, 19 + ru, 2, 2, C.shoe);
    // tronco
    R(4, 10, 8, 6, C.top); R(4, 15, 8, 1, topD);
    const al = frame === 1 ? 1 : 0, ar = frame === 2 ? 1 : 0;
    R(3, 11 + al, 1, 4, topD); R(12, 11 + ar, 1, 4, topD); S(3, 15 + al, C.skin); S(12, 15 + ar, C.skin);
    // cabeça
    if (dir === 0) {
      R(4, 3, 8, 7, C.skin);
      R(5, 1, 6, 1, C.hair); R(4, 2, 8, 2, C.hair); R(4, 4, 1, 3, C.hair); R(11, 4, 1, 3, C.hair);
      S(5, 4, C.hair); S(10, 4, C.hair); S(7, 4, C.hair); R(5, 2, 2, 1, hairL);
      R(6, 6, 1, 2, EYE); R(9, 6, 1, 2, EYE); p.blend(5, 8 + o, BLUSH); p.blend(10, 8 + o, BLUSH);
      R(5, 10, 6, 1, C.accent); S(6, 11, C.accent);
    } else {
      R(4, 2, 8, 7, C.hair); R(5, 1, 6, 1, C.hair); R(5, 2, 3, 1, hairL); R(6, 9, 4, 1, C.skin);
      R(5, 10, 6, 1, C.accent); S(9, 11, C.accent); S(9, 12, C.accent);
    }
  } else {
    // lado (direita)
    if (L.skirt) { R(5, 16, 7, 3, C.bottom); R(5, 18, 7, 1, botD); R(6, 19, 2, 2, C.shoe); R(9, 19, 2, 2, C.shoe); }
    else if (frame === 0) { R(6, 16, 5, 3, C.bottom); R(6, 19, 2, 2, C.shoe); R(8, 19, 3, 2, C.shoe); }
    else {
      const f = frame === 1;
      R(6, 16, 5, 1, C.bottom);
      R(f ? 9 : 5, 17, 2, 2, C.bottom); R(f ? 5 : 9, 17, 2, 2, botD);
      R(f ? 9 : 5, 19, 3, 2, C.shoe); R(f ? 4 : 9, 19, 3, 1, C.shoe);
    }
    R(5, 10, 6, 6, C.top); R(5, 15, 6, 1, topD);
    const sw = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    R(7 + sw, 11, 2, 4, topD); R(7 + sw, 15, 2, 1, C.skin);
    R(5, 3, 7, 7, C.skin);
    R(5, 1, 6, 1, C.hair); R(4, 2, 8, 2, C.hair); R(4, 4, 3, 4, C.hair); S(7, 4, C.hair); S(11, 4, C.hair);
    R(5, 2, 2, 1, hairL);
    R(10, 6, 1, 2, EYE); p.blend(11, 8 + o, BLUSH);
    R(6, 10, 6, 1, C.accent); S(5, 11, C.accent); S(4, 12, C.accent);
  }
  // detalhes de estilo
  if (L.style === 'bun') { R(6, -1, 4, 2, C.hair); R(7, -2, 2, 1, C.hair); S(7, -1, hairL); }
  if (L.style === 'spiky') { S(4, 1, C.hair); S(11, 1, C.hair); S(8, 0, C.hair); S(6, 0, C.hair); }
  if (L.style === 'cap') {
    const cap = hex(L.cap), capD = mix(cap, hex('#000000'), 0.3);
    R(4, 1, 8, 2, cap); R(5, 0, 6, 1, cap);
    if (dir === 0) R(4, 3, 8, 1, capD); else if (dir === 3) R(9, 3, 4, 1, capD);
  }
  if (L.style === 'hat') {
    const cap = hex(L.cap), capD = mix(cap, hex('#000000'), 0.3);
    R(5, -1, 6, 3, cap); R(2, 2, 12, 1, capD); R(5, 1, 6, 1, hex(L.accent));
  }
  p.outline(null, hex('#2a1e3a'));
  return p;
}

// ---------- itens ----------
export function ribbon() { // Fita-encanto
  const p = new Pix(16, 16);
  const pink = H('#ffe1ef', '#ff9cc8', '#ef5f9f', '#b83b7a');
  p.ball(4.5, 7, 4, 3.4, pink, rotEl(4.5, 7, 4, 3, -0.3));
  p.ball(11.5, 7, 4, 3.4, pink, rotEl(11.5, 7, 4, 3, 0.3));
  p.fill(tri(7, 8, 3, 15, 6, 15), pink[2]); p.fill(tri(9, 8, 13, 15, 10, 15), pink[2]);
  p.ball(8, 7.5, 2.2, 2.2, H('#fff6c0', '#ffd66b', '#e8a93a', '#b8741f'));
  p.outline();
  return p;
}
export function fruit() { // Fruta-luz
  const p = new Pix(12, 12);
  p.ball(6, 7, 4.5, 4.2, H('#fff4c4', '#ffcf4d', '#ff9b3a', '#d9602c'));
  p.ball(8, 2.5, 2.2, 1.2, H('#c9f27a', '#7bc950', '#4b9a3a', '#2f6b2c'), rotEl(8, 2.5, 2.4, 1.2, -0.5));
  p.set(6, 2, hex('#7a4f31')); p.set(6, 3, hex('#7a4f31'));
  p.outline();
  return p;
}
export function egg(cracks = 0, style = 'brasa') {
  const p = new Pix(32, 40);
  const shell = H('#fffaf0', '#f3e6cf', '#dcc7a6', '#b89c7c');
  p.ball(16, 23, 12, 15, shell, (x, y) => { const ry = y < 23 ? 15.5 : 13; return ((x - 16) / 12) ** 2 + ((y - 23) / ry) ** 2 <= 1; });
  const EGGS = { brasa: [['#ffb648', '#ff8a3d'], ['#7fd7d0', '#3fb0a8']], rio: [['#8fd8ff', '#4aa8ff'], ['#ffffff', '#cdeefa']], mata: [['#9adf6a', '#5cae45'], ['#ffaed6', '#f17fb8']] };
  const [sa, sb] = EGGS[style] || EGGS.brasa; const spot = H(...sa), spot2 = H(...sb);
  for (const [x, y, r, c] of [[11, 18, 2.6, spot], [21, 14, 2, spot2], [20, 27, 3, spot], [10, 30, 2, spot2], [15, 10, 1.5, spot]]) p.ball(x, y, r, r, [c[0], c[0], c[1], c[1]]);
  const k = hex('#5a3a2a');
  const crackPaths = [
    [[16, 9], [14, 12], [17, 14], [15, 17]],
    [[6, 22], [9, 21], [10, 24], [13, 23]],
    [[26, 19], [23, 21], [24, 24], [21, 25], [22, 28]],
  ];
  for (let i = 0; i < Math.min(cracks, 3); i++) { const pts = crackPaths[i]; for (let j = 1; j < pts.length; j++) p.line(...pts[j - 1], ...pts[j], k); }
  p.outline();
  return p;
}

// ---------- tiles 16×16 ----------
export const PAL = {
  grass: H('#a8e27a', '#7dcc5a', '#5db84b', '#47a040', '#3a8a3a'),
  tall: H('#9fe07a', '#62c052', '#3f9e43', '#2e7f39', '#22652f'),
  path: H('#f3dfae', '#e6cb92', '#d6b67c', '#c09d66'),
  water: H('#d6f3ff', '#8fd0ff', '#4fa3ee', '#3b86dc', '#2c6cc4'),
  leaf: H('#9fe07a', '#66bf52', '#45a043', '#317f3a', '#235f30'),
  blossom: H('#ffe0f0', '#ffaed6', '#f17fb8', '#cc5c96', '#9c3f72'),
  bark: H('#b07a4c', '#8a5a3b', '#6b4430'),
  stone: H('#f0ede3', '#c7bfac', '#968c7a', '#665e52'),
};
function noiseFill(p, base, specks, seed, density = 0.12) {
  const r = rng(seed);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    p.set(x, y, base);
    if (r() < density) p.set(x, y, specks[Math.floor(r() * specks.length)]);
  }
}
export function grass(v = 0) {
  const p = new Pix(16, 16); const G = PAL.grass;
  noiseFill(p, G[2], [G[1], G[3]], 11 + v * 31, 0.1);
  const r = rng(91 + v * 7);
  for (let i = 0; i < 3; i++) { // tufos em "v"
    const x = 1 + Math.floor(r() * 13), y = 3 + Math.floor(r() * 11);
    p.set(x, y, G[3]); p.set(x + 2, y, G[3]); p.set(x + 1, y + 1, G[3]); p.set(x, y - 1, G[1]); p.set(x + 2, y - 1, G[1]);
  }
  return p;
}
export function flowers(v = 0) {
  const p = grass(v + 3);
  const cols = [['#ffffff', '#ffd66b'], ['#ffb3d1', '#fff1a8'], ['#fff1a8', '#ff9b3a'], ['#c9b8ff', '#ffffff']];
  const r = rng(301 + v * 13);
  for (let i = 0; i < 3; i++) {
    const [pc, cc] = cols[(v + i) % cols.length].map(c => hex(c));
    const x = 2 + Math.floor(r() * 11), y = 2 + Math.floor(r() * 11);
    p.set(x, y - 1, pc); p.set(x - 1, y, pc); p.set(x + 1, y, pc); p.set(x, y + 1, pc); p.set(x, y, cc);
    p.set(x + 1, y + 2, PAL.grass[3]);
  }
  return p;
}
export function tallGrass(frame = 0, onlyFront = false) {
  const p = new Pix(16, 16); const T = PAL.tall;
  if (!onlyFront) noiseFill(p, T[3], [T[2], T[4]], 5, 0.15);
  const rows = onlyFront ? [[10, 16]] : [[1, 8], [6, 13], [10, 16]];
  rows.forEach(([top, bot], ri) => {
    for (let x = (ri % 2) * 2; x < 16; x += 4) {
      const sway = ((x >> 2) + frame + ri) % 2 ? 1 : 0;
      for (let y = top; y < bot; y++) {
        const t = (y - top) / (bot - top);
        const xx = x + (t < 0.4 ? sway : 0);
        p.set(xx, y, t < 0.25 ? T[0] : t < 0.6 ? T[1] : T[2]);
        p.set(xx + 1, y, t < 0.3 ? T[1] : T[2]);
        if (t > 0.5) p.set(xx + 2, y, T[3]);
      }
    }
  });
  return p;
}
export function pathTile(v = 0) {
  const p = new Pix(16, 16); const P = PAL.path;
  noiseFill(p, P[1], [P[0], P[2]], 77 + v * 5, 0.13);
  const r = rng(13 + v);
  for (let i = 0; i < 2; i++) { const x = Math.floor(r() * 14), y = Math.floor(r() * 14); p.set(x, y, P[3]); p.set(x + 1, y, P[2]); p.set(x, y - 1, P[0]); }
  return p;
}
export function waterTile(frame = 0) {
  const p = new Pix(16, 16); const W = PAL.water;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, (hash2(x, y, 4) < 0.08) ? W[4] : W[3]);
  const waves = [[2, 3], [9, 7], [4, 11], [12, 14]];
  waves.forEach(([x, y], i) => {
    const xx = (x + frame * (i % 2 ? 1 : -1) + 16) % 16;
    for (let k = 0; k < 4; k++) p.set((xx + k) % 16, y, k === 0 || k === 3 ? W[2] : W[1]);
    if ((frame + i) % 2 === 0) p.set((xx + 1) % 16, y - 1 < 0 ? 15 : y - 1, W[0]);
  });
  return p;
}
export function tree(kind = 'leaf') {
  const p = new Pix(16, 28);
  const B = PAL.bark, Lf = PAL[kind];
  p.rect(6, 19, 4, 8, B[1]); p.rect(6, 19, 1, 8, B[0]); p.rect(9, 19, 1, 8, B[2]);
  p.rect(5, 26, 6, 1, B[2]);
  const ramp = [Lf[0], Lf[1], Lf[2], Lf[3]];
  p.ball(8, 15, 7.5, 6, ramp, or(elT(8, 10, 6.5, 6), elT(4.5, 15, 4.3, 4.5), elT(11.5, 15, 4.3, 4.5), elT(8, 17, 6, 3.5)));
  const r = rng(kind === 'leaf' ? 3 : 9);
  for (let i = 0; i < 8; i++) { const x = 3 + r() * 10, y = 6 + r() * 12; if (p.get(x, y) === ramp[2]) p.set(x, y, ramp[3]); }
  if (kind === 'blossom') for (let i = 0; i < 6; i++) { const x = 3 + r() * 10, y = 6 + r() * 11; if (p.get(x, y) >>> 24) p.set(x, y, hex('#ffffff')); }
  p.outline();
  return p;
}
export function rock() {
  const p = new Pix(16, 16);
  p.ball(8, 10, 6.5, 5, PAL.stone, or(elT(8, 10.5, 6.5, 4.5), elT(7, 8, 4.5, 4)));
  p.set(5, 7, hex('#7fbf4f')); p.set(6, 6, hex('#b5e67a')); p.set(7, 6, hex('#7fbf4f'));
  p.outline();
  return p;
}
export function bush() {
  const p = new Pix(16, 16);
  p.ball(8, 9, 7, 6, H('#9fe07a', '#62c052', '#3f9e43', '#2e7f39'), or(elT(8, 10, 7, 5), elT(5, 7, 4, 4), elT(11, 7, 4, 4)));
  for (const [x, y] of [[5, 9], [10, 11], [9, 6]]) { p.set(x, y, hex('#ff6b8a')); p.set(x, y - 1, hex('#ffc2d1')); }
  p.outline();
  return p;
}
export function fence() {
  const p = new Pix(16, 16); const w = H('#e2b07a', '#b98a5a', '#8a6340');
  for (const x of [1, 12]) { p.rect(x, 3, 3, 12, w[1]); p.rect(x, 3, 1, 12, w[0]); p.rect(x + 2, 3, 1, 12, w[2]); }
  for (const y of [6, 10]) { p.rect(0, y, 16, 2, w[1]); p.rect(0, y, 16, 1, w[0]); }
  p.outline();
  return p;
}
export function lamp(lit = false) {
  const p = new Pix(16, 30);
  const post = hex('#4a4458'), postL = hex('#6e6684');
  p.rect(7, 9, 2, 18, post); p.rect(7, 9, 1, 18, postL);
  p.rect(5, 26, 6, 2, post); p.rect(5, 26, 6, 1, postL);
  p.rect(4, 2, 8, 2, post); p.rect(6, 1, 4, 1, post);
  p.rect(5, 4, 6, 5, lit ? hex('#fff1b8') : hex('#d8cfa8'));
  p.rect(6, 5, 4, 3, lit ? hex('#ffffff') : hex('#ece4c2'));
  p.rect(4, 9, 8, 1, post);
  p.outline();
  return p;
}
export function sign() {
  const p = new Pix(16, 16); const w = H('#f0c890', '#c99a62', '#9a6f45');
  p.rect(7, 9, 2, 6, w[2]);
  p.rect(2, 3, 12, 7, w[1]); p.rect(2, 3, 12, 1, w[0]); p.rect(2, 9, 12, 1, w[2]);
  p.rect(4, 5, 8, 1, w[2]); p.rect(4, 7, 6, 1, w[2]);
  p.outline();
  return p;
}
export function bridge() {
  const p = new Pix(16, 16); const w = H('#e2b07a', '#c4925f', '#9a6f45', '#6e4c30');
  for (let y = 0; y < 16; y++) { const c = y % 4 === 3 ? w[3] : y % 4 === 0 ? w[0] : w[1]; p.rect(0, y, 16, 1, c); }
  p.rect(0, 0, 2, 16, w[2]); p.rect(14, 0, 2, 16, w[2]);
  return p;
}
export function altar() { // pedestal do Santuário (32×26)
  const p = new Pix(32, 26);
  const st = H('#eef2f8', '#c3cbd8', '#929cb0', '#666f86');
  p.ball(16, 21, 14, 4, st); p.ball(16, 17, 10, 4, st);
  p.rect(10, 9, 12, 9, st[1]); p.rect(10, 9, 2, 9, st[0]); p.rect(20, 9, 2, 9, st[2]);
  p.ball(16, 9, 8, 2.6, st);
  p.rect(14, 12, 4, 4, hex('#62e8cc')); p.rect(15, 13, 2, 2, hex('#d9fff6'));
  p.outline();
  return p;
}
export function crystal() {
  const p = new Pix(12, 16);
  const c = H('#effffb', '#9ff5e2', '#4fd8c0', '#2a9c96');
  p.ball(6, 8, 5, 7.5, c, (x, y) => Math.abs(x - 6) / 5 + Math.abs(y - 8) / 7.5 <= 1);
  p.outline();
  return p;
}
export function monolith() { // Pedra Antiga (16×32)
  const p = new Pix(16, 32);
  const st = H('#d9d4e6', '#a69fbd', '#7a7392', '#544e6a');
  p.ball(8, 16, 6.5, 14, st, (x, y) => (y > 6 ? Math.abs(x - 8) <= 6 - (y - 6) * 0.03 : ((x - 8) / 6) ** 2 + ((y - 7) / 6) ** 2 <= 1) && y < 30);
  const g = hex('#b49cff'), g2 = hex('#7cf5d8');
  p.line(8, 9, 8, 13, g); p.line(6, 11, 10, 11, g); p.line(5, 17, 7, 20, g2); p.line(11, 17, 9, 20, g2); p.line(8, 22, 8, 25, g);
  p.rect(2, 28, 12, 2, hex('#5a9a3a'));
  p.outline();
  return p;
}
// casa composta (largura w tiles, altura h tiles), porta na coluna doorCol (em tiles)
export function house(w, h, doorCol, style = 0) {
  const W = w * 16, Hh = h * 16;
  const p = new Pix(W, Hh + 6);
  const roofs = [H('#7fd6d8', '#4fb0b8', '#378b98', '#286a7a'), H('#ffab8a', '#e2704f', '#b9523c', '#8c3a30')];
  const R = roofs[style % roofs.length];
  const wall = H('#fff6e4', '#f4e5c8', '#e0caa2'), beam = H('#c08a5c', '#a5714a', '#7a5236');
  const roofH = 30, oy = 6;
  // paredes
  p.rect(1, oy + roofH - 4, W - 2, Hh - roofH + 4, wall[1]);
  p.rect(1, oy + roofH - 4, W - 2, 2, wall[2]);
  p.rect(1, oy + roofH - 4, 3, Hh - roofH + 4, beam[1]); p.rect(W - 4, oy + roofH - 4, 3, Hh - roofH + 4, beam[1]);
  p.rect(1, oy + Hh - 3, W - 2, 3, hex('#b9b2a6')); p.rect(1, oy + Hh - 3, W - 2, 1, hex('#d6d0c4'));
  // telhado
  for (let y = 0; y < roofH; y++) {
    const inset = Math.max(0, 6 - y);
    const c = y < 2 ? R[0] : (y % 5 === 4) ? R[3] : (y % 5 === 0 ? R[1] : R[2]);
    p.rect(inset, oy + y, W - inset * 2, 1, c);
    if (y % 5 === 2) for (let x = inset + ((y / 5) & 1) * 3; x < W - inset; x += 6) p.set(x, oy + y, R[3]);
  }
  p.rect(0, oy + roofH - 1, W, 2, R[3]);
  // chaminé
  p.rect(W - 18, 0, 7, 10, hex('#b9867a')); p.rect(W - 18, 0, 7, 2, hex('#8c5a50'));
  // porta
  const dx = doorCol * 16 + 4, dy = oy + Hh - 15;
  p.rect(dx, dy, 8, 12, beam[2]); p.rect(dx + 1, dy + 1, 6, 11, beam[1]); p.rect(dx + 1, dy + 1, 6, 1, beam[0]);
  p.set(dx + 5, dy + 7, hex('#ffd66b'));
  // janelas
  const wins = [];
  for (let c = 0; c < w; c++) if (c !== doorCol && (c === 0 || c === w - 1 || Math.abs(c - doorCol) > 1)) wins.push(c * 16 + 4);
  for (const wx of wins) {
    const wy = oy + Hh - 17;
    p.rect(wx - 1, wy - 1, 10, 9, beam[2]); p.rect(wx, wy, 8, 7, hex('#9ad7ff')); p.rect(wx, wy, 8, 2, hex('#d4f0ff'));
    p.rect(wx + 3, wy, 1, 7, beam[2]); p.rect(wx, wy + 3, 8, 1, beam[2]);
    p.rect(wx - 1, wy + 8, 10, 2, hex('#7bc950')); p.set(wx + 1, wy + 8, hex('#ff8fb1')); p.set(wx + 6, wy + 8, hex('#ffd66b'));
  }
  p.outline(null, hex('#2a1e3a'));
  p.windows = wins.map(wx => ({ x: wx, y: oy + Hh - 17, w: 8, h: 7 }));
  return p;
}
