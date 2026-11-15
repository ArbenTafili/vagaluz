// main.js — inicialização, escala inteira, loop principal e troca de cenas.
import { G, updateTasks, setupKeyboard, pressA, clearQueue } from './engine.js';
import { initAudio, setSound, sfx } from './audio.js';
import { initIcons, updateHud, soundIcon, openParty, openDex, updateCompCard, $, toast, fadeOut, fadeIn } from './ui.js';
import { World } from './world.js';
import { Battle } from './battle.js';
import { PetScene, HatchScene } from './pet.js';
import { TitleScene, EvolveScene } from './scenes.js';
import { tickPet, writeSave, wipeSave } from './state.js';
import { validateMaps } from './maps.js';

const canvas = $('#game');
const ctx = canvas.getContext('2d', { alpha: false });
G.canvas = canvas; G.ctx = ctx;

// ---------- parâmetros de teste: ?hora=21  ?reset ----------
const params = new URLSearchParams(location.search);
if (params.has('hora')) G.hourOverride = Math.max(0, Math.min(23.99, parseFloat(params.get('hora')) || 0));
if (params.has('reset')) wipeSave();
const mapErrs = validateMaps(); if (mapErrs.length) console.warn('Mapas com problema:', mapErrs);

// ---------- escala inteira (pixels nítidos) ----------
function layout() {
  const r = $('#view').getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const s = Math.max(1, Math.round(r.width * dpr / 240));
  G.s = s; G.dpr = dpr; G.cssPx = s / dpr;
  G.iw = Math.max(120, Math.ceil(r.width * dpr / s));
  G.ih = Math.max(120, Math.ceil(r.height * dpr / s));
  canvas.width = G.iw; canvas.height = G.ih;
  canvas.style.width = (G.iw * s / dpr) + 'px';
  canvas.style.height = (G.ih * s / dpr) + 'px';
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', layout);
if (window.ResizeObserver) new ResizeObserver(() => layout()).observe($('#view'));
window.addEventListener('orientationchange', () => setTimeout(layout, 200));
layout();

// ---------- cenas ----------
G.world = new World();
const SCENES = {
  title: () => new TitleScene(), hatch: () => new HatchScene(), pet: () => new PetScene(),
  battle: () => new Battle(), evolve: () => new EvolveScene(), world: () => G.world,
};
G.goto = async (name, args = {}) => {
  if (G.scene && G.scene.exit) G.scene.exit();
  clearQueue();
  const sc = SCENES[name]();
  G.scene = sc; G.sceneName = name;
  if (name === 'world') {
    if (!G.world.m) { const p = G.save.pos; G.world.load(p.map, p.x, p.y, p.dir); }
    sc.enter(); updateCompCard();
  } else await sc.start(args);
};

// ---------- entrada ----------
let gestured = false;
const firstGesture = () => { if (gestured) return; gestured = true; initAudio(); setSound(G.save ? G.save.settings.sound : true); };
window.addEventListener('pointerdown', firstGesture, { capture: true });
setupKeyboard(firstGesture);
// toque no mapa = andar até lá / interagir
canvas.addEventListener('pointerdown', e => {
  if (G.mode === 'world' && $('#msg').classList.contains('hidden') && !G.busy) G.world.tapAt(e.clientX, e.clientY);
});
// tocar na tela avança diálogos (e o texto da batalha)
$('#view').addEventListener('pointerdown', e => {
  if (e.target.closest('.choices') || e.target.closest('#hud')) return;
  const msgOpen = !$('#msg').classList.contains('hidden') && !$('#msg .choices').children.length;
  if (msgOpen || G.mode === 'battle') pressA('tap');
});
$('#btext').addEventListener('pointerdown', () => pressA('tap'));

async function openPet() {
  if (G.mode !== 'world' || G.world.locked || G.busy || G.world.p.moving) return;
  sfx('select'); G.busy = true; await fadeOut(220); G.busy = false;
  await G.goto('pet', { home: false }); await fadeIn(220);
}
$('#btn-pet').addEventListener('click', openPet);
$('#comp-card').addEventListener('click', openPet);
$('#btn-dex').addEventListener('click', async () => {
  if (G.mode !== 'world' || G.world.locked || G.busy) return;
  sfx('select'); G.world.locked = true; G.world.path = [];
  await openDex();
  G.world.locked = false;
});
$('#hud-pet').addEventListener('click', () => { if (G.mode === 'world') openPet(); });
$('#btn-party').addEventListener('click', async () => {
  if (G.mode !== 'world' || G.world.locked || G.busy) return;
  sfx('select'); G.world.locked = true; G.world.path = [];
  await openParty('view', { canStore: true });
  G.world.locked = false; updateCompCard();
});
$('#btn-sound').addEventListener('click', () => {
  if (!G.save) return;
  G.save.settings.sound = !G.save.settings.sound;
  initAudio(); setSound(G.save.settings.sound); soundIcon(G.save.settings.sound); writeSave(G.save);
  toast(G.save.settings.sound ? 'Som ligado' : 'Som desligado');
});
initIcons();
soundIcon(true);

// ---------- transição em losangos ----------
function drawWipe(p) {
  const cell = 16, cols = Math.ceil(G.iw / cell) + 1, rows = Math.ceil(G.ih / cell) + 1;
  ctx.fillStyle = '#0b0a18';
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const d = (i / cols + j / rows) / 2, k = Math.max(0, Math.min(1, p * 1.6 - d * 0.6));
    if (k <= 0) continue;
    const r = k * cell, cx = i * cell, cy = j * cell;
    ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy); ctx.fill();
  }
}

// ---------- loop ----------
let last = performance.now(), secT = 0, saveT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  G.t += dt; G.dt = dt;
  updateTasks(dt);
  if (G.scene) {
    if (G.scene.update) G.scene.update(dt);
    if (G.scene.draw) G.scene.draw(ctx);
  }
  if (G.wipe) drawWipe(G.wipe.p);
  secT += dt; saveT += dt;
  if (secT >= 1) {
    secT = 0;
    if (G.save && G.save.hatched) {
      tickPet(G.save);
      if (G.mode === 'world') { updateHud(G.world.m && G.world.m.name); updateCompCard(); }
      else if (G.mode === 'pet') updateHud(G.scene.home ? 'Sua casa' : 'Acampamento');
    }
  }
  if (saveT >= 15) { saveT = 0; if (G.save && G.save.hatched) writeSave(G.save); }
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => { if (document.hidden && G.save && G.save.hatched) writeSave(G.save); else last = performance.now(); });

G.goto('title');
requestAnimationFrame(frame);
// se o navegador pausar o requestAnimationFrame com a página visível, o jogo segue andando
setInterval(() => { const now = performance.now(); if (!document.hidden && now - last > 300) frame0(now); }, 120);
function frame0(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; G.t += dt; updateTasks(dt); if (G.scene && G.scene.update) G.scene.update(dt); }

// ---------- offline (service worker) ----------
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
