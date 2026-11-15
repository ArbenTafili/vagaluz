// scenes.js — tela de título e sequência de evolução.
import { G, spr, wait, tween, ease, rand } from './engine.js';
import * as S from './sprites.js';
import { makeCanvas, hash2 } from './gfx.js';
import { SPECIES, MOVES } from './data.js';
import { say, choose, setPanel, $, fadeOut, fadeIn, soundIcon } from './ui.js';
import { sfx, playMusic, setSound } from './audio.js';
import { loadSave, newSave, wipeSave, writeSave, evolve } from './state.js';
import { glowSprite } from './world.js';

export class TitleScene {
  async start() {
    G.mode = 'title';
    setPanel('title');
    $('#hud').classList.add('hidden');
    $('#title-ui').classList.remove('hidden');
    const existing = loadSave();
    $('#btn-continue').classList.toggle('hidden', !(existing && existing.hatched));
    $('#btn-new').classList.toggle('ghost', !!(existing && existing.hatched));
    $('#btn-new').textContent = existing && existing.hatched ? 'Novo jogo' : 'Começar';
    $('#btn-continue').onclick = () => this.go(existing);
    $('#btn-new').onclick = async () => {
      if (G.busy) return;
      if (existing && existing.hatched) {
        G.busy = true;
        const i = await choose('Começar de novo? O progresso atual será apagado.', ['Sim, recomeçar', 'Cancelar']);
        G.busy = false;
        if (i !== 0) return;
        wipeSave();
      }
      this.go(null);
    };
    this.spirits = ['pirilim', 'musgolim', 'gotelha', 'brumito', 'pedrusco'].map((id, i) => ({ id, a: i / 5 * Math.PI * 2 }));
    playMusic('casa');
  }
  exit() { $('#title-ui').classList.add('hidden'); }
  async go(save) {
    if (G.busy) return;
    G.busy = true; sfx('select');
    G.save = save || newSave();
    writeSave(G.save);
    soundIcon(G.save.settings.sound); setSound(G.save.settings.sound);
    await fadeOut(400);
    G.busy = false;
    if (!G.save.hatched) await G.goto('hatch');
    else { await G.goto('pet', { home: G.save.pos.map === 'vila' && G.save.pos.x === 3 && G.save.pos.y === 7 }); await fadeIn(400); }
  }
  update() {}
  draw(ctx) {
    const w = G.iw, h = G.ih, t = G.t;
    if (!this.bg || this.bg.width !== w || this.bg.height !== h) {
      const [c, x] = makeCanvas(w, h); this.bg = c;
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0b0f30'); g.addColorStop(0.6, '#2a2366'); g.addColorStop(1, '#4a2d6e');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(255,255,240,${0.25 + hash2(i, 1) * 0.75})`; x.fillRect(Math.floor(hash2(i, 2) * w), Math.floor(hash2(i, 3) * h * 0.75), 1, 1); }
      // morros e árvores em silhueta
      x.fillStyle = '#1a1840';
      for (let i = 0; i < w; i++) { const yy = h * 0.82 - 10 * Math.sin(i * 0.04) - 5 * Math.sin(i * 0.11); x.fillRect(i, Math.round(yy), 1, h); }
      x.fillStyle = '#120f30';
      for (let i = -6; i < w + 6; i += 9) { const r = 6 + hash2(i, 4) * 6; x.beginPath(); x.arc(i, h * 0.9 - hash2(i, 6) * 6, r, 0, 7); x.fill(); }
      x.fillRect(0, h * 0.9, w, h);
    }
    ctx.drawImage(this.bg, 0, 0);
    // espíritos orbitando
    const cx = w / 2, cy = h * 0.62;
    for (const s of this.spirits) {
      const a = s.a + t * 0.35, x = cx + Math.cos(a) * w * 0.34, y = cy + Math.sin(a) * h * 0.08;
      const front = Math.sin(a) > 0;
      ctx.globalAlpha = front ? 1 : 0.55;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(glowSprite(SPECIES[s.id].glow), x - 30, y - 34, 60, 60);
      ctx.globalCompositeOperation = 'source-over';
      const fr = Math.floor(t * 2.5) % 2;
      ctx.drawImage(spr(`cr_${s.id}_${fr}_neutral_`, () => S.creature(s.id, fr, 'neutral')), Math.round(x - 24), Math.round(y - 30 + Math.sin(t * 2 + s.a) * 3));
      ctx.globalAlpha = 1;
    }
    // vaga-lumes
    for (let i = 0; i < 24; i++) {
      const px = (hash2(i, 9) * w + Math.sin(t * 0.5 + i) * 12) % w, py = h * 0.5 + hash2(i, 10) * h * 0.45 + Math.cos(t * 0.7 + i) * 8;
      const a = (Math.sin(t * 2 + i * 1.7) + 1) / 2;
      ctx.globalAlpha = a; ctx.fillStyle = '#e9ff8a'; ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
      ctx.globalAlpha = a * 0.4; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite('rgba(220,255,120,0.8)'), px - 4, py - 4, 8, 8); ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }
}

