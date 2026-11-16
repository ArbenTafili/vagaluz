// mythart.js — arte procedural das espécies "Lendas e Feras" (#301–#600).
// Estilo propositalmente diferente dos espíritos fofos: silhuetas de perfil (feras, aves, serpentes,
// dragões, peixes), divindades e colossos de frente, olhos afiados, contorno escuro, marcas que brilham
// e, nas lendárias, acessórios divinos (disco solar, auréola, coroa, orbes) com uma aura em volta.
// Tudo original e gerado por código. Puro: não usa DOM. Cada criatura é um Pix 48×48 (cabeça para a esquerda).
import { Pix, hex, rgba, withAlpha, unpack, mix } from './gfx.js';
import { rng } from './gfx.js';

const DARK = hex('#150d20');
const WHITE = hex('#ffffff');

// ---------- formas (testes de "ponto dentro") ----------
const elT = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const or = (...fs) => (x, y) => fs.some(f => f(x, y));
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
// gota: ponta fina em (tx,ty), ponta redonda de raio r em (bx,by)
function tear(tx, ty, bx, by, r, pow = 1) {
  const ax = bx - tx, ay = by - ty, L = Math.hypot(ax, ay) || 1, ux = ax / L, uy = ay / L;
  return (x, y) => {
    if ((x - bx) ** 2 + (y - by) ** 2 <= r * r) return true;
    const px = x - tx, py = y - ty, along = px * ux + py * uy;
    if (along < 0 || along > L) return false;
    return Math.abs(-px * uy + py * ux) <= r * Math.pow(along / L, pow);
  };
}
// segmento grosso que afina de r0 até r1
function capsule(x0, y0, x1, y1, r0, r1 = r0) {
  const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1;
  return (x, y) => {
    let t = ((x - x0) * dx + (y - y0) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const r = r0 + (r1 - r0) * t; return (x - x0 - dx * t) ** 2 + (y - y0 - dy * t) ** 2 <= r * r;
  };
}
function poly(pts) {
  return (x, y) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
}
const ring = (cx, cy, rx, ry, k) => (x, y) => { const q = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; return q <= 1 && q >= k; };
const crystalT = (cx, by, h, w, lean = 0) => (x, y) => {
  if (y > by || y < by - h) return false;
  const t = (by - y) / h, mid = cx + lean * t * h;
  return Math.abs(x - mid) <= w * Math.min(1, (1 - t) / 0.45);
};
const supEl = (cx, cy, rx, ry, n = 3.5) => (x, y) => Math.abs((x - cx) / rx) ** n + Math.abs((y - cy) / ry) ** n <= 1;

// contorno mais escuro e frio que o dos espíritos fofos: dá peso às silhuetas
function darkOutline(c) { const [r, g, b] = unpack(c); return rgba(Math.round(r * 0.2 + 12), Math.round(g * 0.16 + 8), Math.round(b * 0.26 + 24)); }
const darker = (R) => [R[1], R[2], R[3], R[3]];
const glowRamp = (g) => [WHITE, g.E[0], g.E[1], g.E[2], g.E[2]];

// ---------- olhos ----------
// olho de perfil (olhando para a esquerda): amendoado e afiado nos adultos, redondo nos filhotes
function sideEye(p, x, y, expr, g, baby) {
  x = Math.round(x); y = Math.round(y);
  const D = DARK, I = g.iris;
  const e = expr === 'neutral' ? 'open' : expr;
  if (e === 'closed' || e === 'blink' || e === 'sleep') { p.rect(x, y + 2, 3, 1, D); p.set(x + 3, y + 1, D); return; }
  if (e === 'happy') { p.set(x, y + 2, D); p.set(x + 1, y + 1, D); p.set(x + 2, y + 1, D); p.set(x + 3, y + 2, D); return; }
  if (e === 'hurt') { p.rect(x, y + 1, 4, 1, D); p.set(x, y, D); p.set(x + 3, y + 2, D); return; }
  if (baby) {
    p.rect(x + 1, y, 2, 1, D); p.rect(x, y + 1, 4, 2, D); p.rect(x + 1, y + 3, 2, 1, D);
    p.set(x + 1, y + 1, WHITE); p.set(x + 2, y + 2, I);
    if (e === 'sad') p.set(x + 3, y, D);
    return;
  }
  p.rect(x + 1, y, 3, 1, D); p.set(x + 4, y - 1, D);            // pálpebra com "delineado"
  p.set(x, y + 1, D); p.set(x + 1, y + 1, WHITE); p.set(x + 2, y + 1, I); p.set(x + 3, y + 1, D);
  p.set(x + 1, y + 2, D); p.set(x + 2, y + 2, D);
  if (e === 'sad') { p.set(x + 4, y - 1, 0); p.set(x + 3, y - 1, D); }
  if (g.glowEye) { p.set(x + 1, y + 1, g.E[0]); p.set(x + 2, y + 1, g.E[1]); }
}
// olhos de frente (divindades, colossos, insetos): fendas que brilham ou redondos
function frontEyes(p, cx, y, gap, expr, g, style = 'slit') {
  const e = expr === 'neutral' ? 'open' : expr;
  y = Math.round(y);
  for (const sd of [-1, 1]) {
    const w = style === 'round' ? 2 : 3;
    const x = sd < 0 ? Math.round(cx - gap / 2 - w) : Math.round(cx + gap / 2);
    if (e === 'closed' || e === 'blink' || e === 'sleep') { p.rect(x, y + 1, w, 1, DARK); continue; }
    if (e === 'happy') { p.set(x, y + 1, DARK); p.rect(x + 1, y, w - 1, 1, DARK); if (w === 3) p.set(x + 2, y + 1, DARK); continue; }
    if (e === 'hurt') { p.set(x, y, DARK); p.set(x + 1, y + 1, DARK); if (w === 3) p.set(x + 2, y + 2, DARK); continue; }
    if (style === 'round') { p.rect(x, y, 2, 3, DARK); p.set(x, y, WHITE); continue; }
    if (style === 'mask') { // olhos escuros e afiados numa máscara clara, com um brilho no centro
      p.rect(x, y, 3, 2, DARK); p.set(sd < 0 ? x + 2 : x, y - 1, DARK); p.set(x + 1, y, g.E[1]);
      if (e === 'sad') p.set(sd < 0 ? x : x + 2, y, 0);
      continue;
    }
    p.rect(x, y, 3, 1, g.E[0]); p.set(sd < 0 ? x : x + 2, y, g.E[1]);
    p.blend(x + 1, y - 1, withAlpha(g.E[1], 140)); p.blend(x + 1, y + 1, withAlpha(g.E[2], 120));
    if (e === 'sad') p.set(sd < 0 ? x + 2 : x, y - 1, DARK);
  }
}

// ---------- marcas no corpo ----------
function markings(p, g, test, x0, y0, w, h) {
  const r = rng(g.seed + 77);
  const C = g.dark ? g.E[1] : g.R[3];
  const inside = (x, y) => test(x + 0.5, y + 0.5) && (p.get(x, y) >>> 24);
  switch (g.pattern) {
    case 'listras':
      for (let i = 0; i < 4; i++) {
        const x = Math.round(x0 + w * (0.22 + i * 0.17));
        for (let y = Math.floor(y0); y < y0 + h * 0.5; y++) if (inside(x, y)) { p.set(x, y, C); if (y < y0 + h * 0.3 && inside(x + 1, y)) p.set(x + 1, y, C); }
      }
      break;
    case 'manchas':
      for (let i = 0; i < 6; i++) {
        const x = Math.round(x0 + w * (0.2 + r() * 0.6)), y = Math.round(y0 + h * (0.15 + r() * 0.45));
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (inside(x + dx, y + dy)) p.set(x + dx, y + dy, g.dark ? g.E[2] : g.S[0]);
      }
      break;
    case 'runas':
      for (let i = 0; i < 3; i++) {
        const x = Math.round(x0 + w * (0.25 + i * 0.22)), y = Math.round(y0 + h * (0.28 + r() * 0.2));
        const glyph = [[[0, 0], [0, 1], [0, 2], [1, 1]], [[0, 0], [1, 0], [1, 1], [1, 2]], [[0, 1], [1, 0], [2, 1], [1, 2]]][i % 3];
        for (const [dx, dy] of glyph) if (inside(x + dx, y + dy)) p.set(x + dx, y + dy, g.E[1]);
      }
      break;
    case 'veias': {
      const yc = y0 + h * 0.42, ph = r() * 6;
      for (let x = Math.floor(x0 + w * 0.12); x < x0 + w * 0.92; x++) {
        const y = Math.round(yc + Math.sin(x * 0.7 + ph) * 1.6);
        if (inside(x, y)) p.set(x, y, (x & 1) ? g.E[1] : g.E[0]);
      }
      break;
    }
    case 'estrelas':
      for (let i = 0; i < 7; i++) {
        const x = Math.round(x0 + w * (0.15 + r() * 0.7)), y = Math.round(y0 + h * (0.12 + r() * 0.55));
        if (inside(x, y)) p.set(x, y, i === 0 ? WHITE : g.E[0]);
        if (i === 0) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inside(x + dx, y + dy)) p.set(x + dx, y + dy, g.E[1]);
      }
      break;
    default: break;
  }
}

