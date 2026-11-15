// pet.js — bichinho virtual: casa, medidores, comer/brincar/banho/dormir, e o ovo que choca.
import { G, spr, wait, tween, ease, dayPhase, rand, clamp } from './engine.js';
import * as S from './sprites.js';
import { makeCanvas, hash2 } from './gfx.js';
import { SPECIES, xpToNext, STARTERS, TYPES } from './data.js';
import { say, choose, setPanel, floatText, toast, $, $$, fadeOut, fadeIn, askName, updateHud } from './ui.js';
import { sfx, playMusic } from './audio.js';
import { companion, petAdd, moodOf, tickPet, writeSave, giveXp, hatchCompanion, canEvolve } from './state.js';
import { getLight, glowSprite } from './world.js';

// ---------- cenários ----------
export function drawRoom(x, w, h, ph) {
  const fy = Math.round(h * 0.6);
  // parede listrada
  x.fillStyle = '#f2d8b3'; x.fillRect(0, 0, w, fy);
  x.fillStyle = '#ead0a6'; for (let i = 0; i < w; i += 8) x.fillRect(i, 0, 3, fy);
  x.fillStyle = '#c9a27a'; x.fillRect(0, 0, w, 3);
  // rodapé
  x.fillStyle = '#a5714a'; x.fillRect(0, fy - 8, w, 8); x.fillStyle = '#c08a5c'; x.fillRect(0, fy - 8, w, 2);
  // piso de tábuas
  for (let y = fy, r = 0; y < h; y += 7, r++) {
    x.fillStyle = r % 2 ? '#c48a58' : '#b97f4f'; x.fillRect(0, y, w, 7);
    x.fillStyle = '#8a5a3b'; x.fillRect(0, y + 6, w, 1);
    for (let i = (r * 23) % 37; i < w; i += 37) x.fillRect(i, y, 1, 6);
  }
  // janela com céu real
  const wx = Math.round(w * 0.1), wy = Math.round(h * 0.13), ww = 38, wh = 30;
  const skies = { dia: ['#7cc6fa', '#d6f0ff'], amanhecer: ['#ff9f9a', '#ffe0bf'], entardecer: ['#6c55b4', '#ff9d7c'], noite: ['#0f1640', '#2b2868'] };
  const [s1, s2] = skies[ph.name];
  const g = x.createLinearGradient(0, wy, 0, wy + wh); g.addColorStop(0, s1); g.addColorStop(1, s2);
  x.fillStyle = '#7a5236'; x.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
  x.fillStyle = g; x.fillRect(wx, wy, ww, wh);
  if (ph.night) {
    for (let i = 0; i < 9; i++) { x.fillStyle = '#fffbe0'; x.fillRect(wx + Math.floor(hash2(i, 4) * ww), wy + Math.floor(hash2(i, 5) * wh * 0.8), 1, 1); }
    x.fillStyle = '#fff6d5'; x.beginPath(); x.arc(wx + ww - 10, wy + 9, 4.5, 0, 7); x.fill(); x.fillStyle = s1; x.beginPath(); x.arc(wx + ww - 8, wy + 8, 4, 0, 7); x.fill();
  } else { x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.arc(wx + 10, wy + 11, 4, 0, 7); x.arc(wx + 15, wy + 10, 5, 0, 7); x.arc(wx + 20, wy + 12, 3.5, 0, 7); x.fill(); }
  x.fillStyle = '#7a5236'; x.fillRect(wx + ww / 2 - 1, wy, 2, wh); x.fillRect(wx, wy + wh / 2 - 1, ww, 2);
  x.fillStyle = '#c08a5c'; x.fillRect(wx - 5, wy + wh + 3, ww + 10, 3);
  // vaso de planta na janela
  x.fillStyle = '#d9694a'; x.fillRect(wx + 4, wy + wh - 3, 7, 6); x.fillStyle = '#5bb04a'; x.fillRect(wx + 3, wy + wh - 8, 3, 5); x.fillRect(wx + 7, wy + wh - 10, 3, 7); x.fillRect(wx + 10, wy + wh - 7, 2, 4);
  // prateleira
  const sx = Math.round(w * 0.66), sy = Math.round(h * 0.22);
  x.fillStyle = '#8a5a3b'; x.fillRect(sx, sy, 40, 3); x.fillStyle = '#6b4430'; x.fillRect(sx + 4, sy + 3, 2, 4); x.fillRect(sx + 34, sy + 3, 2, 4);
  [['#5fa8d3', 5, 11], ['#e8624a', 4, 9], ['#7bc950', 6, 12], ['#ffd66b', 4, 8]].forEach(([c, bw, bh], i) => { x.fillStyle = c; x.fillRect(sx + 3 + i * 6, sy - bh, bw, bh); });
  x.fillStyle = '#b49cff'; x.beginPath(); x.arc(sx + 32, sy - 4, 4, 0, 7); x.fill();
  // tapete
  const cx = Math.round(w / 2), cy = Math.round(h * 0.77);
  x.fillStyle = '#c94f4f'; x.beginPath(); x.ellipse(cx, cy, w * 0.3, 10, 0, 0, 7); x.fill();
  x.fillStyle = '#f5b45a'; x.beginPath(); x.ellipse(cx, cy, w * 0.24, 7, 0, 0, 7); x.fill();
  x.fillStyle = '#e86a5a'; x.beginPath(); x.ellipse(cx, cy, w * 0.18, 5, 0, 0, 7); x.fill();
  // almofada-cama
  const bx = Math.round(w * 0.8), by = Math.round(h * 0.69);
  x.fillStyle = '#5a3f9a'; x.beginPath(); x.ellipse(bx, by + 2, 17, 6, 0, 0, 7); x.fill();
  x.fillStyle = '#8c6ad8'; x.beginPath(); x.ellipse(bx, by, 16, 5, 0, 0, 7); x.fill();
  x.fillStyle = '#b49cff'; x.beginPath(); x.ellipse(bx - 3, by - 1, 9, 2.5, 0, 0, 7); x.fill();
  // luz da janela no chão (de dia)
  if (!ph.night) { x.fillStyle = 'rgba(255,245,210,0.22)'; x.beginPath(); x.moveTo(wx + 4, fy); x.lineTo(wx + ww + 4, fy); x.lineTo(wx + ww + 26, h); x.lineTo(wx + 16, h); x.fill(); }
  return { bed: { x: bx, y: by }, lamp: { x: Math.round(w * 0.5), y: 10 }, window: { x: wx + ww / 2, y: wy + wh / 2 } };
}
function drawCamp(x, w, h, ph) {
  const skies = { dia: ['#86cdfb', '#d9f2ff'], amanhecer: ['#ff9f9a', '#ffe0bf'], entardecer: ['#6c55b4', '#ff9d7c'], noite: ['#10173f', '#2e2a6c'] };
  const [s1, s2] = skies[ph.name]; const hz = Math.round(h * 0.52);
  const g = x.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, s1); g.addColorStop(1, s2); x.fillStyle = g; x.fillRect(0, 0, w, hz);
  if (ph.night) for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(255,255,240,.8)'; x.fillRect(Math.floor(hash2(i, 7) * w), Math.floor(hash2(i, 8) * hz * 0.8), 1, 1); }
  x.fillStyle = ph.night ? '#1f3a4f' : '#6fb88a';
  for (let i = 0; i < w; i++) { const yy = hz - 10 - 6 * Math.sin(i * 0.07) - 3 * Math.sin(i * 0.19); x.fillRect(i, Math.round(yy), 1, hz); }
  const gg = x.createLinearGradient(0, hz, 0, h); gg.addColorStop(0, ph.night ? '#1f4a45' : '#6cc65a'); gg.addColorStop(1, ph.night ? '#183a3a' : '#4aa84a');
  x.fillStyle = gg; x.fillRect(0, hz, w, h - hz);
  for (let i = 0; i < 50; i++) { x.fillStyle = hash2(i, 3) < 0.5 ? (ph.night ? '#2a5a50' : '#8fdc6f') : (ph.night ? '#143030' : '#3f9a43'); x.fillRect(Math.floor(hash2(i, 1) * w), hz + 3 + Math.floor(hash2(i, 2) * (h - hz)), 1, 2); }
  // tronco
  const lx = Math.round(w * 0.78), ly = Math.round(h * 0.76);
  x.fillStyle = '#6b4430'; x.fillRect(lx - 16, ly - 5, 32, 9); x.fillStyle = '#8a5a3b'; x.fillRect(lx - 16, ly - 5, 32, 3);
  x.fillStyle = '#c8955f'; x.beginPath(); x.ellipse(lx + 16, ly - 1, 3, 4.5, 0, 0, 7); x.fill();
  return { bed: { x: lx, y: ly - 6 }, lamp: null };
}