export class EvolveScene {
  async start({ c, to, back = 'world', home = false }) {
    this.c = c; this.from = c.species; this.to = to; this.back = back; this.home = home;
    this.show = this.from; this.sil = 0; this.flash = 0; this.parts = []; this.done = false;
    G.mode = 'evolve';
    setPanel('hatch'); $('#hatch-hint').textContent = '';
    $('#hud').classList.add('hidden');
    await fadeIn(300);
    this.run();
  }
  exit() {}
  async run() {
    const c = this.c, oldName = c.name;
    await say([`Hein? ${oldName} está brilhando!`]);
    sfx('evolve');
    this.sil = 1;
    let gap = 520;
    for (let i = 0; i < 14; i++) {
      this.show = i % 2 ? this.to : this.from;
      if (i % 3 === 0) sfx('tick');
      await wait(gap); gap = Math.max(70, gap * 0.8);
    }
    this.flash = 1; sfx('hatch');
    this.show = this.to; this.sil = 0;
    const evs = evolve(c, this.to);
    for (let i = 0; i < 40; i++) { const a = rand(0, 7), sp = rand(20, 90); this.parts.push({ x: 0, y: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: rand(0.6, 1.4), c: ['#8fe3ff', '#fff6d5', '#ffd66b', '#ffffff'][i % 4] }); }
    await tween(this, { flash: 0 }, 900);
    await say([`Parabéns! ${oldName} evoluiu para ${SPECIES[this.to].name}!`]);
    for (const ev of evs) if (ev.kind === 'learn') await say([ev.forgot ? `${c.name} esqueceu ${MOVES[ev.forgot].name} e aprendeu ${MOVES[ev.move].name}!` : `${c.name} aprendeu ${MOVES[ev.move].name}!`]);
    await say([SPECIES[this.from].evoLine || `${c.name} ficou maior, mais forte e cheio de detalhes novos!`]);
    writeSave(G.save);
    G.busy = true; await fadeOut(300); G.busy = false;
    if (this.back === 'pet') await G.goto('pet', { home: this.home });
    else await G.goto('world');
    await fadeIn(300);
  }
  update(dt) { for (let i = this.parts.length - 1; i >= 0; i--) { const q = this.parts[i]; q.life += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.97; q.vy *= 0.97; if (q.life > q.max) this.parts.splice(i, 1); } }
  draw(ctx) {
    const pz = G.iw >= 200 ? 2 : 1, w = Math.ceil(G.iw / pz), h = Math.ceil(G.ih / pz), t = G.t;
    if (!this.oc || this.oc.width !== w || this.oc.height !== h) [this.oc, this.ox] = makeCanvas(w, h);
    const x = this.ox;
    const g = x.createRadialGradient(w / 2, h * 0.5, 4, w / 2, h * 0.5, h * 0.7); g.addColorStop(0, '#3a2d7a'); g.addColorStop(1, '#0b0a20');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    // raios girando
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 10; i++) {
      const a = t * 0.4 + i * Math.PI / 5; x.fillStyle = 'rgba(140,200,255,0.05)';
      x.beginPath(); x.moveTo(w / 2, h * 0.5); x.lineTo(w / 2 + Math.cos(a) * h, h * 0.5 + Math.sin(a) * h); x.lineTo(w / 2 + Math.cos(a + 0.15) * h, h * 0.5 + Math.sin(a + 0.15) * h); x.fill();
    }
    x.globalAlpha = 0.6; x.drawImage(glowSprite(SPECIES[this.show].glow), w / 2 - 50, h * 0.5 - 60, 100, 100);
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    const fr = Math.floor(t * 2.5) % 2;
    const key = `cr_${this.show}_${fr}_neutral_`;
    const img = this.sil ? spr(key + '_w', () => S.creature(this.show, fr, 'neutral').silhouette(0xffffffff)) : spr(key, () => S.creature(this.show, fr, 'neutral'));
    x.drawImage(img, Math.round(w / 2 - 24), Math.round(h * 0.5 - 34 + Math.sin(t * 2.4) * 2));
    // faíscas espiralando para dentro durante a transformação
    if (this.sil) for (let i = 0; i < 16; i++) {
      const a = t * 3 + i * 0.4, r = 50 - ((t * 40 + i * 13) % 50);
      x.fillStyle = i % 2 ? '#ffd66b' : '#8fe3ff'; x.fillRect(Math.round(w / 2 + Math.cos(a) * r), Math.round(h * 0.5 - 10 + Math.sin(a) * r * 0.8), 2, 2);
    }
    for (const q of this.parts) { x.globalAlpha = Math.max(0, 1 - q.life / q.max); x.fillStyle = q.c; x.fillRect(Math.round(w / 2 + q.x), Math.round(h * 0.5 - 10 + q.y), 2, 2); }
    x.globalAlpha = 1;
    ctx.drawImage(this.oc, 0, 0, w * pz, h * pz);
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flash})`; ctx.fillRect(0, 0, G.iw, G.ih); }
  }
}
void ease;