// ---------- acessórios divinos ----------
function behind(p, g, a, fr) {
  if (g.disk) { // disco solar com raios atrás do corpo
    const cx = a.cx, cy = a.cy, R0 = 13.5;
    for (let i = 0; i < 12; i++) {
      const ang = i / 12 * Math.PI * 2 + (fr ? 0.13 : 0), L = i % 2 ? 18 : 21;
      const c = Math.cos(ang), s = Math.sin(ang);
      p.fill(tri(cx + c * R0 - s * 1.8, cy + s * R0 + c * 1.8, cx + c * L, cy + s * L, cx + c * R0 + s * 1.8, cy + s * R0 - c * 1.8), i % 2 ? g.A[1] : g.E[1]);
    }
    p.fill(ring(cx, cy, R0 + 1, R0 + 1, 0.74), g.A[1]);
    p.fill(ring(cx, cy, R0 - 0.5, R0 - 0.5, 0.9), g.E[0]);
  }
  if (g.orbs) for (let i = 0; i < 3; i++) {
    const ang = i / 3 * Math.PI * 2 + (fr ? 0.35 : 0) + 0.4;
    if (Math.sin(ang) < 0) { const x = a.cx + Math.cos(ang) * 19, y = a.cy + Math.sin(ang) * 11; p.glow(x, y, 2.6, 2.6, glowRamp(g)); }
  }
  if (g.halo) p.fill(ring(a.hx + 1, a.top - 2.5, a.hr * 1.25 + 1, a.hr * 0.42 + 0.8, 0.42), g.E[0]);
}
function front(p, g, a, fr) {
  if (g.crown) {
    const x = Math.round(a.hx), y = Math.round(a.top + 1);
    for (const [dx, h] of [[-3, 3], [0, 5], [3, 3]]) p.fill(tri(x + dx - 1.6, y + 1, x + dx, y - h, x + dx + 1.6, y + 1), g.A[1]);
    p.rect(x - 4, y, 9, 2, g.A[2]); p.set(x, y, g.E[0]); p.set(x - 3, y, g.E[1]); p.set(x + 3, y, g.E[1]);
  }
  if (g.gem) { const x = Math.round(a.gx ?? a.hx), y = Math.round(a.gy ?? (a.hy - a.hr * 0.55)); p.set(x, y, g.E[0]); p.set(x + 1, y, g.E[1]); p.set(x, y + 1, g.E[1]); p.set(x + 1, y + 1, g.E[2]); }
  if (g.orbs) for (let i = 0; i < 3; i++) {
    const ang = i / 3 * Math.PI * 2 + (fr ? 0.35 : 0) + 0.4;
    if (Math.sin(ang) >= 0) { const x = a.cx + Math.cos(ang) * 19, y = a.cy + Math.sin(ang) * 11; p.glow(x, y, 2.6, 2.6, glowRamp(g)); }
  }
}

// ---------- partes compartilhadas ----------
function tailPart(p, g, x, y, fr, st, kind = g.tail) {
  const sw = fr ? 1 : -1, k = 0.8 + st * 0.15;
  const R = g.R, S = g.S;
  switch (kind) {
    case 'pincel': {
      const t = tear(x, y, x + 8 * k, y - 9 * k + sw, 3.2 * k, 0.75);
      p.ball(x + 6, y - 7, 6, 7, R, t);
      p.ball(x + 8 * k, y - 9 * k + sw, 3, 3, S, (xx, yy) => t(xx, yy) && Math.hypot(xx - x - 8 * k, yy - y + 9 * k - sw) < 2.6 * k);
      break;
    }
    case 'multi': {
      const n = g.tails || 3;
      for (let i = 0; i < n; i++) {
        const a = -1.45 + i * (1.25 / Math.max(1, n - 1)) + sw * 0.05, L = 10 * k;
        const ex = x + Math.cos(a) * L + 2, ey = y + Math.sin(a) * L;
        const t = tear(x, y, ex, ey, 2.6 * k, 0.8);
        p.ball(ex - 2, ey + 2, 6, 6, i % 2 ? darker(R) : R, t);
        p.fill((xx, yy) => t(xx, yy) && Math.hypot(xx - ex, yy - ey) < 2.2 * k, g.dark ? g.E[1] : S[1]);
      }
      break;
    }
    case 'chicote': {
      const ex = x + 8 * k, ey = y - 4 + sw;
      p.ball(x + 4, y - 2, 5, 3, R, capsule(x, y, ex, ey, 1.8, 1.1));
      p.ball(ex + 1, ey - 1, 2.6, 2.6, S, elT(ex + 1, ey - 1, 2.6, 2.4));
      break;
    }
    case 'chama': {
      const t = tear(x + 6 * k + sw, y - 12 * k, x + 1, y, 3.6 * k, 0.85);
      p.glow(x + 2, y - 4, 6 * k, 9 * k, glowRamp(g), t);
      break;
    }
    case 'cristal':
      for (const [dx, h, lean] of [[1, 7, 0.35], [4, 9, 0.5], [7, 6, 0.7]]) p.ball(x + dx, y - h / 2, 2.4, h / 2 + 1, g.A, crystalT(x + dx, y + 1, h * k, 1.9, lean));
      break;
    case 'folha': p.ball(x + 5, y - 4, 6, 3, g.S, rotEl(x + 5, y - 4 + sw * 0.5, 6.2 * k, 2.6, -0.75)); p.line(x + 1, y, x + 8, y - 7, g.S[3]); break;
    case 'nuvem': for (const [dx, dy, r] of [[2, -1, 3], [6, -4, 3.4], [9, -8, 2.8]]) p.ball(x + dx * k, y + dy * k + (dy < -5 ? sw : 0), r, r, g.S); break;
    case 'raio': {
      const b = poly([[x, y + 1], [x + 5, y - 3], [x + 3, y - 4], [x + 9, y - 11 + sw], [x + 5, y - 5], [x + 7, y - 4], [x + 1, y - 1]]);
      p.fill(b, (xx, yy) => (yy < y - 5 ? g.E[0] : g.E[1]));
      break;
    }
    case 'peixe': p.ball(x + 4, y - 2, 6, 5, g.A, tri(x - 1, y + 1, x + 8, y - 8 + sw, x + 7, y + 4)); break;
    case 'lanca': {
      p.ball(x + 2, y, 3, 3, g.A, tri(x - 1, y, x + 4, y - 4, x + 5, y + 3));
      break;
    }
    default: break;
  }
}
function ear(p, g, x, y, hr, ramp, far, st) {
  const k = (g.earK || 1) * (st === 0 ? 1.15 : 1);
  switch (g.ears) {
    case 'longa': {
      const t = rotEl(x + 1.5, y - 4.5 * k, 2.1, 5.8 * k, 0.4);
      p.ball(x + 1.5, y - 4.5 * k, 2.4, 6 * k, ramp, t);
      if (!far) p.fill((xx, yy) => rotEl(x + 1.6, y - 4.2 * k, 0.9, 4.2 * k, 0.4)(xx, yy), g.S[1]);
      break;
    }
    case 'redonda': p.ball(x + 0.5, y - 1, 2.8 * k, 2.8 * k, ramp); if (!far) p.ball(x + 0.5, y - 1, 1.3 * k, 1.3 * k, [g.S[1], g.S[1], g.S[2], g.S[2]]); break;
    case 'barbatana': p.ball(x + 2, y - 2, 4, 4, g.A, tri(x - 1.5, y + 2, x + 6 * k, y - 5 * k, x + 2.5, y + 2.5)); break;
    default: { // pontuda
      const t = tri(x - 2.3, y + 1.8, x + 1 + (far ? 1 : 0), y - 6 * k, x + 2.8, y + 2.2);
      p.ball(x, y - 2, 3, 5, ramp, t);
      if (!far) p.fill(tri(x - 0.8, y + 1.5, x + 0.9, y - 3.6 * k, x + 1.6, y + 1.6), g.dark ? g.E[2] : g.S[1]);
    }
  }
}
function horns(p, g, hx, hy, hr, st, kind = g.horns) {
  const k = st === 0 ? 0.45 : st === 1 ? 0.8 : 1.05;
  const A = g.A;
  switch (kind) {
    case 'unico': p.ball(hx - 1, hy - hr - 3, 2, 4, A, tear(hx - hr * 0.3 - 2.5 * k, hy - hr - 7 * k, hx - hr * 0.05, hy - hr * 0.62, 1.7, 0.85)); break;
    case 'duplos':
      for (const [o, R2] of [[1.5, darker(A)], [0, A]]) p.ball(hx + hr, hy - hr, 4, 4, R2, tear(hx + hr * 0.9 + 5 * k + o, hy - hr - 5 * k - o, hx + hr * 0.15 + o, hy - hr * 0.55, 1.9, 0.8));
      break;
    case 'curvos': {
      const cx = hx + hr * 0.4, cy = hy - hr * 0.05, r1 = hr * 0.42, r2 = hr * 0.42 + 2.2 * k + 0.6;
      p.ball(cx, cy, r2, r2, A, (x, y) => { const d = Math.hypot(x - cx, y - cy); return d >= r1 && d <= r2 && !(x < cx - 0.5 && y > cy); });
      break;
    }
    case 'galhada': {
      if (st === 0) { p.ball(hx + 1, hy - hr - 0.5, 1.4, 1.6, A); break; }
      const b0 = [hx + hr * 0.15, hy - hr * 0.75], b1 = [hx + hr * 0.7, hy - hr - 6 * k], b2 = [hx + hr * 0.2 + 4 * k, hy - hr - 10 * k];
      const L = (a, b, c) => { p.line(a[0], a[1], b[0], b[1], c); p.line(a[0] + 1, a[1], b[0] + 1, b[1], c); };
      L(b0, b1, A[2]); L(b1, b2, A[1]);
      const t1 = [b1[0] - 3.5 * k, b1[1] - 3.5 * k], t2 = [b1[0] + 4 * k, b1[1] - 1.5 * k], t3 = [b2[0] - 2.5, b2[1] - 2];
      p.line(b1[0], b1[1], t1[0], t1[1], A[1]); p.line(b1[0], b1[1], t2[0], t2[1], A[2]); p.line(b2[0], b2[1], t3[0], t3[1], A[1]);
      const tip = g.type === 'mata' ? g.S : g.type === 'gelo' || g.type === 'luz' ? [WHITE, g.E[0], g.E[1], g.E[2]] : null;
      if (tip) for (const t of [t1, t3, b2]) p.ball(t[0], t[1], 1.5, 1.5, tip);
      break;
    }
    case 'cristal': for (const [dx, h, lean] of [[-1, 5, -0.25], [2, 7, 0.2]]) p.ball(hx + dx, hy - hr - h / 2, 2.2, h / 2 + 1, A, crystalT(hx + dx, hy - hr * 0.6, h * k + 1, 1.6, lean)); break;
    default: break;
  }
}
function maneBack(p, g, hx, hy, hr, fr, st) {
  const sw = fr ? 1 : 0;
  switch (g.mane) {
    case 'juba': {
      const cx = hx + hr * 0.55, cy = hy + hr * 0.25, R2 = g.dark ? darker(g.S) : g.S;
      for (let i = 0; i < 7; i++) {
        const a = -2.0 + i * 0.47, L = hr * (1.45 + (i % 2) * 0.25) + st;
        p.ball(cx, cy, hr * 1.4, hr * 1.4, R2, tear(cx + Math.cos(a) * L + 1, cy + Math.sin(a) * L, cx, cy, hr * 0.62, 0.7));
      }
      break;
    }
    case 'chama': p.glow(hx + hr, hy - 2, hr * 1.2, hr * 1.9, glowRamp(g), tear(hx + hr + 6 + sw, hy - hr - 9, hx + hr * 0.5, hy + hr * 0.6, hr * 0.95, 0.8)); break;
    case 'cristal': for (const [dx, dy, h, lean] of [[0.6, -0.3, 6, 0.4], [1.2, 0.5, 7, 0.6], [1.6, 1.4, 5, 0.85]]) p.ball(hx + hr * dx, hy + hr * dy - h / 2, 2.4, h / 2 + 1, g.A, crystalT(hx + hr * dx, hy + hr * dy, h, 2, lean)); break;
    case 'folhas': for (const [a, L] of [[-1.7, 1.5], [-0.9, 1.6], [-0.1, 1.5], [0.7, 1.3]]) { const x = hx + hr * 0.5 + Math.cos(a) * hr * L * 0.7, y = hy + hr * 0.3 + Math.sin(a) * hr * L * 0.7; p.ball(x, y, 4, 2.4, g.S, rotEl(x, y, 4.2, 2.2, a)); } break;
    case 'nuvem': for (const [dx, dy, r] of [[0.7, -0.6, 3.2], [1.2, 0.3, 3.6], [0.9, 1.1, 3.2], [0.1, 1.3, 2.8]]) p.ball(hx + hr * dx, hy + hr * dy, r, r, g.S); break;
    case 'raio': for (const [a, L] of [[-1.6, 1.9], [-0.95, 2.1], [-0.3, 1.8], [0.35, 1.5]]) { const cx = hx + hr * 0.5, cy = hy + hr * 0.2; p.fill(tri(cx - 1.5, cy, cx + Math.cos(a) * hr * L + 1.5, cy + Math.sin(a) * hr * L, cx + 1.5, cy + 1.2), (x, y) => y < cy - hr * 0.8 ? g.E[0] : g.E[1]); } break;
    default: break;
  }
}
function backSpikes(p, g, pts, size = 3) {
  for (const [x, y, s] of pts) p.ball(x, y - size, 2, size, g.A, tri(x - 1.8 * s, y + 0.8, x + 1.2 * s, y - size * s - 0.5, x + 1.9 * s, y + 0.8));
}