// ---------- cena do bichinho ----------
export class PetScene {
  async start({ home = true } = {}) {
    this.home = home; this.parts = []; this.mode = null; this.tapCd = 0; this.lastMove = 0;
    this.a = { ox: 0, oy: 0, sq: 1, hop: 0, expr: null, exprT: 0 };
    this.orb = null; this.food = null; this.sleepT = 0;
    G.mode = 'pet';
    setPanel('pet');
    $('#hud').classList.remove('hidden'); $('#hud-pet').classList.add('hidden');
    updateHud(home ? 'Sua casa' : 'Acampamento');
    playMusic('casa');
    this.bindUi();
    this.refresh(true);
    const s = G.save;
    if (s.pet.sleeping) { this.mode = 'sleep'; }
    this.habitat = false; this.roam = [];
    const hb = $('#hab-btn'); hb.classList.toggle('hidden', !home);
    hb.textContent = `Habitat (${this.residents().length})`;
    hb.onclick = () => { sfx('select'); this.setHabitat(!this.habitat); };
  }
  exit() { $('#hud-pet').classList.remove('hidden'); $('#hab-btn').classList.add('hidden'); this.unbind(); }
  residents() { const s = G.save; return [...s.party, ...s.box]; }
  setHabitat(on) {
    if (G.busy) return;
    if (on && G.save.pet.sleeping) { toast('Acorde o companheiro antes de abrir o habitat.'); return; }
    this.habitat = on; this.bg = null;
    $('#hab-btn').textContent = on ? 'Voltar ao companheiro' : `Habitat (${this.residents().length})`;
    if (!on) return;
    this.layout();
    const fy = Math.round(this.ph * 0.6);
    this.roam = this.residents().map(c => { const x = rand(28, this.pw - 28), y = rand(fy + 30, this.ph - 6); return { c, x, y, tx: x, ty: y, wait: rand(0, 2), flip: false, hop: 0, heart: 0 }; });
    toast(this.roam.length > 1 ? 'Seus espíritos estão passeando pela casa!' : 'Recrute espíritos na trilha: eles vêm morar aqui!', 2600);
  }

