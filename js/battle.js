// battle.js — batalha por turnos com tipos, golpes, recrutamento com Fita-encanto e XP.
import { G, spr, wait, tween, ease, dayPhase, rand, clamp } from './engine.js';
import * as S from './sprites.js';
import { makeCanvas, hash2 } from './gfx.js';
import { SPECIES, MOVES, TYPES, typeMult, statsFor, xpReward, xpToNext, TAMERS } from './data.js';
import { say, setPanel, floatText, openParty, typeBadge, hpClass, $, $$, fadeOut, fadeIn, initIcons } from './ui.js';
import { sfx, playMusic } from './audio.js';
import { maxHp, firstAlive, giveXp, bondMult, moodOf, petAdd, healAll, writeSave, companion, canEvolve } from './state.js';
import { glowSprite } from './world.js';

const TYPE_FX = {
  comum: ['#ffffff', '#ffe9c4'], brasa: ['#fff1a8', '#ffb648', '#ff6a3d'], rio: ['#d6f3ff', '#6ac2ff', '#3a86dc'],
  mata: ['#d4f78a', '#7bc950', '#3f8f3a'], bruma: ['#f4ecff', '#c4a8ff', '#8a6ae0'], pedra: ['#f0ede3', '#c7bfac', '#8f8676'],
  vento: ['#f2fffb', '#b8f0dc', '#6fd3b4'], luz: ['#ffffff', '#fff3b0', '#ffd66b'], gelo: ['#ffffff', '#cdf2ff', '#8fd8f5'],
  raio: ['#ffffff', '#fff27a', '#ffc93d'],
};
// cores do efeito de cada tipo; um tipo sem cor própria usa as do Comum em vez de quebrar a batalha
const fxCols = (type) => TYPE_FX[type] || TYPE_FX.comum;
const stageMul = s => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));

export class Battle {
  constructor() { this.parts = []; this.shake = 0; this.flashW = 0; }

  async start({ foe, tamer }) {
    const s = G.save;
    this.tamer = tamer || null; this.team = tamer ? tamer.team : [foe]; this.teamIdx = 0; this.skipFoe = false;
    this.foe = this.team[0]; s.seen[this.foe.species] = true;
    this.meIdx = firstAlive(s);
    this.stages = { me: { atk: 0, def: 0 }, foe: { atk: 0, def: 0 } };
    this.parts = []; this.ribbon = null; this.done = false;
    this.vis = {
      foe: { ox: 140, oy: 0, a: 1, sc: 1, flash: 0, sil: 0 },
      me: { ox: -140, oy: 0, a: 1, sc: 1, flash: 0, sil: 0 },
    };
    this.layout();
    this.buildBg();
    G.mode = 'battle';
    setPanel('battle');
    $('#battle-cards').classList.remove('hidden'); $('#battle-cards').classList.add('out');
    $('#bmenu').classList.add('dim'); $('#bmoves').classList.add('hidden'); $('#bmenu').classList.remove('hidden');
    $('#btext').textContent = '';
    this.updateCards(true);
    playMusic('batalha');
    // entrada: revela com losangos + criaturas deslizam
    G.wipe = { p: 1 };
    tween(G.wipe, { p: 0 }, 520, ease.inOut).then(() => { G.wipe = null; });
    tween(this.vis.foe, { ox: 0 }, 650, ease.outQuad);
    await tween(this.vis.me, { ox: 0 }, 650, ease.outQuad);
    $('#battle-cards').classList.remove('out');
    this.run();
  }
  exit() { $('#battle-cards').classList.add('hidden'); }

  layout() {
    this.bz = G.iw >= 200 ? 2 : 1;
    this.bw = Math.ceil(G.iw / this.bz); this.bh = Math.ceil(G.ih / this.bz);
    this.pos = {
      foe: { x: Math.round(this.bw * 0.72), y: Math.round(this.bh * 0.43) },
      me: { x: Math.round(this.bw * 0.28), y: Math.round(this.bh * 0.82) },
    };
  }
  get me() { return G.save.party[this.meIdx]; }
  foeName() { return this.tamer ? this.foe.name : this.foe.name + ' selvagem'; }