// ---------- planos de corpo ----------
function fera(p, g, fr, expr) {
  const st = g.stage, baby = st === 0, s = fr ? 1 : 0;
  const G0 = 44, R = g.R, S = g.S;
  const legL = (baby ? 4.6 : st === 1 ? 7 : 8.4) * g.legK;
  const tw = (baby ? 8 : st === 1 ? 10 : 11.4) * g.bodyK, th = baby ? 5.3 : st === 1 ? 5.8 : 6.4;
  const tcx = baby ? 28 : 27, tcy = G0 - legL - th * 0.55;
  const hr = baby ? 7.2 : st === 1 ? 5.8 : 6.1;
  const hx = tcx - tw - hr * 0.05 + (baby ? 2.5 : 1.5), hy = tcy - th - hr * (baby ? 0.2 : 0.5) + s * 0.5;
  const a = { hx, hy, hr, top: hy - hr, cx: tcx - 3, cy: tcy - 7 };
  behind(p, g, a, fr);
  const fx = tcx - tw * 0.55, bx = tcx + tw * 0.56;
  const leg = (x, ramp, off) => {
    const x1 = x + off;
    p.ball(x, tcy + legL * 0.4, 3.2, legL * 0.9 + 2, ramp, capsule(x, tcy, x1, G0 - 1.8, baby ? 2.7 : 2.5, baby ? 2.2 : 1.7));
    p.ball(x1 - 0.8, G0 - 1.3, 2.7, 1.6, ramp, elT(x1 - 0.8, G0 - 1.3, 2.7, 1.5));
  };
  leg(fx + 2.5, darker(R), s ? -1 : 1); leg(bx + 2.5, darker(R), s ? 1 : -1);
  tailPart(p, g, tcx + tw * 0.86, tcy - th * 0.35, fr, st);
  const body = or(elT(tcx - tw * 0.32, tcy - 0.4, tw * 0.72, th * 1.08), elT(tcx + tw * 0.3, tcy, tw * 0.72, th * 0.95));
  p.ball(tcx - 2, tcy - 1, tw * 1.05, th * 1.15, R, body);
  p.fill((x, y) => body(x, y) && y > tcy + th * 0.45, g.dark ? R[3] : S[2]);
  if (g.mane === 'espinhos') backSpikes(p, g, [[tcx - tw * 0.35, tcy - th + 0.5, 1], [tcx, tcy - th + 0.8, 1.1], [tcx + tw * 0.38, tcy - th + 1.4, 0.9]]);
  markings(p, g, body, tcx - tw, tcy - th, tw * 2, th * 2);
  leg(fx, R, s ? 1 : -1); leg(bx, R, s ? -1 : 1);
  const neck = capsule(tcx - tw * 0.55, tcy - th * 0.1, hx + 1.5, hy + 1.5, th * 0.82, hr * 0.58);
  p.ball(tcx - tw * 0.45, tcy - th * 0.7, tw * 0.75, th * 1.4, R, neck);
  if (st > 0 || g.legend) maneBack(p, g, hx, hy, hr, fr, st);
  ear(p, g, hx + hr * 0.5, hy - hr * 0.55, hr, darker(R), true, st);
  p.ball(hx, hy, hr, hr * 0.92, R);
  const sl = (baby ? 0.42 : 0.72) * g.snoutK * hr;
  const snx = hx - hr * 0.7 - sl * 0.3, sny = hy + hr * 0.3;
  const sn = elT(snx, sny, sl + 1.2, hr * 0.42);
  p.ball(snx, sny, sl + 1.2, hr * 0.42, R, sn);
  p.fill((x, y) => sn(x, y) && y > sny + 0.3, g.dark ? R[2] : S[1]);
  p.set(Math.round(snx - sl - 0.6), Math.round(sny - hr * 0.2), DARK);
  if (!baby) p.line(Math.round(snx - sl + 1), Math.round(sny + 1), Math.round(snx + sl * 0.3), Math.round(sny + 1), R[3]);
  ear(p, g, hx + hr * 0.05, hy - hr * 0.68, hr, R, false, st);
  horns(p, g, hx, hy, hr, st);
  sideEye(p, hx - hr * 0.5, hy - hr * 0.42, expr, g, baby);
  a.gx = hx - hr * 0.2; a.gy = hy - hr * 0.75;
  front(p, g, a, fr);
}