  layout() {
    this.pz = this.habitat ? 1 : (G.iw >= 200 ? 2 : 1);
    this.pw = Math.ceil(G.iw / this.pz); this.ph = Math.ceil(G.ih / this.pz);
  }
  buildBg() {
    this.layout();
    const ph = dayPhase();
    const [c, x] = makeCanvas(this.pw, this.ph);
    this.spots = this.home ? drawRoom(x, this.pw, this.ph, ph) : drawCamp(x, this.pw, this.ph, ph);
    this.bg = c; this.bgKey = `${this.pw}x${this.ph}${ph.name}${this.home}${this.habitat}`;
  }
  get petPos() {
    const s = G.save;
    if (this.mode === 'sleep' || s.pet.sleeping) return { x: this.spots.bed.x, y: this.spots.bed.y + 2 };
    return { x: Math.round(this.pw / 2), y: Math.round(this.ph * 0.77) };
  }

  bindUi() {
    this.onPet = (e) => { const b = e.target.closest('button'); if (b) this.action(b.dataset.pet); };
    $('.pet-acts').addEventListener('click', this.onPet);
    $('#btn-explore').onclick = () => this.leave();
    const cv = G.canvas;
    this.onDown = (e) => this.pointer(e, true);
    this.onMove = (e) => this.pointer(e, false);
    cv.addEventListener('pointerdown', this.onDown);
    cv.addEventListener('pointermove', this.onMove);
  }
  unbind() {
    $('.pet-acts').removeEventListener('click', this.onPet);
    G.canvas.removeEventListener('pointerdown', this.onDown);
    G.canvas.removeEventListener('pointermove', this.onMove);
  }
  toLocal(e) {
    const r = G.canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / (G.cssPx * this.pz), y: (e.clientY - r.top) / (G.cssPx * this.pz) };
  }
  pointer(e, down) {
    if (!$('#msg').classList.contains('hidden')) return;
    if (G.busy && this.mode !== 'bath') return;
    const p = this.toLocal(e), pp = this.petPos;
    if (this.habitat) {
      if (!down) return;
      const hit = [...this.roam].sort((a, b) => b.y - a.y).find(r => Math.abs(p.x - r.x) < 18 && p.y < r.y + 2 && p.y > r.y - 46);
      if (hit) {
        hit.hop = 1; hit.wait = 1.6; hit.heart = 1.2; sfx('happy');
        if (hit.c.companion) petAdd(G.save, { joy: 1 });
        toast(`${hit.c.name} · ${SPECIES[hit.c.species].name} · Nv.${hit.c.level}`);
      }
      return;
    }
    const near = Math.abs(p.x - pp.x) < 30 && p.y < pp.y + 6 && p.y > pp.y - 56;
    if (this.mode === 'bath') {
      if (!near || (!down && e.buttons === 0 && e.pointerType === 'mouse')) return;
      const now = performance.now(); if (now - this.lastMove < 35 && !down) return; this.lastMove = now;
      petAdd(G.save, { clean: down ? 6 : 1.4 });
      this.parts.push({ x: p.x + rand(-4, 4), y: p.y + rand(-4, 4), vx: rand(-6, 6), vy: rand(-14, -4), life: 0, max: rand(0.8, 1.5), r: rand(1.5, 3.5), kind: 'bubble' });
      if (Math.random() < 0.25) sfx('bubble');
      if (G.save.pet.clean >= 100) this.finishBath();
      return;
    }
    if (down && near && !this.mode && !G.busy && this.tapCd <= 0) {
      this.tapCd = 0.9; sfx('happy');
      petAdd(G.save, { joy: 1.5 });
      this.react('happy', 1.2); this.hop();
      this.parts.push({ x: pp.x + rand(-8, 8), y: pp.y - 50, vx: rand(-5, 5), vy: -18, life: 0, max: 1.1, kind: 'heart' });
      this.refresh();
    }
  }
  react(expr, secs) { this.a.expr = expr; this.a.exprT = secs; }
  async hop() { await tween(this.a, { oy: -10, sq: 1.08 }, 140, ease.outQuad); await tween(this.a, { oy: 0, sq: 0.9 }, 160, ease.inQuad); await tween(this.a, { sq: 1 }, 120); }

  async action(kind) {
    const s = G.save, c = companion(s);
    if (!c) return;
    if (this.mode === 'bath' && kind === 'bath') { this.finishBath(); return; }
    if (G.busy) return;
    if (this.habitat) this.setHabitat(false);
    if (this.mode === 'sleep' && kind !== 'sleep') { toast(`${c.name} está dormindo. Acorde-o primeiro.`); return; }
    if (kind === 'feed') return this.feed();
    if (kind === 'play') return this.play();
    if (kind === 'bath') return this.bath();
    if (kind === 'sleep') return this.toggleSleep();
  }
  async feed() {
    const s = G.save, c = companion(s);
    if (s.pet.hunger >= 96) { toast(`${c.name} está de barriga cheia!`); this.react('neutral', 1); return; }
    let doce = false;
    if (s.items.doce > 0) {
      G.busy = true;
      const i = await choose(`O que vai dar para ${c.name}?`, ['Fruta-luz', `Doce de Luar (${s.items.doce})`, 'Cancelar']);
      G.busy = false;
      if (i === 2) return;
      doce = i === 1;
    }
    G.busy = true;
    const pp = this.petPos;
    this.food = { x: pp.x, y: -10, doce };
    await tween(this.food, { y: pp.y - 30 }, 520, ease.inQuad);
    this.food = null;
    for (let k = 0; k < 2; k++) { sfx('eat'); await tween(this.a, { sq: 0.86 }, 90); await tween(this.a, { sq: 1.04 }, 110); this.crumbs(pp.x, pp.y - 26); }
    this.a.sq = 1;
    if (doce) { s.items.doce--; petAdd(s, { hunger: 15, joy: 25 }); floatText(pp.x * this.pz, (pp.y - 60) * this.pz, '+25 Alegria', 'heal small'); }
    else { petAdd(s, { hunger: 28 }); floatText(pp.x * this.pz, (pp.y - 60) * this.pz, '+28 Fome', 'heal small'); }
    this.react('happy', 1.6); sfx('happy');
    G.busy = false; this.refresh(); writeSave(s);
  }
  async play() {
    const s = G.save, c = companion(s);
    if (s.pet.energy < 12) { toast(`${c.name} está cansado demais para brincar...`); this.react('sad', 1.5); return; }
    G.busy = true; this.mode = 'play';
    $$('.pact').forEach(b => b.classList.toggle('on', b.dataset.pet === 'play'));
    this.orb = { x: this.pw * 0.2, y: this.ph * 0.5, vx: 70, vy: -40 };
    const until = G.t + 3.2;
    while (G.t < until) await wait(50);
    // pega!
    const pp = this.petPos;
    this.burst(this.orb.x, this.orb.y, 16, ['#fff1a8', '#ffd66b', '#ffffff']);
    this.orb = null; sfx('happy'); this.hop();
    petAdd(s, { joy: 20, energy: -8, hunger: -4 });
    floatText(pp.x * this.pz, (pp.y - 60) * this.pz, '+20 Alegria', 'heal small');
    this.react('happy', 1.8);
    this.mode = null; $$('.pact').forEach(b => b.classList.remove('on'));
    const evs = giveXp(c, 3);
    G.busy = false; this.refresh(); writeSave(s);
    for (const ev of evs) if (ev.kind === 'level') { sfx('level'); toast(`${c.name} subiu para o nível ${ev.level}!`, 2400); }
    if (canEvolve(c)) { await wait(600); await this.goEvolve(c); }
  }
  bath() {
    const c = companion(G.save);
    this.mode = 'bath'; this.bathEnd = G.t + 8;
    $$('.pact').forEach(b => b.classList.toggle('on', b.dataset.pet === 'bath'));
    toast('Esfregue o ' + c.name + ' com o dedo!', 2200);
  }
  finishBath() {
    if (this.mode !== 'bath') return;
    this.mode = null; $$('.pact').forEach(b => b.classList.remove('on'));
    const pp = this.petPos;
    for (let i = 0; i < 14; i++) { const a = rand(-Math.PI, 0); this.parts.push({ x: pp.x, y: pp.y - 26, vx: Math.cos(a) * rand(30, 60), vy: Math.sin(a) * rand(30, 60), life: 0, max: 0.6, kind: 'drop', g: 120 }); }
    sfx('happy'); this.react('happy', 1.6); petAdd(G.save, { joy: 4 });
    this.refresh(); writeSave(G.save);
  }
  toggleSleep() {
    const s = G.save, c = companion(s);
    s.pet.sleeping = !s.pet.sleeping;
    this.mode = s.pet.sleeping ? 'sleep' : null;
    if (s.pet.sleeping) { sfx('back'); toast(`${c.name} foi dormir. Bons sonhos!`); }
    else { sfx('happy'); this.react('happy', 1.2); toast(`${c.name} acordou!`); }
    this.refresh(); writeSave(s);
  }
  async leave() {
    if (G.busy) return;
    const s = G.save, c = companion(s);
    if (this.mode === 'bath') this.finishBath();
    if (s.pet.sleeping) { s.pet.sleeping = false; toast(`${c.name} acordou e quer passear!`); }
    G.busy = true;
    await fadeOut(260);
    G.busy = false;
    if (this.home) { const h = { x: 3, y: 7, dir: 0 }; G.world.load('vila', h.x, h.y, h.dir); }
    await G.goto('world');
    await fadeIn(260);
    if (!s.flags.toldCida && !s.flags.metCida) { s.flags.toldCida = true; await say(['Dica: a Vó Cida espera por você no Santuário, no centro da vila.']); }
  }
  async goEvolve(c) {
    G.busy = true; await fadeOut(300); G.busy = false;
    await G.goto('evolve', { c, to: canEvolve(c), back: 'pet', home: this.home, silentFade: true });
  }
  crumbs(x, y) { for (let i = 0; i < 6; i++) this.parts.push({ x, y, vx: rand(-25, 25), vy: rand(-30, -5), life: 0, max: 0.5, kind: 'crumb', g: 120 }); }
  burst(x, y, n, cols) { for (let i = 0; i < n; i++) { const a = rand(0, 7), sp = rand(15, 50); this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: rand(0.4, 0.8), c: cols[i % cols.length], kind: 'spark' }); } }

  refresh(instant = false) {
    const s = G.save, c = companion(s); if (!c) return;
    tickPet(s);
    $('#pet-name').textContent = c.name;
    $('#pet-lv').textContent = 'Nv.' + c.level;
    const m = moodOf(s);
    $('#pet-mood').textContent = `${m.label} · ${m.pct >= 0 ? '+' : ''}${m.pct}% força`;
    $('#pet-xp i').style.width = (c.xp / xpToNext(c.level) * 100) + '%';
    for (const el of $$('.meter')) {
      const v = s.pet[el.dataset.k]; const bar = el.querySelector('i');
      if (instant) bar.style.transition = 'none';
      bar.style.width = v + '%'; el.classList.toggle('low', v < 25);
      if (instant) { void bar.offsetWidth; bar.style.transition = ''; }
    }
    const sl = $('[data-pet="sleep"] .sl'); sl.textContent = s.pet.sleeping ? 'Acordar' : 'Dormir';
    $('[data-pet="sleep"]').classList.toggle('on', !!s.pet.sleeping);
  }

  update(dt) {
    const s = G.save;
    this.tapCd -= dt; this.refreshT = (this.refreshT || 0) - dt;
    if (this.refreshT <= 0) { this.refreshT = 0.5; this.refresh(); }
    if (this.a.exprT > 0) { this.a.exprT -= dt; if (this.a.exprT <= 0) this.a.expr = null; }
    if (this.mode === 'bath' && G.t > this.bathEnd) this.finishBath();
    if (s.pet.sleeping) {
      this.sleepT += dt;
      if (this.sleepT > 2.4) { this.sleepT = 0; petAdd(s, { energy: 1 }); const pp = this.petPos; this.parts.push({ x: pp.x + 8, y: pp.y - 34, vx: 6, vy: -10, life: 0, max: 2.2, kind: 'z' }); }
    }
    if (this.habitat) {
      const fy = Math.round(this.ph * 0.6);
      for (const r of this.roam) {
        r.hop = Math.max(0, r.hop - dt * 3); r.heart -= dt;
        if (r.wait > 0) { r.wait -= dt; if (r.wait <= 0) { r.tx = rand(28, this.pw - 28); r.ty = rand(fy + 30, this.ph - 6); } continue; }
        const dx = r.tx - r.x, dy = r.ty - r.y, d = Math.hypot(dx, dy);
        if (d < 1) { r.wait = rand(1, 4); if (Math.random() < 0.3) r.heart = 1; continue; }
        r.x += dx / d * 16 * dt; r.y += dy / d * 16 * dt; r.flip = dx < 0;
      }
    }
    if (this.orb) {
      const o = this.orb; o.vy += 60 * dt; o.x += o.vx * dt; o.y += o.vy * dt;
      if (o.x < 10 || o.x > this.pw - 10) { o.vx *= -1; o.x = clamp(o.x, 10, this.pw - 10); }
      if (o.y > this.ph * 0.78) { o.vy = -Math.abs(o.vy) * 0.95 - 20; o.y = this.ph * 0.78; }
      if (o.y < this.ph * 0.25) o.vy = Math.abs(o.vy);
      this.a.ox += ((o.x - this.pw / 2) * 0.6 - this.a.ox) * Math.min(1, dt * 4);
      if (Math.random() < dt * 8) this.parts.push({ x: o.x, y: o.y, vx: 0, vy: 0, life: 0, max: 0.4, c: '#ffe58a', kind: 'spark' });
    } else this.a.ox *= Math.max(0, 1 - dt * 5);
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const q = this.parts[i]; q.life += dt;
      if (q.g) q.vy += q.g * dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.kind === 'spark') { q.vx *= 0.92; q.vy *= 0.92; }
      if (q.life > q.max) this.parts.splice(i, 1);
    }
  }

  draw(ctx) {
    const ph = dayPhase();
    this.layout();
    if (!this.bg || this.bgKey !== `${this.pw}x${this.ph}${ph.name}${this.home}${this.habitat}`) this.buildBg();
    if (!this.oc || this.oc.width !== this.pw || this.oc.height !== this.ph) [this.oc, this.ox] = makeCanvas(this.pw, this.ph);
    const x = this.ox, t = G.t, s = G.save, c = companion(s);
    x.drawImage(this.bg, 0, 0);
    // lanterna pendurada (casa)
    if (this.home && this.spots.lamp) {
      const L = this.spots.lamp; x.fillStyle = '#4a4458'; x.fillRect(L.x, 0, 1, L.y);
      x.drawImage(spr('lamp' + (ph.lampsOn ? 'On' : ''), () => S.lamp(ph.lampsOn)), 0, 0, 16, 11, L.x - 7, L.y, 16, 11);
    }
    if (this.habitat) this.drawHabitat(x, ph); else if (c) this.drawPet(x, c, ph);
    if (this.food) x.drawImage(spr('fruit', S.fruit), Math.round(this.food.x - 6), Math.round(this.food.y - 6));
    if (this.orb) {
      x.globalCompositeOperation = 'lighter'; x.drawImage(glowSprite('rgba(255,230,120,0.9)'), this.orb.x - 12, this.orb.y - 12, 24, 24); x.globalCompositeOperation = 'source-over';
      x.fillStyle = '#fffbe0'; x.fillRect(Math.round(this.orb.x) - 2, Math.round(this.orb.y) - 2, 4, 4); x.fillStyle = '#ffd66b'; x.fillRect(Math.round(this.orb.x) - 1, Math.round(this.orb.y) - 3, 2, 1);
    }
    for (const q of this.parts) {
      const a = Math.max(0, 1 - q.life / q.max); x.globalAlpha = a;
      const X = Math.round(q.x), Y = Math.round(q.y);
      if (q.kind === 'bubble') { x.strokeStyle = '#e8fbff'; x.lineWidth = 1; x.beginPath(); x.arc(X, Y, q.r, 0, 7); x.stroke(); x.fillStyle = 'rgba(200,240,255,.35)'; x.fill(); x.fillStyle = '#fff'; x.fillRect(X - 1, Y - 1, 1, 1); }
      else if (q.kind === 'heart') { x.fillStyle = '#ff6fa8'; x.fillRect(X - 2, Y, 2, 2); x.fillRect(X + 1, Y, 2, 2); x.fillRect(X - 2, Y + 1, 5, 2); x.fillRect(X - 1, Y + 3, 3, 1); x.fillRect(X, Y + 4, 1, 1); }
      else if (q.kind === 'z') { x.fillStyle = '#e8e4ff'; x.fillRect(X, Y, 4, 1); x.fillRect(X + 2, Y + 1, 1, 1); x.fillRect(X + 1, Y + 2, 1, 1); x.fillRect(X, Y + 3, 4, 1); }
      else if (q.kind === 'drop') { x.fillStyle = '#8fd8ff'; x.fillRect(X, Y, 1, 2); }
      else if (q.kind === 'crumb') { x.fillStyle = '#ffcf4d'; x.fillRect(X, Y, 1, 1); }
      else { x.fillStyle = q.c || '#fff'; x.fillRect(X, Y, 2, 2); }
    }
    x.globalAlpha = 1;
    // luz: noite ou dormindo escurece; o espírito ilumina
    const dark = Math.max(ph.dark * 0.85, s.pet.sleeping ? 0.5 : 0);
    if (ph.tint.some(v => v < 254) && !this.home) { x.globalCompositeOperation = 'multiply'; x.fillStyle = `rgb(${ph.tint.join(',')})`; x.fillRect(0, 0, this.pw, this.ph); x.globalCompositeOperation = 'source-over'; }
    if (dark > 0.02) {
      if (!this.lc || this.lc.width !== this.pw || this.lc.height !== this.ph) [this.lc, this.lx] = makeCanvas(this.pw, this.ph);
      const lx = this.lx; lx.globalCompositeOperation = 'source-over'; lx.clearRect(0, 0, this.pw, this.ph);
      lx.fillStyle = `rgba(8,8,32,${dark})`; lx.fillRect(0, 0, this.pw, this.ph);
      lx.globalCompositeOperation = 'destination-out';
      const pp = this.petPos, L = getLight(); const r = (c && c.species === 'pirilume' ? 80 : 64) * (1 + Math.sin(t * 8) * 0.03);
      if (this.habitat) for (const ro of this.roam) lx.drawImage(L, ro.x - 34, ro.y - 58, 68, 68);
      else lx.drawImage(L, pp.x - r, pp.y - 28 - r, r * 2, r * 2);
      if (this.home && ph.lampsOn && !s.pet.sleeping) lx.drawImage(L, this.spots.lamp.x - 50, this.spots.lamp.y - 30, 100, 100);
      x.drawImage(this.lc, 0, 0);
      x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.35;
      if (!this.habitat) x.drawImage(glowSprite(SPECIES[c.species].glow), pp.x - r * 0.8, pp.y - 28 - r * 0.8, r * 1.6, r * 1.6);
      x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(this.oc, 0, 0, this.pw * this.pz, this.ph * this.pz);
  }
  drawHabitat(x, ph) {
    const t = G.t;
    for (const r of [...this.roam].sort((a, b) => a.y - b.y)) {
      const c = r.c, sp = SPECIES[c.species], fr = Math.floor(t * 2.5 + r.tx * 0.01) % 2;
      const walking = r.wait <= 0;
      const bob = sp.float ? Math.sin(t * 2.4 + r.tx) * 2 - 3 : (walking ? -Math.abs(Math.sin(t * 9)) * 2 : 0);
      const blink = ((t + r.tx * 0.1) % 3.7) < 0.12;
      const expr = c.hp <= 0 ? 'closed' : r.hop > 0 ? 'happy' : blink ? 'blink' : 'neutral';
      const key = `cr_${c.species}_${fr}_${expr}_${r.flip ? 'f' : ''}`;
      const img = spr(key, () => { const px = S.creature(c.species, fr, expr); return r.flip ? px.flipX() : px; });
      x.fillStyle = 'rgba(40,20,20,0.25)'; x.beginPath(); x.ellipse(r.x, r.y, 13, 3, 0, 0, 7); x.fill();
      if (ph.night) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.25; x.drawImage(glowSprite(sp.glow), r.x - 30, r.y - 54, 60, 60); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; }
      x.drawImage(img, Math.round(r.x - 24), Math.round(r.y - 47 + bob - r.hop * 8));
      if (c.companion) { x.fillStyle = '#ffd66b'; x.fillRect(Math.round(r.x) - 1, Math.round(r.y - 52 + bob), 2, 2); }
      if (r.heart > 0) { const X = Math.round(r.x + 10), Y = Math.round(r.y - 54 - (1.2 - r.heart) * 10); x.globalAlpha = Math.min(1, r.heart * 2); x.fillStyle = '#ff6fa8'; x.fillRect(X - 2, Y, 2, 2); x.fillRect(X + 1, Y, 2, 2); x.fillRect(X - 2, Y + 1, 5, 2); x.fillRect(X - 1, Y + 3, 3, 1); x.fillRect(X, Y + 4, 1, 1); x.globalAlpha = 1; }
    }
  }
  drawPet(x, c, ph) {
    const s = G.save, t = G.t, pp = this.petPos;
    const sleeping = s.pet.sleeping;
    const m = moodOf(s);
    let expr = this.a.expr || (sleeping ? 'sleep' : m.avg < 30 || (m.need && s.pet[m.need.key] < 15) ? 'sad' : 'neutral');
    if (!this.a.expr && !sleeping && (t % 3.6) < 0.13) expr = 'blink';
    if (this.mode === 'bath' && !this.a.expr) expr = 'happy';
    const fr = Math.floor(t * (sleeping ? 1 : 2.5)) % 2;
    const img = spr(`cr_${c.species}_${fr}_${expr}_`, () => S.creature(c.species, fr, expr));
    const bob = sleeping ? Math.sin(t * 1.4) * 1 : Math.sin(t * 2.4) * 2.2;
    const sq = this.a.sq;
    const W = Math.round(48 * (2 - sq)), H = Math.round(48 * sq);
    // sombra
    x.fillStyle = 'rgba(40,20,20,0.25)'; x.beginPath(); x.ellipse(pp.x + this.a.ox, pp.y, 14, 3.5, 0, 0, 7); x.fill();
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = ph.night || sleeping ? 0.4 : 0.18;
    x.drawImage(glowSprite(SPECIES[c.species].glow), Math.round(pp.x + this.a.ox - 40), Math.round(pp.y - 64), 80, 80);
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    x.drawImage(img, Math.round(pp.x - W / 2 + this.a.ox), Math.round(pp.y - 6 - H + this.a.oy + bob - (sleeping ? 0 : 4)), W, H);
    // sujeira: manchinhas quando a limpeza está baixa
    if (s.pet.clean < 30) {
      x.fillStyle = 'rgba(120,90,60,0.55)';
      for (let i = 0; i < 5; i++) x.fillRect(Math.round(pp.x - 14 + hash2(i, 1) * 28 + this.a.ox), Math.round(pp.y - 40 + hash2(i, 2) * 26 + bob), 2, 1);
      if (Math.floor(t * 2) % 2) { x.fillStyle = 'rgba(160,200,120,.7)'; x.fillRect(Math.round(pp.x + 18), Math.round(pp.y - 50 - (t * 6 % 6)), 1, 3); }
    }
  }
}