  // ---------- cenário ----------
  buildBg() {
    const w = this.bw, h = this.bh; const [c, x] = makeCanvas(w, h); this.bg = c; this.bgW = w; this.bgH = h;
    const ph = dayPhase();
    const skies = {
      dia: ['#86cdfb', '#d9f2ff'], amanhecer: ['#ff9f9a', '#ffe0bf'], entardecer: ['#6c55b4', '#ff9d7c'], noite: ['#10173f', '#2e2a6c'],
    };
    const [s1, s2] = skies[ph.name];
    const hz = Math.round(h * 0.47);
    const g = x.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, s1); g.addColorStop(1, s2);
    x.fillStyle = g; x.fillRect(0, 0, w, hz);
    if (ph.night) {
      for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,240,${0.3 + hash2(i, 1) * 0.7})`; x.fillRect(Math.floor(hash2(i, 2) * w), Math.floor(hash2(i, 3) * hz * 0.8), 1, 1); }
      x.fillStyle = '#fff6d5'; x.beginPath(); x.arc(w * 0.18, h * 0.12, 7, 0, Math.PI * 2); x.fill();
      x.fillStyle = s1; x.beginPath(); x.arc(w * 0.18 + 3, h * 0.12 - 2, 6, 0, Math.PI * 2); x.fill();
    } else {
      x.fillStyle = 'rgba(255,255,255,0.85)';
      for (const [cx, cy, r] of [[0.2, 0.1, 6], [0.27, 0.11, 8], [0.34, 0.1, 5], [0.7, 0.2, 5], [0.76, 0.19, 7]]) { x.beginPath(); x.arc(Math.round(w * cx), Math.round(h * cy), r, 0, Math.PI * 2); x.fill(); }
    }
    const shade = (a, b, k) => ph.night ? b : (ph.name === 'dia' ? a : k);
    // morros
    const hill = (yb, amp, freq, col, seed) => {
      x.fillStyle = col;
      for (let i = 0; i < w; i++) {
        const yy = yb - amp * (0.5 + 0.5 * Math.sin(i * freq + seed)) - amp * 0.4 * Math.sin(i * freq * 2.7 + seed * 2);
        x.fillRect(i, Math.round(yy), 1, hz - Math.round(yy) + 1);
      }
    };
    hill(hz, 14, 0.05, shade('#9ccfe0', '#26305f', '#b49ab8'), 1);
    hill(hz, 9, 0.09, shade('#6fb88a', '#1f3a4f', '#8a7a9a'), 4);
    // linha de árvores
    for (let i = -4; i < w + 8; i += 7) {
      const r = 5 + hash2(i, 9) * 4, cy = hz - 2 - hash2(i, 5) * 3;
      x.fillStyle = shade('#3f8a4a', '#16303a', '#5a5a6a'); x.beginPath(); x.arc(i, cy, r, 0, Math.PI * 2); x.fill();
    }
    // chão
    const gg = x.createLinearGradient(0, hz, 0, h);
    gg.addColorStop(0, shade('#6cc65a', '#1f4a45', '#a88a6a')); gg.addColorStop(1, shade('#4aa84a', '#183a3a', '#7a6a5a'));
    x.fillStyle = gg; x.fillRect(0, hz, w, h - hz);
    for (let i = 0; i < 70; i++) {
      const px = Math.floor(hash2(i, 11) * w), py = hz + 2 + Math.floor(hash2(i, 12) * (h - hz));
      x.fillStyle = hash2(i, 13) < 0.5 ? shade('#8fdc6f', '#2a5a50', '#c0a080') : shade('#3f9a43', '#143030', '#6a5a4a');
      x.fillRect(px, py, 1, 2); x.fillRect(px + 2, py, 1, 1);
    }
    if (!ph.night) for (let i = 0; i < 10; i++) { x.fillStyle = ['#ffffff', '#ffd66b', '#ffaed6'][i % 3]; x.fillRect(Math.floor(hash2(i, 21) * w), hz + 4 + Math.floor(hash2(i, 22) * (h - hz - 4)), 1, 1); }
    // plataformas
    for (const k of ['foe', 'me']) {
      const p = this.pos[k], rx = k === 'foe' ? 30 : 36, ry = k === 'foe' ? 7 : 9;
      x.fillStyle = shade('#3a8f40', '#123030', '#6a5a4a'); x.beginPath(); x.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = shade('#82d466', '#2a5a50', '#b09070'); x.beginPath(); x.ellipse(p.x, p.y - 1, rx - 3, ry - 2.5, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = shade('#a8e88a', '#3a7066', '#c8a888'); x.beginPath(); x.ellipse(p.x - 4, p.y - 2, rx - 12, ry - 5, 0, 0, Math.PI * 2); x.fill();
    }
    if (ph.night) { x.fillStyle = 'rgba(180,170,255,0.08)'; x.fillRect(0, hz - 6, w, 14); }
  }

  // ---------- cartões (HTML) ----------
  updateCards(instant = false) {
    const set = (sel, c, foe) => {
      const el = $(sel); const sp = SPECIES[c.species]; const mh = maxHp(c), r = clamp(c.hp / mh, 0, 1);
      el.querySelector('.nm').textContent = foe ? c.name : c.name;
      el.querySelector('.lv').textContent = 'Nv.' + c.level;
      el.querySelector('.type').outerHTML = typeBadge(sp.type);
      const bar = el.querySelector('.bar.hp i');
      if (instant) bar.style.transition = 'none';
      bar.style.width = (r * 100) + '%'; bar.className = hpClass(r);
      if (instant) { void bar.offsetWidth; bar.style.transition = ''; }
      if (!foe) {
        el.querySelector('.hpnum').textContent = `${Math.max(0, c.hp)}/${mh}`;
        el.querySelector('.bar.xp i').style.width = (c.xp / xpToNext(c.level) * 100) + '%';
      } else el.querySelector('.rec').classList.toggle('on', !!G.save.seen[c.species + '_caught']);
    };
    set('#card-foe', this.foe, true); set('#card-me', this.me, false);
  }

  // ---------- menu ----------
  menu() {
    const me = this.me;
    $('#fita-count').textContent = '×' + G.save.items.fita;
    const bm = $('#bmenu'), mv = $('#bmoves');
    bm.classList.remove('dim', 'hidden'); mv.classList.add('hidden');
    $('#btext').textContent = `O que ${me.name} vai fazer?`;
    return new Promise(res => {
      const finish = (v) => { bm.onclick = null; mv.onclick = null; bm.classList.add('dim'); mv.classList.add('hidden'); bm.classList.remove('hidden'); res(v); };
      bm.onclick = (e) => {
        const b = e.target.closest('button'); if (!b) return;
        const act = b.dataset.act; sfx('select');
        if (act === 'fight') {
          mv.innerHTML = '';
          me.moves.forEach(id => {
            const m = MOVES[id]; const btn = document.createElement('button'); btn.className = 'move';
            btn.style.setProperty('--tc', TYPES[m.type].color);
            const eff = typeMult(m.type, SPECIES[this.foe.species].type);
            const hint = m.power ? (eff > 1 ? ' · forte!' : eff < 1 ? ' · fraco' : '') : '';
            btn.innerHTML = `<b>${m.name}</b><small>${TYPES[m.type].name}${m.power ? ' · ' + m.power : ' · efeito'}${hint}</small>`;
            btn.onclick = (ev) => { ev.stopPropagation(); sfx('select'); finish({ kind: 'move', move: id }); };
            mv.appendChild(btn);
          });
          const back = document.createElement('button'); back.className = 'move back'; back.textContent = 'Voltar';
          back.onclick = (ev) => { ev.stopPropagation(); sfx('back'); mv.classList.add('hidden'); bm.classList.remove('hidden'); };
          mv.appendChild(back);
          bm.classList.add('hidden'); mv.classList.remove('hidden');
        } else finish({ kind: act });
      };
    });
  }

  // ---------- fluxo ----------
  async run() {
    const s = G.save;
    if (this.tamer) await say([`${this.tamer.name} quer batalhar!`, `${this.tamer.name} enviou ${this.foe.name}!`], { auto: 900 });
    else if (SPECIES[this.foe.species].legend) { this.flashW = 0.25; sfx('super'); await say([`O lendário ${this.foe.name} apareceu!`, 'Ele é muito forte. Laços com lendas são raríssimos!'], { auto: 1100 }); }
    else await say([`Um ${this.foe.name} selvagem apareceu!`], { auto: 900 });
    await this.moodLine();
    while (!this.done) {
      try {
        if (await this.turn()) return;
      } catch (err) {
        // nunca deixa a batalha travada: registra o erro e volta para o menu
        console.error('Erro no turno da batalha:', err);
        try {
          this.parts = []; this.ribbon = null;
          for (const k of ['me', 'foe']) Object.assign(this.vis[k], { ox: 0, oy: 0, sc: 1, flash: 0, sil: 0, a: (k === 'me' ? this.me : this.foe).hp > 0 ? 1 : 0 });
          this.updateCards(true);
          if (this.me.hp <= 0) { if (await this.meFainted()) return; }
          else if (this.foe.hp <= 0) { if (await this.victory()) return; }
        } catch (err2) {
          // se nem a recuperação der certo, encerra a batalha e volta ao mapa
          console.error('Batalha encerrada por segurança:', err2);
          if (!this.done) await this.end('run');
          return;
        }
      }
    }
  }
  // um turno completo; devolve true se a batalha acabou
  async turn() {
    const s = G.save;
    const act = await this.menu();
    this.skipFoe = false;
    if (act.kind === 'run' && this.tamer) { await say(['Não dá pra fugir de uma batalha contra um domador!']); return false; }
    if (act.kind === 'fita' && this.tamer) { await say(['Não dá pra criar laço com o espírito de outro domador!']); return false; }
    if (act.kind === 'run') {
      const ok = statsFor(this.me.species, this.me.level).spd >= statsFor(this.foe.species, this.foe.level).spd || Math.random() < 0.65;
      if (ok) { sfx('run'); await say(['Você fugiu em segurança!'], { auto: 700 }); await this.end('run'); return true; }
      await say(['Não deu pra fugir!'], { auto: 700 });
      if (await this.foeTurn()) return true;
      return false;
    }
    if (act.kind === 'fita') {
      if (s.items.fita <= 0) { await say(['Você não tem mais Fitas-encanto!', 'O cristal do Santuário pode renovar suas fitas.']); return false; }
      s.items.fita--;
      if (await this.recruit()) return true;
      if (await this.foeTurn()) return true;
      return false;
    }
    if (act.kind === 'party') {
      const i = await openParty('battle', { active: this.meIdx });
      if (i < 0) return false;
      await this.switchTo(i);
      if (await this.foeTurn()) return true;
      return false;
    }
    if (act.kind === 'move') {
      const mySpd = statsFor(this.me.species, this.me.level).spd, foeSpd = statsFor(this.foe.species, this.foe.level).spd;
      const meFirst = mySpd > foeSpd || (mySpd === foeSpd && Math.random() < 0.5);
      if (meFirst) {
        if (await this.myTurn(act.move)) return true;
        if (await this.foeTurn()) return true;
      } else {
        if (await this.foeTurn()) return true;
        if (await this.myTurn(act.move)) return true;
      }
    }
    return false;
  }
  async moodLine() {
    const me = this.me; if (!me.companion) return;
    const m = moodOf(G.save);
    if (m.pct >= 4) await say([`${me.name} está ${m.label.toLowerCase()} e cheio de coragem! (+${m.pct}% de força)`], { auto: 1100 });
    else if (m.pct <= -4) await say([`${me.name} parece ${m.need ? m.need.text.toLowerCase().replace('está ', '').replace('precisa de um banho', 'sujinho') : 'desanimado'}... (${m.pct}% de força)`], { auto: 1100 });
  }

  // devolve true se a batalha acabou
  async myTurn(moveId) {
    const me = this.me, s = G.save;
    if (me.companion && s.pet.energy < 15 && Math.random() < 0.25) {
      await say([`${me.name} está sonolento e hesitou...`], { auto: 900 }); return false;
    }
    await this.useMove('me', moveId);
    if (this.foe.hp <= 0) return await this.victory();
    return false;
  }
  async foeTurn() {
    if (this.skipFoe) { this.skipFoe = false; return false; }
    if (this.foe.hp <= 0) return false;
    const foe = this.foe;
    let opts = foe.moves.filter(m => !(MOVES[m].effect && Math.abs(this.stages[MOVES[m].effect.target === 'self' ? 'foe' : 'me'][MOVES[m].effect.stat]) >= 2));
    if (!opts.length) opts = foe.moves;
    const dmgMoves = opts.filter(m => MOVES[m].power);
    const pick = (Math.random() < 0.75 && dmgMoves.length) ? dmgMoves[Math.floor(Math.random() * dmgMoves.length)] : opts[Math.floor(Math.random() * opts.length)];
    await this.useMove('foe', pick);
    if (this.me.hp <= 0) return await this.meFainted();
    return false;
  }

  async useMove(side, moveId) {
    const att = side === 'me' ? this.me : this.foe, def = side === 'me' ? this.foe : this.me;
    const tgt = side === 'me' ? 'foe' : 'me';
    const m = MOVES[moveId];
    await say([`${side === 'foe' ? this.foeName() : att.name} usou ${m.name}!`], { auto: 650 });
    if (Math.random() * 100 > m.acc) { await this.lunge(side); await say(['Mas errou!'], { auto: 700 }); return; }
    if (!m.power) {
      const e = m.effect, who = e.target === 'self' ? side : tgt;
      const st = this.stages[who];
      await this.statFx(who, e.stages > 0, fxCols(m.type));
      const name = who === 'foe' ? this.foeName() : this.me.name;
      const statName = { atk: 'ataque', def: 'defesa' }[e.stat];
      if (Math.abs(st[e.stat] + e.stages) > 3) { await say([`O ${statName} de ${name} não muda mais!`], { auto: 800 }); return; }
      st[e.stat] += e.stages;
      await say([`O ${statName} de ${name} ${e.stages > 0 ? 'aumentou' : 'diminuiu'}!`], { auto: 800 });
      return;
    }
    const r = this.calc(att, def, m, side);
    await this.lunge(side);
    await this.projectile(side, m.type);
    def.hp = Math.max(0, def.hp - r.dmg);
    this.hitFx(tgt, r.tm);
    sfx(r.tm > 1 ? 'super' : r.tm < 1 ? 'weak' : 'hit');
    const p = this.pos[tgt];
    floatText(p.x * this.bz, (p.y - 34) * this.bz, '-' + r.dmg, r.tm > 1 || r.crit ? 'super' : '');
    this.updateCards();
    await wait(650);
    if (m.drain && r.dmg > 0) {
      const heal = Math.max(1, Math.floor(r.dmg * m.drain)); att.hp = Math.min(maxHp(att), att.hp + heal); this.updateCards();
      const ap = this.pos[side]; floatText(ap.x * this.bz, (ap.y - 34) * this.bz, '+' + heal, 'heal');
      await say([`${side === 'foe' ? this.foeName() : att.name} absorveu energia!`], { auto: 700 });
    }
    const lines = [];
    if (r.crit) lines.push('Um golpe certeiro!');
    if (r.tm > 1) lines.push('É super eficaz!'); else if (r.tm < 1) lines.push('Não foi muito eficaz...');
    if (lines.length) await say(lines, { auto: 750 });
  }
  calc(att, def, m, side) {
    const s = G.save;
    const sa = statsFor(att.species, att.level), sd = statsFor(def.species, def.level);
    const aSt = this.stages[side], dSt = this.stages[side === 'me' ? 'foe' : 'me'];
    const A = sa.atk * stageMul(aSt.atk) * (att.companion ? bondMult(s) : 1);
    const D = sd.def * stageMul(dSt.def) * (def.companion ? bondMult(s) : 1);
    const base = (att.level * 0.4 + 2) * m.power * (A / D) / 25 + 2;
    const stab = SPECIES[att.species].type === m.type ? 1.25 : 1;
    const tm = typeMult(m.type, SPECIES[def.species].type);
    const critChance = 0.0625 + (att.companion && s.pet.joy >= 80 ? 0.06 : 0);
    const crit = Math.random() < critChance;
    const wild = side === 'foe' && !this.tamer ? 0.8 : 1;
    const dmg = Math.max(1, Math.floor(base * stab * tm * wild * (crit ? 1.5 : 1) * rand(0.85, 1)));
    return { dmg, tm, crit };
  }

  async meFainted() {
    const s = G.save, me = this.me;
    sfx('faint');
    await tween(this.vis.me, { oy: 24, a: 0 }, 500, ease.inQuad);
    await say([`${me.name} ficou exausto!`]);
    if (me.companion) petAdd(s, { joy: -5 });
    const alive = s.party.findIndex(c => c.hp > 0);
    if (alive < 0) { await this.blackout(); return true; }
    const i = await openParty('battle', { active: this.meIdx, forced: true });
    await this.switchTo(i, true);
    return false;
  }
  async switchTo(i, afterFaint = false) {
    const old = this.me;
    if (!afterFaint) {
      await say([`Volte, ${old.name}!`], { auto: 600 });
      await tween(this.vis.me, { ox: -120 }, 300, ease.inQuad);
    }
    this.meIdx = i; this.stages.me = { atk: 0, def: 0 };
    this.vis.me.ox = -120; this.vis.me.oy = 0; this.vis.me.a = 1;
    this.updateCards(true);
    await say([`Vai, ${this.me.name}!`], { auto: 600 });
    await tween(this.vis.me, { ox: 0 }, 350, ease.outBack);
    await this.moodLine();
  }

  async victory() {
    const s = G.save, foe = this.foe;
    sfx('faint');
    this.burst(this.pos.foe.x, this.pos.foe.y - 20, 18, fxCols(SPECIES[foe.species].type));
    await tween(this.vis.foe, { oy: 24, a: 0 }, 520, ease.inQuad);
    await say([`${this.foeName()} ficou exausto!`], { auto: 900 });
    petAdd(s, { joy: 2, energy: -2, hunger: -1, clean: -1 });
    await this.awardXp(Math.round(xpReward(foe.species, foe.level) * (this.tamer ? 1.5 : 1)));
    if (this.tamer && this.teamIdx < this.team.length - 1) {
      this.teamIdx++; this.foe = this.team[this.teamIdx]; s.seen[this.foe.species] = true;
      this.stages.foe = { atk: 0, def: 0 };
      this.vis.foe = { ox: 140, oy: 0, a: 1, sc: 1, flash: 0, sil: 0 };
      this.updateCards(true);
      await say([`${this.tamer.name} enviou ${this.foe.name}!`], { auto: 800 });
      await tween(this.vis.foe, { ox: 0 }, 450, ease.outBack);
      this.skipFoe = true;
      return false;
    }
    s.stats.battles++; s.stats.wins++;
    if (this.tamer) {
      const tm = TAMERS[this.tamer.id];
      s.flags['beat_' + this.tamer.id] = true;
      await say(tm.win, { speaker: tm.name });
      s.items.doce += tm.reward.doce; s.items.fita += tm.reward.fita; sfx('item');
      await say([`Você ganhou ${tm.reward.doce} Doce${tm.reward.doce > 1 ? 's' : ''} de Luar e ${tm.reward.fita} Fitas-encanto!`]);
    }
    await this.end('win');
    return true;
  }
  async awardXp(amount) {
    const s = G.save, me = this.me;
    const gain = async (c, amt, bond) => {
      if (c.hp <= 0) return;
      await say([bond ? `${c.name} ganhou ${amt} de XP pelo vínculo.` : `${c.name} ganhou ${amt} de XP!`], { auto: 800 });
      const evs = giveXp(c, amt);
      if (c === me) this.updateCards();
      for (const ev of evs) {
        if (ev.kind === 'level') { sfx('level'); if (c === me) { this.statFx('me', true, ['#ffe58a', '#ffffff', '#ffd66b']); this.updateCards(); } await say([`${c.name} subiu para o nível ${ev.level}!`]); }
        if (ev.kind === 'learn') await say([ev.forgot ? `${c.name} esqueceu ${MOVES[ev.forgot].name} e aprendeu ${MOVES[ev.move].name}!` : `${c.name} aprendeu ${MOVES[ev.move].name}!`]);
      }
    };
    await gain(me, amount, false);
    const comp = companion(s);
    if (comp && comp !== me && s.party.includes(comp)) await gain(comp, Math.max(1, Math.floor(amount / 2)), true);
  }

  async recruit() {
    const s = G.save, foe = this.foe, sp = SPECIES[foe.species];
    await say(['Você lançou uma Fita-encanto!'], { auto: 500 });
    const start = { x: this.pos.me.x + 10, y: this.pos.me.y - 30 }, end = { x: this.pos.foe.x, y: this.pos.foe.y - 22 };
    this.ribbon = { x: start.x, y: start.y, rot: 0, a: 1 };
    sfx('throw');
    const tr = { t: 0 };
    const arc = () => { this.ribbon.x = start.x + (end.x - start.x) * tr.t; this.ribbon.y = start.y + (end.y - start.y) * tr.t - Math.sin(tr.t * Math.PI) * 26; };
    const timer = setInterval(arc, 16);
    await tween(tr, { t: 1 }, 520, ease.linear); clearInterval(timer); arc();
    this.burst(end.x, end.y, 12, ['#ffe1ef', '#ff9cc8', '#ffffff']);
    this.vis.foe.sil = 1;
    await tween(this.vis.foe, { sc: 0 }, 380, ease.inQuad);
    this.ribbon.y = this.pos.foe.y - 8;
    // chance de laço
    const r = foe.hp / maxHp(foe);
    const chance = clamp(sp.catch * (1.25 - r) + 0.08, 0.05, 0.95);
    const shakes = 3; let ok = true;
    for (let i = 0; i < shakes; i++) {
      await wait(380); sfx('tick');
      await tween(this.ribbon, { rot: -1 }, 90); await tween(this.ribbon, { rot: 1 }, 140); await tween(this.ribbon, { rot: 0 }, 90);
      if (Math.random() > Math.pow(chance, 1 / shakes)) { ok = false; break; }
    }
    await wait(300);
    if (ok) {
      sfx('catch');
      this.burst(this.ribbon.x, this.ribbon.y, 24, ['#fff1a8', '#ffd66b', '#ffffff', '#ff9cc8']);
      await say([`Laço criado! ${foe.name} agora é seu amigo!`]);
      s.seen[foe.species + '_caught'] = true; s.stats.recruited++;
      petAdd(s, { joy: 5 });
      const fresh = { ...foe, hp: Math.max(1, foe.hp) };
      if (s.party.length < 6) { s.party.push(fresh); await say([`${foe.name} entrou para o seu grupo.`], { auto: 900 }); }
      else { s.box.push(fresh); await say([`Seu grupo está cheio. ${foe.name} foi morar no seu habitat, em casa.`]); }
      s.stats.battles++;
      await this.awardXp(Math.max(1, Math.floor(xpReward(foe.species, foe.level) / 2)));
      await this.end('recruit');
      return true;
    }
    sfx('fail');
    this.burst(this.ribbon.x, this.ribbon.y, 10, ['#ff9cc8', '#ffffff']);
    this.ribbon = null;
    await tween(this.vis.foe, { sc: 1 }, 260, ease.outBack); this.vis.foe.sil = 0;
    await say([['Ah, não! Ele se soltou!', 'Quase! A fita escorregou!', 'Por um triz!'][Math.floor(Math.random() * 3)]], { auto: 900 });
    return false;
  }

  async blackout() {
    const s = G.save;
    if (this.tamer) await say(TAMERS[this.tamer.id].lose, { speaker: TAMERS[this.tamer.id].name });
    await say(['Todos os seus espíritos estão exaustos...', 'Você voltou correndo para o Santuário da vila.']);
    petAdd(s, { joy: -10 });
    healAll(s);
    const hs = { x: 9, y: 12, dir: 1 };
    s.pos = { map: 'vila', ...hs };
    G.world.load('vila', hs.x, hs.y, hs.dir);
    await this.end('blackout');
  }

  async end(kind) {
    this.done = true;
    writeSave(G.save);
    await fadeOut(320);
    $('#battle-cards').classList.add('hidden');
    const evoC = G.save.party.find(c => c.hp > 0 && canEvolve(c));
    if (evoC) { await G.goto('evolve', { c: evoC, to: canEvolve(evoC), silentFade: true }); return; }
    await G.goto('world');
    await fadeIn(320);
    if (kind === 'blackout') await say(['Vó Cida cuidou de todos. Vocês estão prontos de novo!'], { speaker: 'Vó Cida' });
  }

  // ---------- efeitos ----------
  async lunge(side) {
    const v = this.vis[side], d = side === 'me' ? 10 : -10;
    await tween(v, { ox: d, oy: side === 'me' ? -5 : 5 }, 110, ease.outQuad);
    await tween(v, { ox: 0, oy: 0 }, 160, ease.inOut);
  }
  async projectile(side, type) {
    const a = this.pos[side], b = this.pos[side === 'me' ? 'foe' : 'me'];
    const cols = fxCols(type);
    for (let i = 0; i < 14; i++) {
      this.parts.push({ x: a.x + rand(-4, 4), y: a.y - 22 + rand(-4, 4), tx: b.x + rand(-6, 6), ty: b.y - 22 + rand(-6, 6), t: -i * 0.025, dur: 0.32, c: cols[i % cols.length], kind: 'proj', type });
    }
    await wait(380);
    this.burst(b.x, b.y - 22, 16, cols);
  }
  hitFx(tgt, tm) {
    const v = this.vis[tgt];
    v.flash = 0.42;
    this.shake = tm > 1 ? 0.4 : 0.18;
    if (tm > 1) this.flashW = 0.18;
  }
  async statFx(who, up, cols) {
    const p = this.pos[who]; sfx(up ? 'heal' : 'weak');
    for (let i = 0; i < 12; i++) this.parts.push({ x: p.x + rand(-18, 18), y: p.y - (up ? 4 : 44) + rand(-4, 4), vx: 0, vy: up ? -rand(25, 45) : rand(25, 45), life: -i * 0.04, max: 0.7, c: cols[i % cols.length], kind: 'arrow', up });
    await wait(700);
  }
  burst(x, y, n, cols) {
    for (let i = 0; i < n; i++) { const a = rand(0, Math.PI * 2), sp = rand(20, 70); this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: rand(0.3, 0.7), c: cols[i % cols.length], kind: 'spark' }); }
  }

  // ---------- desenho ----------
  update(dt) {
    this.shake = Math.max(0, this.shake - dt); this.flashW = Math.max(0, this.flashW - dt);
    for (const k of ['me', 'foe']) this.vis[k].flash = Math.max(0, this.vis[k].flash - dt);
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const q = this.parts[i];
      if (q.kind === 'proj') { q.t += dt; if (q.t > q.dur) this.parts.splice(i, 1); continue; }
      q.life += dt; if (q.life < 0) continue;
      q.x += (q.vx || 0) * dt; q.y += (q.vy || 0) * dt;
      if (q.kind === 'spark') { q.vx *= 0.92; q.vy *= 0.92; }
      if (q.life > q.max) this.parts.splice(i, 1);
    }
  }
  draw(ctx) {
    if (!this.bg) return;
    if (Math.ceil(G.iw / (G.iw >= 200 ? 2 : 1)) !== this.bgW || Math.ceil(G.ih / (G.iw >= 200 ? 2 : 1)) !== this.bgH) { this.layout(); this.buildBg(); }
    const w = this.bw, h = this.bh;
    if (!this.oc || this.oc.width !== w || this.oc.height !== h) [this.oc, this.ox] = makeCanvas(w, h);
    const x = this.ox, t = G.t;
    x.drawImage(this.bg, 0, 0);
    const ph = dayPhase();
    // criaturas
    const drawMon = (k, c) => {
      const v = this.vis[k], p = this.pos[k]; if (!c || v.a <= 0.01 || v.sc <= 0.01) return;
      const sp = SPECIES[c.species];
      const floaty = !!sp.float;
      const bob = floaty ? Math.round(Math.sin(t * 2.6 + (k === 'me' ? 1 : 0)) * 2) : 0;
      const fr = Math.floor(t * 2.5) % 2;
      const blink = (t + (k === 'me' ? 1.3 : 0)) % 3.4 < 0.12;
      const expr = c.hp <= 0 ? 'closed' : v.flash > 0 ? 'hurt' : blink ? 'blink' : 'neutral';
      const flip = k === 'me';
      const key = `cr_${c.species}_${fr}_${expr}_${flip ? 'f' : ''}`;
      const img = spr(key, () => { const px = S.creature(c.species, fr, expr); return flip ? px.flipX() : px; });
      const sx = this.shake > 0 && v.flash > 0 ? Math.round(Math.sin(t * 80) * 2) : 0;
      const W = Math.round(48 * v.sc), H = Math.round(48 * v.sc);
      const dx = Math.round(p.x - W / 2 + v.ox + sx), dy = Math.round(p.y - 4 - H + v.oy + bob - (floaty ? 3 : 0));
      // sombra
      x.fillStyle = 'rgba(10,20,20,0.25)'; x.beginPath(); x.ellipse(p.x + v.ox, p.y - 1, 15 * v.sc, 3.5 * v.sc, 0, 0, Math.PI * 2); x.fill();
      // brilho de espírito
      x.globalCompositeOperation = 'lighter'; x.globalAlpha = (ph.night ? 0.55 : 0.22) * v.a;
      x.drawImage(glowSprite(sp.glow), Math.round(p.x + v.ox - 40), Math.round(p.y - 30 + v.oy - 40), 80, 80);
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = v.a;
      const flashOn = v.flash > 0 && Math.floor(v.flash * 18) % 2 === 0;
      if (v.sil || flashOn) x.drawImage(spr(key + '_w', () => { const px = S.creature(c.species, fr, expr); return (flip ? px.flipX() : px).silhouette(0xffffffff); }), dx, dy, W, H);
      else x.drawImage(img, dx, dy, W, H);
      x.globalAlpha = 1;
    };
    drawMon('foe', this.foe);
    drawMon('me', this.me);
    // fita
    if (this.ribbon) {
      const rb = spr('ribbon', S.ribbon);
      x.drawImage(rb, Math.round(this.ribbon.x - 8 + this.ribbon.rot * 3), Math.round(this.ribbon.y - 8));
    }
    // partículas
    for (const q of this.parts) {
      if (q.kind === 'proj') {
        if (q.t < 0) continue;
        const k = Math.min(1, q.t / q.dur);
        const px = q.x + (q.tx - q.x) * k + Math.sin(k * 9 + q.tx) * (q.type === 'bruma' ? 5 : q.type === 'mata' ? 3 : 1);
        const py = q.y + (q.ty - q.y) * k - Math.sin(k * Math.PI) * (q.type === 'pedra' ? 14 : 6);
        x.fillStyle = q.c; const sz = q.type === 'pedra' ? 3 : 2; x.fillRect(Math.round(px), Math.round(py), sz, sz);
        continue;
      }
      if (q.life < 0) continue;
      x.globalAlpha = Math.max(0, 1 - q.life / q.max); x.fillStyle = q.c;
      if (q.kind === 'arrow') { const X = Math.round(q.x), Y = Math.round(q.y); if (q.up) { x.fillRect(X, Y, 1, 1); x.fillRect(X - 1, Y + 1, 3, 1); x.fillRect(X, Y + 2, 1, 3); } else { x.fillRect(X, Y, 1, 3); x.fillRect(X - 1, Y + 3, 3, 1); x.fillRect(X, Y + 4, 1, 1); } }
      else x.fillRect(Math.round(q.x), Math.round(q.y), 2, 2);
    }
    x.globalAlpha = 1;
    // aplica no canvas principal com zoom inteiro
    const sh = this.shake > 0 ? Math.round(Math.sin(t * 70) * (this.shake > 0.2 ? 3 : 1)) : 0;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, G.iw, G.ih);
    ctx.drawImage(this.oc, sh * this.bz, 0, w * this.bz, h * this.bz);
    if (this.flashW > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flashW * 3})`; ctx.fillRect(0, 0, G.iw, G.ih); }
  }
}
void $$; void initIcons; void fadeIn;