function featherWing(p, g, sx, sy, fr, far, st) {
  const lift = fr ? -3 : 0, k = st === 2 ? 1.1 : 0.92;
  const ox = far ? -2 : 0, oy = far ? -3 : 0;
  const W = far ? darker(g.W) : g.W;
  const sh = [sx + ox, sy + oy], el = [sx + 5 * k + ox, sy - 9 * k + lift + oy], hd = [sx + 10.5 * k + ox, sy - 14 * k + lift * 1.4 + oy];
  const n = 6;
  for (let i = n - 1; i >= 0; i--) {
    const t = 0.15 + i / (n - 1) * 0.85;
    const bxp = t < 0.5 ? sh[0] + (el[0] - sh[0]) * t * 2 : el[0] + (hd[0] - el[0]) * (t - 0.5) * 2;
    const byp = t < 0.5 ? sh[1] + (el[1] - sh[1]) * t * 2 : el[1] + (hd[1] - el[1]) * (t - 0.5) * 2;
    const ang = 1.25 - t * 0.72, L = (4.5 + t * 6.2) * k;
    const ex = bxp + Math.cos(ang) * L, ey = byp + Math.sin(ang) * L;
    const f = tear(ex, ey, bxp, byp, 2.4 * k, 0.9);
    p.ball((ex + bxp) / 2, (ey + byp) / 2, L / 2 + 2, 3.5, i % 2 ? W : darker(W), f);
    p.fill((x, y) => f(x, y) && Math.hypot(x - ex, y - ey) < 3, far ? W[2] : (g.dark ? g.E[1] : g.S[0]));
  }
  const cov = rotEl((sh[0] + hd[0]) / 2 - 1, (sh[1] + hd[1]) / 2 + 1, 8 * k, 3.6 * k, Math.atan2(hd[1] - sh[1], hd[0] - sh[0]));
  p.ball((sh[0] + hd[0]) / 2 - 1, (sh[1] + hd[1]) / 2, 8 * k, 4 * k, far ? darker(g.R) : g.R, cov);
}
function ave(p, g, fr, expr) {
  const st = g.stage, baby = st === 0, s = fr ? 1 : 0;
  const G0 = 44, R = g.R, S = g.S, A = g.A;
  const fly = !!g.fly && !baby;
  const bx = 25, by = fly ? 27 : baby ? 34 : 31, brx = baby ? 8.5 : st === 1 ? 9.5 : 10.5, bry = baby ? 7.6 : 7.2;
  const hr = baby ? 6.4 : 5.2;
  const hx = bx - brx * 0.68, hy = by - bry - hr * 0.3 + (baby ? 2.5 : 0) + s * 0.5;
  const a = { hx, hy, hr, top: hy - hr, cx: bx - 2, cy: by - 7 };
  behind(p, g, a, fr);
  if (!baby) featherWing(p, g, bx + 1, by - bry * 0.4, fr, true, st);
  // penas da cauda
  const tx = bx + brx * 0.72, ty = by + 1.5, sw = fr ? 1 : -1;
  const plume = baby ? 'curta' : g.plume;
  if (plume === 'longa') for (let i = 0; i < 3; i++) {
    const ex = tx + 11 + i * 2, ey = ty + 9 - i * 4 + sw;
    const f = capsule(tx, ty - i, ex, ey, 2, 1.3);
    p.ball(tx + 6, ty + 3, 8, 6, i === 1 ? g.W : darker(g.W), f);
    p.ball(ex, ey, 2.4, 2.4, glowRamp(g), elT(ex, ey, 2.4, 2.4));
  } else if (plume === 'leque') for (let i = 0; i < 5; i++) {
    const ang = -1.25 + i * 0.36, L = 13 + (i % 2) * 2;
    const ex = tx + Math.cos(ang) * L, ey = ty + Math.sin(ang) * L * 0.9;
    const f = tear(tx, ty, ex, ey, 2.8, 0.75);
    p.ball(ex, ey, 6, 6, i % 2 ? g.W : darker(g.W), f);
    p.fill(elT(ex, ey, 1.4, 1.4), g.E[1]);
  } else if (plume === 'tesoura') for (const [dx, dy] of [[12, 3], [11, 9]]) p.ball(tx + 6, ty + 3, 8, 4, g.W, capsule(tx, ty, tx + dx, ty + dy + sw, 1.8, 0.8));
  else for (let i = 0; i < 3; i++) p.ball(tx + 4, ty + 2, 6, 4, i === 1 ? g.W : darker(g.W), tear(tx + 7 + i, ty + 3 + i * 2 - 2, tx - 1, ty, 2.4, 0.9));
  // pernas
  if (!fly) for (const lx of [bx - 2.5, bx + 2]) {
    p.line(lx, by + bry - 1.5, lx - 0.5, G0 - 1, A[2]); p.line(lx + 1, by + bry - 1.5, lx + 0.5, G0 - 1, A[2]);
    p.rect(Math.round(lx - 2), G0 - 1, 4, 1, A[3]);
  }
  const body = rotEl(bx, by, brx, bry, -0.28);
  p.ball(bx, by, brx, bry, R, body);
  const breast = elT(bx - brx * 0.38, by + bry * 0.18, brx * 0.6, bry * 0.78);
  p.ball(bx - brx * 0.38, by + bry * 0.18, brx * 0.6, bry * 0.78, g.dark ? darker(S) : S, (x, y) => body(x, y) && breast(x, y));
  markings(p, g, body, bx - brx, by - bry, brx * 2, bry * 2);
  // crista
  const crest = baby ? 'nenhuma' : g.crest;
  if (crest === 'penacho') for (let i = 0; i < 3; i++) p.ball(hx + 2, hy - hr, 3, 4, i === 1 ? g.W : R, tear(hx + 3 + i * 2.4, hy - hr - 5 - (i === 1 ? 2 : 0), hx + i, hy - hr * 0.5, 1.7, 0.85));
  else if (crest === 'longo') for (let i = 0; i < 2; i++) p.ball(hx + 6, hy - hr, 6, 3, g.W, capsule(hx + 1, hy - hr * 0.6, hx + 10 + i * 2, hy - hr - 4 + i * 3 + s, 1.5, 0.7));
  else if (crest === 'coroa') for (let i = 0; i < 5; i++) { const ang = -2.4 + i * 0.32; p.ball(hx, hy - hr, 2, 3, g.W, tear(hx + Math.cos(ang) * (hr + 4), hy + Math.sin(ang) * (hr + 4), hx + Math.cos(ang) * hr * 0.6, hy + Math.sin(ang) * hr * 0.6, 1.3, 0.8)); p.set(Math.round(hx + Math.cos(ang) * (hr + 3.5)), Math.round(hy + Math.sin(ang) * (hr + 3.5)), g.E[0]); }
  p.ball(hx, hy, hr, hr, R);
  if (g.mask) p.fill((x, y) => elT(hx - 1, hy - 0.5, hr * 0.85, hr * 0.42)(x, y) && (p.get(Math.floor(x), Math.floor(y)) >>> 24), R[3]);
  // bico
  const bl = (baby ? 3 : 4.6) * (g.beakK || 1), bxp = hx - hr + 1, byp = hy + 0.8;
  p.ball(bxp - 1, byp, bl, 2, A, tri(bxp + 0.5, byp - 1.8, bxp - bl, byp + (g.hook ? 1 : 0.2), bxp + 0.5, byp + 1.8));
  if (g.hook && !baby) p.set(Math.round(bxp - bl + 0.5), Math.round(byp + 1.5), A[3]);
  p.line(Math.round(bxp - bl * 0.6), Math.round(byp + 0.5), Math.round(bxp), Math.round(byp + 0.5), A[3]);
  if (baby) p.ball(bx + 1, by - 1, 4.5, 3, R, rotEl(bx + 1, by - 1 + s, 4.6, 2.8, 0.45));
  else featherWing(p, g, bx - 1, by - bry * 0.3, fr, false, st);
  sideEye(p, hx - hr * 0.5, hy - hr * 0.45, expr, g, baby);
  front(p, g, a, fr);
}