// ---------- escolha do ovo e nascimento ----------
export class HatchScene {
  async start() {
    this.phase = 'choose'; this.sel = -1; this.taps = 0; this.parts = []; this.wob = 0; this.glow = 0.3;
    this.hatched = false; this.flash = 0; this.showPet = false; this.others = 1; this.ex = 0;
    G.mode = 'hatch';
    setPanel('hatch');
    $('#hud').classList.add('hidden');
    $('#hatch-hint').textContent = 'Escolha um dos ovos';
    playMusic('casa');
    this.onDown = (e) => this.tap(e);
    G.canvas.addEventListener('pointerdown', this.onDown);
    await fadeIn(400);
    await say(['Três ovos misteriosos brilham no seu quarto...', 'Cada um guarda um espírito diferente. Toque no ovo que você quer chocar!']);
  }
  exit() { G.canvas.removeEventListener('pointerdown', this.onDown); }
  geom() {
    const pz = G.iw >= 200 ? 2 : 1, w = Math.ceil(G.iw / pz), h = Math.ceil(G.ih / pz);
    return { pz, w, h, cy: Math.round(h * 0.77), xs: [Math.round(w * 0.2), Math.round(w * 0.5), Math.round(w * 0.8)] };
  }
  async tap(e) {
    if (this.hatched || G.busy || !$('#msg').classList.contains('hidden') || !$('#name-dlg').classList.contains('hidden')) return;
    const g = this.geom(), r = G.canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / (G.cssPx * g.pz), y = (e.clientY - r.top) / (G.cssPx * g.pz);
    if (this.phase === 'choose') {
      const i = g.xs.findIndex(ex => Math.abs(ex - x) < 20 && y > g.cy - 46 && y < g.cy + 6);
      if (i < 0) return;
      this.sel = i; sfx('select'); const st = STARTERS[i];
      G.busy = true;
      const k = await choose(`${st.label}: ${st.hint}. Escolher este?`, ['Sim!', 'Ver outro']);
      G.busy = false;
      if (k !== 0) { this.sel = -1; return; }
      this.phase = 'hatch'; this.ex = g.xs[i];
      tween(this, { others: 0 }, 400); tween(this, { ex: g.xs[1] }, 500, ease.inOut);
      $('#hatch-hint').textContent = 'Toque no ovo para ajudá-lo a chocar!';
      return;
    }
    if (Math.abs(x - g.xs[1]) > 24) return;
    this.taps++; sfx('crack'); this.wob = 0.35; this.glow = 0.3 + this.taps * 0.12;
    for (let i = 0; i < 6; i++) { const a = rand(0, 7); this.parts.push({ x: g.xs[1], y: g.cy - 20, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, life: 0, max: 0.5, c: ['#ffd66b', '#fff6d5', '#ff9a3c'][i % 3] }); }
    const left = 6 - this.taps;
    $('#hatch-hint').textContent = left > 0 ? `Continue! (${left})` : 'Está chocando!';
    if (this.taps >= 6) this.hatch();
  }
  async hatch() {
    this.hatched = true; G.busy = true;
    const id = STARTERS[this.sel].id, sp = SPECIES[id];
    for (let i = 0; i < 10; i++) { this.wob = 0.2; sfx('crack'); await wait(90); }
    this.flash = 1; sfx('hatch');
    const g = this.geom();
    for (let i = 0; i < 30; i++) { const a = rand(0, 7), spd = rand(20, 90); this.parts.push({ x: g.xs[1], y: g.cy - 22, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 0, max: rand(0.6, 1.2), c: ['#fff6d5', '#f3e6cf', sp.glow, '#ffffff'][i % 4], g: 60 }); }
    this.showPet = true;
    await tween(this, { flash: 0 }, 700);
    G.busy = false;
    $('#hatch-hint').textContent = '';
    await say([`Um pequeno espírito de ${TYPES[sp.type].name} nasceu!`, 'Ele olha para você com olhinhos brilhantes.']);
    const name = await askName(sp.name);
    const s = G.save;
    hatchCompanion(s, name, id);
    s.pet.last = Date.now();
    writeSave(s);
    sfx('happy');
    await say([`${name} deu um pulinho de alegria!`,
      `Cuide de ${name}: dê comida, brinque, dê banho e deixe dormir.`,
      'Os medidores caem com o tempo real, até com o jogo fechado. Um espírito bem cuidado fica mais forte nas batalhas!',
      'Quando estiverem prontos, toquem em Explorar. A Vó Cida espera vocês no Santuário.']);
    G.busy = true; await fadeOut(300); G.busy = false;
    await G.goto('pet', { home: true });
    await fadeIn(300);
  }
  update(dt) {
    this.wob = Math.max(0, this.wob - dt);
    for (let i = this.parts.length - 1; i >= 0; i--) { const q = this.parts[i]; q.life += dt; q.vy += (q.g || 0) * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.life > q.max) this.parts.splice(i, 1); }
  }
  draw(ctx) {
    const g = this.geom(), w = g.w, h = g.h;
    if (!this.bg || this.bg.width !== w || this.bg.height !== h) { const [c, x] = makeCanvas(w, h); drawRoom(x, w, h, dayPhase()); this.bg = c; }
    if (!this.oc || this.oc.width !== w || this.oc.height !== h) [this.oc, this.ox] = makeCanvas(w, h);
    const x = this.ox, t = G.t, cy = g.cy;
    x.drawImage(this.bg, 0, 0);
    x.fillStyle = 'rgba(10,8,30,0.45)'; x.fillRect(0, 0, w, h);
    const eggs = this.phase === 'choose' ? [0, 1, 2] : [this.sel];
    for (const i of eggs) {
      const st = STARTERS[i], ex = this.phase === 'choose' ? g.xs[i] : this.ex;
      const sel = this.phase !== 'choose' || i === this.sel;
      const glow = this.phase === 'choose' ? (sel ? 0.8 : 0.35) : Math.min(0.9, this.glow);
      x.globalCompositeOperation = 'lighter'; x.globalAlpha = glow * (0.85 + Math.sin(t * 4 + i) * 0.15);
      x.drawImage(glowSprite(SPECIES[st.id].glow), ex - 40, cy - 64, 80, 80);
      x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      if (this.phase !== 'choose' && this.showPet) continue;
      const cr = this.phase === 'choose' ? 0 : Math.min(3, Math.floor(this.taps / 2));
      const img = spr(`egg${st.egg}${cr}`, () => S.egg(cr, st.egg));
      const rot = this.wob > 0 && this.phase !== 'choose' ? Math.sin(t * 50) * 0.12 : Math.sin(t * 1.5 + i) * (sel ? 0.06 : 0.03);
      const bob = this.phase === 'choose' && sel ? Math.round(Math.sin(t * 6) * 1.5) - 2 : 0;
      x.save(); x.translate(ex, cy - 2 + bob); x.rotate(rot); x.drawImage(img, -16, -40); x.restore();
    }
    if (this.showPet) {
      const id = STARTERS[this.sel].id, fr = Math.floor(t * 2.5) % 2;
      x.drawImage(spr(`cr_${id}_${fr}_happy_`, () => S.creature(id, fr, 'happy')), g.xs[1] - 24, Math.round(cy - 54 + Math.sin(t * 2.4) * 2));
    }
    for (const q of this.parts) { x.globalAlpha = Math.max(0, 1 - q.life / q.max); x.fillStyle = q.c; x.fillRect(Math.round(q.x), Math.round(q.y), 2, 2); }
    x.globalAlpha = 1;
    ctx.drawImage(this.oc, 0, 0, w * g.pz, h * g.pz);
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,250,235,${this.flash})`; ctx.fillRect(0, 0, G.iw, G.ih); }
  }
}
void rand; void hash2;
