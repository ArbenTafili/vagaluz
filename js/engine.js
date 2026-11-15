// engine.js — estado global, loop de tarefas (tweens/esperas), cache de sprites, relógio e entrada.
import { toCanvas, hex } from './gfx.js';

export const G = {
  t: 0, dt: 0, iw: 240, ih: 320, s: 3, dpr: 1, cssPx: 1.5,
  canvas: null, ctx: null, scene: null, save: null,
  hourOverride: null, busy: false,
};

// ---------- tarefas: esperas e tweens movidos pelo loop ----------
const tasks = [];
export const ease = {
  linear: t => t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  inQuad: t => t * t,
  inOut: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
export function wait(ms) { return new Promise(res => tasks.push({ left: ms / 1000, res })); }
export function tween(obj, props, ms, e = ease.outQuad) {
  return new Promise(res => {
    const from = {}; for (const k in props) from[k] = obj[k];
    tasks.push({ obj, from, to: props, dur: Math.max(0.001, ms / 1000), el: 0, e, res });
  });
}
export function updateTasks(dt) {
  for (let i = tasks.length - 1; i >= 0; i--) {
    const k = tasks[i];
    if (k.obj) {
      k.el += dt; const t = Math.min(1, k.el / k.dur), v = k.e(t);
      for (const p in k.to) k.obj[p] = k.from[p] + (k.to[p] - k.from[p]) * v;
      if (t >= 1) { tasks.splice(i, 1); k.res(); }
    } else {
      k.left -= dt; if (k.left <= 0) { tasks.splice(i, 1); k.res(); }
    }
  }
}

// ---------- cache de sprites (Pix -> canvas) ----------
const cache = new Map();
export function spr(key, make) {
  let c = cache.get(key);
  if (!c) { c = toCanvas(make()); cache.set(key, c); }
  return c;
}
export function sprSil(key, make, color = '#ffffff') {
  return spr(key + '|sil' + color, () => make().silhouette(hex(color)));
}

// ---------- relógio real -> fase do dia ----------
export function hourNow() {
  if (G.hourOverride != null) return G.hourOverride;
  const d = new Date(); return d.getHours() + d.getMinutes() / 60;
}
const KEYS = [ // hora, escuridão, tinta multiplicativa
  [0, 0.48, [84, 96, 168]], [4.5, 0.48, [84, 96, 168]], [5.5, 0.4, [235, 160, 175]],
  [6.5, 0.12, [255, 214, 190]], [7.5, 0, [255, 255, 255]], [16.5, 0, [255, 255, 255]],
  [17.5, 0.04, [255, 208, 160]], [18.5, 0.3, [226, 146, 168]], [19.5, 0.46, [96, 100, 176]], [24, 0.48, [84, 96, 168]],
];
export function dayPhase(h = hourNow()) {
  let a = KEYS[0], b = KEYS[1];
  for (let i = 0; i < KEYS.length - 1; i++) if (h >= KEYS[i][0] && h <= KEYS[i + 1][0]) { a = KEYS[i]; b = KEYS[i + 1]; break; }
  const t = (h - a[0]) / Math.max(0.001, b[0] - a[0]);
  const dark = a[1] + (b[1] - a[1]) * t;
  const tint = a[2].map((v, i) => Math.round(v + (b[2][i] - v) * t));
  const name = h >= 5 && h < 7 ? 'amanhecer' : h >= 7 && h < 17 ? 'dia' : h >= 17 && h < 19.5 ? 'entardecer' : 'noite';
  return { h, dark, tint, name, night: dark > 0.3, lampsOn: dark > 0.12, period: dark > 0.3 ? 'noite' : 'dia' };
}

// ---------- entrada ----------
export const input = { dir: -1, run: false, keys: new Set() };
const pressListeners = [];
let queued = [];
// Botão A / toque na caixa de texto: primeiro atende quem está esperando (diálogo), senão vai para a cena.
export function pressA(source = 'btn') {
  if (pressListeners.length) { const fn = pressListeners.shift(); fn(source); return; }
  queued.push('a');
}
export function pressB() {
  if (pressListeners.length) { const fn = pressListeners.shift(); fn('b'); return; }
  queued.push('b');
}
export function waitPress() { return new Promise(res => pressListeners.push(res)); }
export function cancelWaits() { pressListeners.length = 0; }
export function onNextPress(fn) {
  pressListeners.push(fn);
  return () => { const i = pressListeners.indexOf(fn); if (i >= 0) pressListeners.splice(i, 1); };
}
export function waitPressOr(ms) {
  return new Promise(res => {
    let done = false;
    const cancel = onNextPress(() => { if (!done) { done = true; res('press'); } });
    wait(ms).then(() => { if (!done) { done = true; cancel(); res('timeout'); } });
  });
}
export function consume(k) { const i = queued.indexOf(k); if (i >= 0) { queued.splice(i, 1); return true; } return false; }
export function clearQueue() { queued = []; }

const KEYMAP = { ArrowDown: 0, s: 0, S: 0, ArrowUp: 1, w: 1, W: 1, ArrowLeft: 2, a: 2, A: 2, ArrowRight: 3, d: 3, D: 3 };
export function setupKeyboard(onFirstGesture) {
  window.addEventListener('keydown', e => {
    onFirstGesture && onFirstGesture();
    if (e.key in KEYMAP) { input.keys.add(KEYMAP[e.key]); input.dir = KEYMAP[e.key]; e.preventDefault(); }
    else if (!e.repeat && (e.key === 'z' || e.key === 'Z' || e.key === 'Enter' || e.key === ' ')) { pressA('key'); e.preventDefault(); }
    else if (!e.repeat && (e.key === 'x' || e.key === 'X' || e.key === 'Escape' || e.key === 'Backspace')) { pressB(); input.run = true; }
    else if (e.key === 'Shift') input.run = true;
  });
  window.addEventListener('keyup', e => {
    if (e.key in KEYMAP) { input.keys.delete(KEYMAP[e.key]); input.dir = input.keys.size ? [...input.keys].pop() : -1; }
    if (e.key === 'x' || e.key === 'X' || e.key === 'Shift' || e.key === 'Escape' || e.key === 'Backspace') input.run = false;
  });
}
export function setupDpad(el) {
  let active = null;
  const upd = (e) => {
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < r.width * 0.1) { input.dir = -1; return; }
    input.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
    el.dataset.dir = input.dir;
  };
  el.addEventListener('pointerdown', e => { active = e.pointerId; el.setPointerCapture(e.pointerId); upd(e); e.preventDefault(); });
  el.addEventListener('pointermove', e => { if (e.pointerId === active) upd(e); });
  const end = e => { if (e.pointerId === active) { active = null; input.dir = -1; el.dataset.dir = ''; } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('lostpointercapture', end);
}

// ---------- utilidades ----------
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
export function pickWeighted(list) {
  const total = list.reduce((s, [, w]) => s + w, 0); let r = Math.random() * total;
  for (const [v, w] of list) { r -= w; if (r <= 0) return v; }
  return list[list.length - 1][0];
}
export const DIRS = [[0, 1], [0, -1], [-1, 0], [1, 0]];