function serpe(p, g, fr, expr) {
  const st = g.stage, baby = st === 0;
  const ph = fr ? 0.55 : 0;
  const N = 34, len = baby ? 22 : st === 1 ? 29 : 33, rMax = baby ? 5.4 : st === 1 ? 4.5 : 5;
  const x0 = baby ? 15 : 12, y0 = baby ? 31 : 29;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, rise = (1 - Math.min(1, t * 3.2)) ** 2 * (baby ? 5 : 9);
    const x = x0 + t * len, y = y0 + t * 7 - rise + Math.sin(t * Math.PI * 2 * (baby ? 0.75 : 1.05) + ph + 0.6) * (baby ? 3.5 : 6) * Math.min(1, t * 2.5);
    const r = rMax * (0.66 + 0.34 * Math.min(1, t * 4)) * (1 - t * 0.8) + 0.9;
    pts.push([x, y, r, t]);
  }
  const hx = pts[0][0] - 1, hy = pts[0][1] - 2, hr = baby ? 5.6 : 4.9;
  const a = { hx, hy, hr, top: hy - hr, cx: 26, cy: 25 };
  behind(p, g, a, fr);
  // nadadeira / espinhos nas costas (atrás do corpo)
  for (let i = 3; i < N - 2; i += baby ? 7 : 4) {
    const [x, y, r] = pts[i], [x2, y2] = pts[i + 1];
    const dx = x2 - x, dy = y2 - y, L = Math.hypot(dx, dy) || 1, nx = dy / L, ny = -dx / L;
    const h = r + (g.fin === 'barbatana' ? 3 : 2.4) * (1 - pts[i][3] * 0.6);
    const tip = [x + nx * h + dx / L * 2, y + ny * h + dy / L * 2];
    p.fill(tri(x - dx / L * 1.8, y - dy / L * 1.8, tip[0], tip[1], x + dx / L * 2.2, y + dy / L * 2.2), g.fin === 'barbatana' ? g.S[1] : g.A[1]);
  }
  // corpo: sombreamento cilíndrico com escamas na barriga
  const R = g.R, S = g.S;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const X = x + 0.5, Y = y + 0.5;
    let best = 9, off = 0, tt = 0;
    for (let i = 0; i < N; i++) {
      const [ax, ay, ar, at] = pts[i], [bx2, by2, br] = pts[i + 1];
      const dx = bx2 - ax, dy = by2 - ay, L2 = dx * dx + dy * dy;
      let u = ((X - ax) * dx + (Y - ay) * dy) / L2; u = u < 0 ? 0 : u > 1 ? 1 : u;
      const px = ax + dx * u, py = ay + dy * u, r = ar + (br - ar) * u;
      const d = Math.hypot(X - px, Y - py) / r;
      if (d < best) { best = d; const L = Math.sqrt(L2); off = ((X - px) * (-dy / L) + (Y - py) * (dx / L)) / r; tt = at + u / N; }
    }
    if (best > 1) continue;
    let c;
    if (off < -0.5) c = R[0]; else if (off < 0.05) c = R[1]; else if (off < 0.5) c = R[2]; else c = R[3];
    if (off > 0.3 && off < 0.95) c = Math.floor(tt * len / 2.2) % 2 ? S[1] : S[2];
    if (g.pattern === 'listras' && off < 0.3 && Math.floor(tt * len / 3.2) % 3 === 0) c = g.dark ? g.E[1] : R[3];
    if (g.pattern === 'veias' && Math.abs(off + 0.15) < 0.12) c = g.E[1];
    if (g.pattern === 'estrelas' && ((x * 7 + y * 13) % 23 === 0) && off < 0.3) c = g.E[0];
    p.set(x, y, c);
  }
  // patinhas (estágio final e lendas)
  if (st === 2 || g.legend) for (const i of [Math.round(N * 0.22), Math.round(N * 0.58)]) {
    const [x, y, r] = pts[i];
    p.ball(x, y + r + 1.5, 2, 2.5, darker(R), capsule(x, y + r * 0.5, x - 1.5, y + r + 3, 1.5, 1.2));
    p.set(Math.round(x - 3), Math.round(y + r + 3), g.A[1]); p.set(Math.round(x - 2), Math.round(y + r + 3.5), g.A[1]);
  }
  // ponta da cauda
  const [ex, ey] = pts[N];
  tailPart(p, g, ex - 1, ey, fr, st, g.tail === 'peixe' ? 'peixe' : g.tail);
  // cabeça
  if (!baby) for (let i = 0; i < 3; i++) p.ball(hx + 3, hy, 3, 3, g.dark ? g.E : S, tear(hx + 7 + i * 1.5, hy - 4 + i * 3, hx + 2, hy, 1.8, 0.8));
  horns(p, g, hx + 1, hy, hr, st, g.horns === 'galhada' ? 'galhada' : 'duplos');
  p.ball(hx + 0.5, hy, hr, hr * 0.85, R);
  const snx = hx - hr * 0.8, sny = hy + 1;
  p.ball(snx, sny, hr * (baby ? 0.6 : 0.85), hr * 0.55, R, elT(snx, sny, hr * (baby ? 0.6 : 0.85), hr * 0.55));
  p.fill((x, y) => elT(snx, sny, hr * (baby ? 0.6 : 0.85), hr * 0.55)(x, y) && y > sny + 0.6, S[1]);
  p.set(Math.round(snx - hr * (baby ? 0.55 : 0.8)), Math.round(sny - 1), DARK);
  if (!baby) { // bigodes
    const wx = Math.round(snx - hr * 0.5), wy = Math.round(sny + 1);
    const W = g.dark ? g.E[1] : g.S[0];
    for (let i = 0; i < 5; i++) { p.set(wx - i, wy + Math.round(i * 0.6) + (fr && i > 2 ? 1 : 0), W); p.set(wx + 2 - i, wy + 2 + Math.round(i * 0.4), W); }
  }
  sideEye(p, hx - hr * 0.45, hy - hr * 0.55, expr, g, baby);
  a.gx = hx - 1; a.gy = hy - hr * 0.8;
  front(p, g, a, fr);
}

function batWing(p, g, sx, sy, fr, far, st) {
  const up = fr ? -3 : 0, k = st === 2 ? 1.12 : 0.88;
  const ox = far ? -3 : 0, oy = far ? -2.5 : 0;
  const sh = [sx + ox, sy + oy], wr = [sx + 5 * k + ox, sy - 13 * k + up + oy];
  const t0 = [sx + 17 * k + ox, sy - 12 * k + up * 0.6 + oy], t1 = [sx + 19 * k + ox, sy - 4 * k + oy], t2 = [sx + 13 * k + ox, sy + 2 + oy];
  const n0 = [(t0[0] + t1[0]) / 2 - 3, (t0[1] + t1[1]) / 2], n1 = [(t1[0] + t2[0]) / 2 - 3, (t1[1] + t2[1]) / 2 - 1];
  const mem = poly([sh, wr, t0, n0, t1, n1, t2, [sx + 4 + ox, sy + 3 + oy]]);
  const W = far ? darker(g.W) : g.W;
  p.fill(mem, (x, y) => (y < (wr[1] + t1[1]) / 2 ? W[1] : W[2]));
  const B = far ? g.R[3] : g.R[2];
  p.line(sh[0], sh[1], wr[0], wr[1], B); p.line(sh[0] + 1, sh[1], wr[0] + 1, wr[1], B);
  for (const t of [t0, t1, t2]) p.line(wr[0], wr[1], t[0], t[1], B);
  p.set(Math.round(wr[0] - 1), Math.round(wr[1] - 1), g.A[1]);
}
function draco(p, g, fr, expr) {
  const st = g.stage, baby = st === 0, s = fr ? 1 : 0;
  const G0 = 44, R = g.R, S = g.S;
  const tw = baby ? 8.5 : st === 1 ? 9.5 : 10.5, th = baby ? 6.8 : st === 1 ? 6.5 : 7;
  const tcx = 28, tcy = G0 - (baby ? 4 : 6.5) - th * 0.6;
  const hr = baby ? 6.6 : 5.3, neckL = baby ? 3 : st === 1 ? 8 : 10;
  const hx = tcx - tw * 0.7 - neckL * 0.45, hy = tcy - th - neckL * 0.75 - (baby ? 0 : 1) + s * 0.5;
  const a = { hx, hy, hr, top: hy - hr, cx: tcx - 2, cy: tcy - 8 };
  behind(p, g, a, fr);
  if (!baby) batWing(p, g, tcx - 1, tcy - th + 1, fr, true, st);
  // cauda
  const tailT = or(capsule(tcx + tw * 0.55, tcy, tcx + tw + 6, tcy + 3.5, th * 0.62, 2.5), capsule(tcx + tw + 6, tcy + 3.5, 45, tcy - 2 + s, 2.5, 1.1));
  p.ball(tcx + tw + 4, tcy + 1, 11, 6, R, tailT);
  tailPart(p, g, 44, tcy - 2 + s, fr, st, g.tail);
  // perna de trás (lado de lá)
  p.ball(tcx + tw * 0.25 + 3, tcy + th * 0.4, 3.5, 4, darker(R), capsule(tcx + tw * 0.25 + 3, tcy + 1, tcx + tw * 0.1 + 3, G0 - 1.5, 3.2, 2));
  const body = rotEl(tcx, tcy, tw, th, -0.18);
  p.ball(tcx, tcy, tw, th, R, body);
  p.fill((x, y) => body(x, y) && y > tcy + th * 0.15 && x < tcx + tw * 0.5, (x, y) => (Math.floor(y) % 2 ? S[1] : S[2]));
  if (!baby) backSpikes(p, g, [[tcx - tw * 0.2, tcy - th + 0.5, 0.9], [tcx + tw * 0.3, tcy - th + 1.2, 0.8], [tcx + tw + 3, tcy + 1, 0.6]]);
  markings(p, g, body, tcx - tw, tcy - th, tw * 2, th * 2);
  // perna de trás (lado de cá)
  const thx = tcx + tw * 0.28, thy = tcy + th * 0.35;
  p.ball(thx, thy, 4.4, 4.6, R);
  p.ball(thx - 1, G0 - 3, 2.6, 3, R, capsule(thx, thy + 2, thx - 1.5, G0 - 1.5, 2.6, 2));
  p.ball(thx - 2.5, G0 - 1, 3.4, 1.6, R, elT(thx - 2.5, G0 - 1.2, 3.4, 1.5));
  for (const dx of [-5, -3.5]) p.set(Math.round(thx + dx), G0 - 1, g.A[1]);
  // braço
  const ax0 = tcx - tw * 0.55, ay0 = tcy + 1;
  p.ball(ax0, ay0 + 3, 2.2, 3.4, R, capsule(ax0, ay0, ax0 - 2.5, tcy + th + 1.5, 2, 1.5));
  p.set(Math.round(ax0 - 4), Math.round(tcy + th + 2), g.A[1]); p.set(Math.round(ax0 - 3), Math.round(tcy + th + 2.5), g.A[1]);
  // pescoço
  const neck = capsule(tcx - tw * 0.55, tcy - th * 0.3, hx + 2, hy + 2, th * 0.68, hr * 0.62);
  p.ball(tcx - tw * 0.6, tcy - th, 6, neckL + 4, R, neck);
  p.fill((x, y) => neck(x, y) && capsule(tcx - tw * 0.75, tcy, hx + 0.5, hy + 3.5, th * 0.32, hr * 0.3)(x, y), (x, y) => (Math.floor(y) % 2 ? S[1] : S[2]));
  if (!baby) backSpikes(p, g, [[hx + 3.5, hy - 1, 0.7], [(hx + tcx) / 2 + 1, (hy + tcy) / 2 - 3.5, 0.75]], 2.5);
  // cabeça
  horns(p, g, hx + 1, hy, hr, st, 'duplos');
  p.ball(hx + 1, hy - 0.5, hr * 0.85, hr * 0.8, R);
  const snx = hx - hr * 0.55, sny = hy + hr * 0.3, srx = hr * (baby ? 0.75 : 1.05), sry = hr * 0.56;
  const sn = supEl(snx, sny, srx, sry, 2.6);
  p.ball(snx, sny, srx, sry, R, sn);
  if (!baby) p.line(Math.round(snx - srx + 1.5), Math.round(sny + sry * 0.45), Math.round(snx + srx * 0.7), Math.round(sny + sry * 0.45), R[3]);
  p.set(Math.round(snx - srx + 1), Math.round(sny - sry * 0.4), DARK);
  if (g.type === 'brasa' && !baby) p.glow(snx - srx - 1, sny + 0.5, 1.8, 1.4, glowRamp(g));
  sideEye(p, hx - hr * 0.15, hy - hr * 0.45, expr, g, baby);
  if (!baby) batWing(p, g, tcx - 3, tcy - th + 2, fr, false, st);
  else p.ball(tcx + 1, tcy - th + 1, 3.5, 2.5, g.W, rotEl(tcx + 1, tcy - th + 1 - s, 3.6, 2.2, -0.6));
  a.gx = hx; a.gy = hy - hr * 0.7;
  front(p, g, a, fr);
}

function divino(p, g, fr, expr) {
  const st = g.stage, baby = st === 0, s = fr ? 1 : 0;
  const cx = 24, R = g.R, S = g.S, A = g.A;
  const hr = baby ? 6.4 : 5;
  const hy = baby ? 17 : 13.5;
  const shY = hy + hr + 1, hemY = baby ? 39 : 42;
  const sw = baby ? 5.5 : 7, hw = baby ? 9 : 12.5;
  const a = { hx: cx, hy, hr, top: hy - hr, cx, cy: hy + 6 };
  behind(p, g, a, fr);
  // faixas flutuando
  for (const sd of [-1, 1]) {
    const pts2 = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8; pts2.push([cx + sd * (sw + 2 + t * 9), shY + 3 + t * 14 + Math.sin(t * 5 + s * 1.5 + (sd > 0 ? 1 : 0)) * 2]); }
    for (let i = 0; i < 8; i++) p.fill(capsule(pts2[i][0], pts2[i][1], pts2[i + 1][0], pts2[i + 1][1], 1.3, 1.3), i < 6 ? A[1] : g.E[1]);
  }
  // cabelo / adorno atrás da cabeça
  const hd = g.head;
  if (hd === 'chama') p.glow(cx, hy - 4, hr * 1.4, hr * 2, glowRamp(g), tear(cx + (fr ? 1 : -1), hy - hr - 9, cx, hy - 1, hr * 1.25, 0.8));
  else if (hd === 'folhas') for (const [ang, L] of [[-2.5, 1.7], [-1.9, 1.9], [-1.25, 1.9], [-0.65, 1.7]]) { const x = cx + Math.cos(ang) * hr * L * 0.85, y = hy + Math.sin(ang) * hr * L * 0.85; p.ball(x, y, 4.2, 2.3, g.S, rotEl(x, y, 4.4, 2.1, ang)); }
  else if (hd === 'cristal') for (const [dx, h, lean] of [[-4, 6, -0.35], [0, 9, 0], [4, 6, 0.35]]) p.ball(cx + dx, hy - hr - h / 2, 2.3, h / 2 + 1, A, crystalT(cx + dx, hy - hr * 0.55, h, 2, lean));
  else if (hd === 'nuvem') for (const [dx, dy, r] of [[-5, -2, 3.2], [-2, -5, 3.6], [2, -5, 3.6], [5, -2, 3.2]]) p.ball(cx + dx, hy + dy, r, r, S);
  else if (hd === 'raio') for (const [dx, h] of [[-4, 7], [0, 9], [4, 7]]) p.fill(poly([[cx + dx - 1.5, hy - hr + 2], [cx + dx + 1, hy - hr - h * 0.5], [cx + dx - 0.5, hy - hr - h * 0.45], [cx + dx + 1.5, hy - hr - h], [cx + dx + 0.5, hy - hr + 2]]), g.E[1]);
  else if (hd === 'raios') for (let i = 0; i < 7; i++) { const ang = -Math.PI + 0.25 + i * (Math.PI - 0.5) / 6; p.fill(tri(cx + Math.cos(ang) * hr - 1.2, hy + Math.sin(ang) * hr, cx + Math.cos(ang) * (hr + 6), hy + Math.sin(ang) * (hr + 6), cx + Math.cos(ang) * hr + 1.2, hy + Math.sin(ang) * hr), i % 2 ? A[1] : g.E[1]); }
  else if (hd === 'ondas') for (const sd of [-1, 1]) p.ball(cx + sd * (hr + 1), hy + 5, 3, 7, S, capsule(cx + sd * (hr - 1), hy - 1, cx + sd * (hr + 3), hy + 11 + (sd > 0 ? s : -s), 2.6, 1.6));
  // manto
  const robe = (x, y) => {
    if (y < shY || y > hemY + Math.sin(x * 0.9 + s * 2) * 1.3) return false;
    const t = (y - shY) / (hemY - shY), half = sw + (hw - sw) * Math.pow(t, 0.8);
    return Math.abs(x - cx) <= half;
  };
  p.ball(cx - 2, shY + (hemY - shY) * 0.45, hw + 1, (hemY - shY) * 0.65, R, robe);
  for (const dx of [-8, -4, 4, 8]) for (let y = shY + 5; y < hemY + 2; y++) if (robe(cx + dx + 0.5, y + 0.5) && (y + dx) % 5 !== 0) p.set(cx + dx, y, R[3]);
  p.fill((x, y) => robe(x, y) && Math.abs(x - cx) <= 2.2, (x, y) => (Math.abs(x - cx) > 1.4 ? A[1] : S[1]));
  if (!g.gem) { p.set(cx - 1, shY + 4, g.E[0]); p.set(cx, shY + 4, g.E[1]); }
  markings(p, g, robe, cx - hw, shY, hw * 2, hemY - shY);
  // mangas e mãos
  for (const sd of [-1, 1]) {
    const hand = g.pose === 'orando' ? [cx + sd * 1.5, shY + 7] : [cx + sd * (sw + 6), shY + 9 - s];
    p.ball(cx + sd * (sw + 2), shY + 5, 4.5, 5.5, sd < 0 ? R : darker(R), capsule(cx + sd * (sw - 0.5), shY + 1.5, hand[0], hand[1], 2.8, 2.3));
    p.ball(hand[0], hand[1] + 1, 1.8, 1.8, g.skin);
  }
  // cabeça
  p.ball(cx, hy, hr, hr * 1.05, g.skin);
  if (hd === 'veu') {
    const hood = (x, y) => elT(cx, hy - 0.8, hr + 2, hr + 2.2)(x, y) && !elT(cx, hy + 1.2, hr * 0.78, hr * 0.85)(x, y) && y < hy + hr + 1.5;
    p.ball(cx - 1, hy - 1, hr + 2, hr + 2, R, hood);
    p.fill(elT(cx, hy + 1.2, hr * 0.78, hr * 0.85), R[3]);
  } else if (hd === 'elmo') {
    p.ball(cx, hy - 1.5, hr + 1, hr * 0.9, A, (x, y) => elT(cx, hy - 1.5, hr + 1, hr * 0.9)(x, y) && y < hy + 0.5);
    p.rect(cx - hr, Math.round(hy), Math.round(hr * 2), 1, A[3]);
  } else if (hd === 'coroa' && !g.crown) {
    for (const dx of [-3, 0, 3]) p.fill(tri(cx + dx - 1.5, hy - hr + 1.5, cx + dx, hy - hr - 3.5, cx + dx + 1.5, hy - hr + 1.5), A[1]);
  }
  frontEyes(p, cx, hy + (hd === 'veu' ? 1.2 : 0.2), hd === 'veu' ? 2.5 : 3, expr, g, hd === 'veu' ? 'slit' : 'mask');
  a.gy = hy - hr * 0.6;
  front(p, g, a, fr);
}

function colosso(p, g, fr, expr) {
  const st = g.stage, baby = st === 0, s = fr ? 1 : 0;
  const cx = 24, G0 = 44, R = g.R, A = g.A;
  if (baby) {
    const a = { hx: cx, hy: 26, hr: 8, top: 24, cx, cy: 30 };
    behind(p, g, a, fr);
    for (const sd of [-1, 1]) p.ball(cx + sd * 5, G0 - 2, 3, 2.4, darker(R));
    p.ball(cx, 34, 10, 9, R, supEl(cx, 34, 10, 9, 2.6));
    for (const sd of [-1, 1]) p.ball(cx + sd * 10.5, 36 - s * sd * 0.5, 3, 3, R);
    p.glow(cx, 38, 2.2, 2.2, glowRamp(g));
    colossoTop(p, g, cx, 26, 8, fr, st);
    frontEyes(p, cx, 31, 4, expr, g, g.dark ? 'slit' : 'round');
    front(p, g, a, fr);
    return;
  }
  const tw = st === 1 ? 8.5 : 10, th = st === 1 ? 7 : 8;
  const tcy = G0 - 7 - th, top = tcy - th;
  const a = { hx: cx, hy: top - 3, hr: 4.5, top: top - 7, cx, cy: tcy - 2 };
  behind(p, g, a, fr);
  for (const sd of [-1, 1]) p.ball(cx + sd * 4.5, G0 - 3.5, 3.3, 3.6, darker(R), supEl(cx + sd * 4.5, G0 - 3.6, 3.3, 3.6, 3));
  const body = supEl(cx, tcy, tw, th, 3.2);
  p.ball(cx - 2, tcy - 2, tw * 1.1, th * 1.1, R, body);
  for (const dy of [-3, 3]) for (let x = Math.round(cx - tw + 2); x < cx + tw - 2; x++) if (body(x + 0.5, tcy + dy + 0.5) && Math.abs(x - cx) > 3) p.set(x, Math.round(tcy + dy), R[3]);
  markings(p, g, body, cx - tw, top, tw * 2, th * 2);
  p.fill(ring(cx, tcy, 3.6, 3.6, 0.45), A[1]);
  p.glow(cx, tcy, 2.4, 2.4, glowRamp(g));
  for (const sd of [-1, 1]) {
    const shx = cx + sd * (tw + 1), shy = top + 2.5;
    const fist = [cx + sd * (tw + 3.5), tcy + 6 - s];
    p.ball(shx, (shy + fist[1]) / 2, 3.5, 7, sd < 0 ? R : darker(R), capsule(shx, shy, fist[0], fist[1], 2.9, 2.6));
    p.ball(fist[0], fist[1] + 1, 3.7, 3.4, R);
    p.ball(shx, shy, 5, 4.4, A);
  }
  p.ball(cx, top - 2.5, 4.6, 3.9, R, supEl(cx, top - 2.5, 4.6, 3.9, 3));
  colossoTop(p, g, cx, top - 5, 4.6, fr, st, tw);
  p.rect(cx - 4, Math.round(top - 3), 8, 2, DARK);
  frontEyes(p, cx, Math.round(top - 3), 2, expr, g, 'slit');
  a.gy = top - 6;
  front(p, g, a, fr);
}
function colossoTop(p, g, cx, y, w, fr, st, tw = 0) {
  const A = g.A;
  switch (g.type) {
    case 'pedra': case 'gelo': case 'luz': {
      const C = g.type === 'gelo' ? [WHITE, g.E[0], g.E[1], g.E[2]] : A;
      for (const [dx, h, lean] of [[-w * 0.55, 5, -0.3], [0, 7, 0], [w * 0.55, 5, 0.3]]) p.ball(cx + dx, y - h / 2, 2, h / 2 + 1, C, crystalT(cx + dx, y + 2, h, 1.8, lean));
      if (tw) for (const sd of [-1, 1]) p.ball(cx + sd * (tw + 1), y + 3, 2, 3, C, crystalT(cx + sd * (tw + 1.5), y + 4.5, 6, 1.8, sd * 0.4));
      break;
    }
    case 'mata': for (let x = Math.round(cx - w); x <= cx + w; x++) { const d = 1 + Math.round(1 + Math.sin(x * 1.3)); for (let q = 0; q < d; q++) p.set(x, Math.round(y + 2 + q), q ? g.S[2] : g.S[1]); } p.ball(cx + w * 0.5, y + 1, 1.6, 1.6, [WHITE, g.E[0], g.E[1], g.E[2]]); break;
    case 'brasa': p.glow(cx, y - 1, 3.5, 5, glowRamp(g), tear(cx + (fr ? 1 : -1), y - 7, cx, y + 2, 3.4, 0.85)); break;
    case 'raio': for (const sd of [-1, 1]) p.fill(poly([[cx + sd * 2, y + 2], [cx + sd * 5, y - 3], [cx + sd * 4, y - 3], [cx + sd * 6, y - 7], [cx + sd * 3, y - 2], [cx + sd * 4, y - 2]]), g.E[1]); break;
    case 'vento': for (const [dx, dy, r] of [[-3, 1, 2.6], [0, -1, 3], [3, 1, 2.6]]) p.ball(cx + dx, y + dy, r, r, g.S); break;
    default: p.ball(cx, y + 1, 2, 2, A); break;
  }
}

function aquatico(p, g, fr, expr) {
  const st = g.stage, baby = st === 0, s = fr ? 1 : 0;
  const R = g.R, S = g.S, A = g.A;
  const by = baby ? 29 : 27, hx = baby ? 15 : 11, len = baby ? 19 : st === 1 ? 27 : 31, r = baby ? 7.6 : st === 1 ? 7.6 : 8.6;
  const tailX = hx + len, koi = g.fish === 'carpa';
  const a = { hx: hx + r * 0.8, hy: by - 1, hr: r * 0.8, top: by - r - 1, cx: hx + len * 0.45, cy: by - 2 };
  behind(p, g, a, fr);
  // barbatana de lá
  p.ball(hx + r * 1.4, by + r * 0.55, 4, 2, darker(A), rotEl(hx + r * 1.6, by + r * 0.5, 4.2, 1.8, 0.7 - s * 0.2));
  // cauda
  if (koi) for (const sd of [-1, 1]) p.ball(tailX + 4, by + sd * 4, 6, 5, sd < 0 ? g.W : darker(g.W), rotEl(tailX + 3.5, by + 1 + sd * (4 + s), 6.5, 2.6, sd * 0.75));
  else for (const sd of [-1, 1]) p.ball(tailX + 2, by + sd * 4, 4, 4, A, tear(tailX + 6 + s, by + 1 + sd * (6 - s), tailX - 2, by + 1, 2.6, 0.85));
  // corpo
  const body = tear(tailX, by + 1, hx + r * 0.95, by, r, 0.72);
  p.ball(hx + r, by - 1, r * 1.7, r * 1.05, R, body);
  p.fill((x, y) => body(x, y) && y > by + r * 0.22, (x, y) => (koi ? S[1] : (Math.floor(y) % 2 && x < tailX - 8 ? S[1] : S[2])));
  if (koi) { const rr = rng(g.seed + 5); for (let i = 0; i < 4; i++) { const x = hx + 4 + rr() * len * 0.7, y = by - r * 0.2 + (rr() - 0.5) * r * 0.8; p.fill((xx, yy) => body(xx, yy) && elT(x, y, 2.8, 2)(xx, yy), A[1]); } }
  markings(p, g, body, hx, by - r, len, r * 2);
  // dorsal
  const dx = hx + len * 0.45;
  p.ball(dx + 1, by - r - 1, 4, 4, koi ? g.W : A, tri(dx - 3.5, by - r * 0.72, dx + 3 + s * 0.5, by - r - 5.5 - (st === 2 ? 1.5 : 0), dx + 4.5, by - r * 0.62));
  if (st === 2 || g.legend) for (let i = 0; i < 3; i++) p.ball(hx + r * 0.6, by - r, 2, 3, g.W, tear(hx + r * 0.2 + i * 2.6, by - r - 4.5 - (i === 1 ? 1.5 : 0), hx + r * 0.6 + i * 2, by - r * 0.55, 1.5, 0.85));
  // barbatana de cá
  p.ball(hx + r * 1.15, by + r * 0.6, 4.5, 2.2, A, rotEl(hx + r * 1.2, by + r * 0.62, 4.6, 2, 0.6 + s * 0.25));
  // boca e bigodes
  p.line(Math.round(hx + 0.5), Math.round(by + r * 0.25), Math.round(hx + r * 0.55), Math.round(by + r * 0.3), R[3]);
  if (koi && !baby) for (let i = 0; i < 5; i++) p.set(Math.round(hx + 1 - i * 0.6), Math.round(by + r * 0.35 + i * 0.8 + (fr && i > 2 ? 1 : 0)), S[0]);
  sideEye(p, hx + r * 0.35, by - r * 0.38, expr, g, baby);
  // bolhas
  p.fill(ring(hx - 3.5, by - 8 - s * 2, 1.8, 1.8, 0.3), withAlpha(WHITE, 200));
  if (st > 0) p.fill(ring(hx - 6, by - 14 + s, 1.2, 1.2, 0.2), withAlpha(WHITE, 180));
  a.gx = hx + r * 0.5; a.gy = by - r * 0.85;
  front(p, g, a, fr);
}

function inseto(p, g, fr, expr) {
  const st = g.stage, baby = st === 0, s = fr ? 1 : 0;
  const cx = 24, R = g.R, S = g.S, A = g.A;
  if (baby) { // larva de perfil
    const a = { hx: 13, hy: 33, hr: 5, top: 28, cx: 24, cy: 32 };
    behind(p, g, a, fr);
    for (let i = 5; i >= 0; i--) {
      const x = 15 + i * 4.6, y = 37 - Math.abs(Math.sin(i * 0.9 + s)) * 2.5 - (i === 0 ? 3 : 0), r = i === 0 ? 6 : 4.4 - i * 0.25;
      p.ball(x, y, r, r * 0.95, i % 2 ? darker(R) : R);
      if (i) { p.set(Math.round(x), Math.round(y + r), A[2]); p.set(Math.round(x), Math.round(y - r + 1), i % 2 ? g.E[1] : S[1]); }
    }
    p.line(13, 29, 10, 24 - s, A[2]); p.line(16, 29, 17, 24 + s, A[2]); p.set(10, 24 - s, g.E[0]); p.set(17, 24 + s, g.E[0]);
    sideEye(p, 10.5, 32, expr, g, true);
    front(p, g, a, fr);
    return;
  }
  const k = st === 1 ? 0.85 : 1;
  const a = { hx: cx, hy: 14, hr: 4, top: 9, cx, cy: 24 };
  behind(p, g, a, fr);
  if (g.bug === 'besouro') {
    const deep = [mix(R[2], DARK, 0.35), mix(R[3], DARK, 0.45), mix(R[3], DARK, 0.62), mix(R[3], DARK, 0.75)];
    for (const sd of [-1, 1]) for (const [dy, dx] of [[0, 0], [4, 1], [8, 0]]) {
      const y0 = 27 + dy, x1 = cx + sd * (12 + dx) * k, y1 = 31 + dy + (dy === 4 ? s : 0);
      p.line(cx + sd * 6, y0, x1, y1, deep[2]); p.line(cx + sd * 6, y0 + 1, x1, y1 + 1, deep[2]);
      p.set(Math.round(x1 + sd), Math.round(y1 + 1), deep[3]);
    }
    const shell = supEl(cx, 31, 11 * k, 9.5 * k, 2.2);
    p.ball(cx - 2, 28, 11 * k, 10 * k, R, shell);
    p.fill((x, y) => shell(x, y) && !supEl(cx, 31, 11 * k - 1.2, 9.5 * k - 1.2, 2.2)(x, y), (x, y) => (y < 31 ? A[1] : A[2])); // borda da casca
    p.fill((x, y) => shell(x, y) && Math.abs(x - cx) < 0.7, deep[2]);                                              // divisão das asas
    for (const sd of [-1, 1]) p.fill((x, y) => shell(x, y) && ((x - cx - sd * 5) / 1.6) ** 2 + ((y - 27) / 3.2) ** 2 < 1, withAlpha(WHITE, 140)); // brilho
    markings(p, g, shell, cx - 11, 22, 22, 18);
    p.ball(cx - 1, 15, 2.4, 5, A, tear(cx + 2.5 + (fr ? 0.5 : 0), st === 2 ? 7 : 10, cx, 18.5, 2.1, 0.8));            // chifre
    if (st === 2) for (const sd of [-1, 1]) p.ball(cx + sd * 4, 17, 1.6, 2.6, A, tear(cx + sd * 6.5, 13, cx + sd * 3.5, 19.5, 1.4, 0.8));
    p.ball(cx - 1, 21, 7 * k, 4, deep, supEl(cx, 21.5, 7 * k, 4, 2.4));                                          // carapaça da frente
    frontEyes(p, cx, 21, 5, expr, g, 'slit');
    a.gy = 19;
    front(p, g, a, fr);
    return;
  }
  // mariposa / borboleta
  const flap = s ? 1.5 : 0;
  const up = (sd) => rotEl(cx + sd * 10 * k, 19 - flap, 10.5 * k, 7 * k, sd * 0.55);
  const lo = (sd) => rotEl(cx + sd * 8 * k, 31 + flap * 0.5, 7.5 * k, 6 * k, sd * -0.5);
  const W = g.W;
  for (const sd of [-1, 1]) {
    for (const [t, cxw, cyw, rw] of [[up(sd), cx + sd * 10 * k, 19 - flap, 10.5 * k], [lo(sd), cx + sd * 8 * k, 31 + flap * 0.5, 7.5 * k]]) {
      p.fill(t, (x, y) => {
        const d = Math.hypot(x - cxw, y - cyw) / rw;
        if (d > 0.82) return A[1];
        if (d > 0.62) return sd < 0 ? W[0] : W[1];
        return sd < 0 ? W[1] : W[2];
      });
    }
    // olho na asa
    const ex = cx + sd * 11 * k, ey = 18 - flap;
    p.fill(ring(ex, ey, 3, 3, 0.25), g.dark ? g.E[1] : DARK); p.fill(elT(ex, ey, 1.6, 1.6), g.E[0]);
    for (let i = 0; i < 3; i++) p.line(cx + sd * 2, 22, cx + sd * (6 + i * 4) * k, 13 + i * 3 - flap, W[3]);
  }
  p.ball(cx, 28, 2.8, 8, darker(R), capsule(cx, 20, cx, 36, 2.6, 1.6));
  for (let y = 26; y < 36; y += 2) p.rect(cx - 1, y, 3, 1, R[3]);
  if (g.bug === 'mariposa') p.ball(cx, 19.5, 4, 3, S);
  p.ball(cx, 14, 4, 3.6, R);
  frontEyes(p, cx, 13, 2.5, expr, g, g.dark ? 'slit' : 'round');
  for (const sd of [-1, 1]) {
    const tip = [cx + sd * 7, 3 + s];
    p.line(cx + sd * 1.5, 10.5, tip[0], tip[1], R[3]);
    if (g.bug === 'mariposa') for (let i = 1; i < 4; i++) { const x = Math.round(cx + sd * (1.5 + i * 1.4)), y = Math.round(10.5 - i * 1.9 + s * i / 4); p.set(x - sd, y - 1, R[2]); p.set(x + sd, y - 1, R[2]); }
    else p.ball(tip[0], tip[1], 1.4, 1.4, [WHITE, g.E[0], g.E[1], g.E[2]]);
  }
  front(p, g, a, fr);
}

const PLANS = { fera, ave, serpe, draco, divino, colosso, aquatico, inseto };

export function mythCreature(g, fr = 0, expr = 'neutral') {
  const p = new Pix(48, 48);
  (PLANS[g.plan] || fera)(p, g, fr, expr);
  p.outline(darkOutline);
  if (g.legend) { // aura das lendas
    p.outline(null, withAlpha(g.E[1], 95));
  }
  if (g.plan === 'divino') for (let y = 40; y < 48; y++) for (let x = 0; x < 48; x++) { const c = p.get(x, y); if (c >>> 24) p.set(x, y, withAlpha(c, Math.min(c >>> 24, 215 - (y - 40) * 12))); }
  return p;
}
