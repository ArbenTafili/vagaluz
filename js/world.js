// world.js — exploração: mapa em tiles, jogador, companheiro que segue, NPCs, luz dia/noite.
import { G, spr, input, consume, wait, tween, ease, dayPhase, DIRS, rand, randi, pickWeighted, clearQueue } from './engine.js';
import * as S from './sprites.js';
import { Pix, hex, hash2, makeCanvas } from './gfx.js';
import { MAPS, SOLID, DIALOG } from './maps.js';
import { ENCOUNTERS, makeCreature, SPECIES, TAMERS } from './data.js';
import { say, choose, setPanel, banner, toast, fadeOut, fadeIn, updateHud, $ } from './ui.js';
import { sfx, playMusic } from './audio.js';
import { companion, healAll, petAdd, moodOf, writeSave, firstAlive } from './state.js';

const T = 16;
let lightSprite = null;
function getLight() {
  if (lightSprite) return lightSprite;
  const [c, x] = makeCanvas(64, 64);
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); lightSprite = c; return c;
}
const glowCache = new Map();
export function glowSprite(color) {
  if (glowCache.has(color)) return glowCache.get(color);
  const [c, x] = makeCanvas(64, 64);
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); glowCache.set(color, c); return c;
}
export { getLight };

// balõezinhos de emoção (necessidades do companheiro)
function emote(kind) {
  const p = new Pix(13, 12); const w = hex('#ffffff');
  p.ellipse(6.5, 5.5, 6, 5, w); p.set(4, 10, w); p.set(3, 11, w);
  const ink = { hunger: hex('#ff8a3d'), energy: hex('#6a7cff'), clean: hex('#4aa8ff'), joy: hex('#ff5f9f'), alert: hex('#ff4d5e'), love: hex('#ff5f9f') }[kind];
  if (kind === 'hunger') { p.ellipse(6.5, 6, 2.6, 2.4, ink); p.set(7, 2, hex('#4f9e3b')); p.set(7, 3, hex('#4f9e3b')); }
  if (kind === 'energy') { p.rect(4, 3, 4, 1, ink); p.set(6, 4, ink); p.set(5, 5, ink); p.rect(4, 6, 4, 1, ink); p.rect(8, 6, 2, 1, ink); p.set(9, 7, ink); p.rect(8, 8, 2, 1, ink); }
  if (kind === 'clean') { p.set(6, 2, ink); p.rect(5, 3, 3, 2, ink); p.ellipse(6.5, 6.5, 2.5, 2.2, ink); }
  if (kind === 'joy' || kind === 'love') { p.rect(4, 3, 2, 2, ink); p.rect(7, 3, 2, 2, ink); p.rect(3, 4, 7, 2, ink); p.rect(4, 6, 5, 1, ink); p.rect(5, 7, 3, 1, ink); p.set(6, 8, ink); }
  if (kind === 'alert') { p.rect(6, 2, 2, 5, ink); p.rect(6, 8, 2, 2, ink); }
  p.outline(null, hex('#2a1e3a'));
  return p;
}

export class World {
  constructor() {
    this.p = { x: 3, y: 7, px: 48, py: 112, dir: 0, moving: false, t: 0, dur: 0.2, fx: 0, fy: 0, alt: false, turn: 0, cont: false };
    this.c = { x: 3, y: 6, px: 48, py: 96, fx: 0, fy: 0, moving: false, t: 0, dir: 0 };
    this.npcs = []; this.parts = []; this.locked = false; this.encSteps = 0; this.bumpCd = 0;
    this.emoteT = 4; this.emoteKind = null; this.excl = 0; this.flash = 0;
    this.path = []; this.target = null; this.marker = null;
  }

  // ---------- construção do mapa ----------
  load(mapId, x, y, dir) {
    const m = MAPS[mapId]; this.mapId = mapId; this.m = m;
    this.W = m.rows[0].length; this.H = m.rows.length;
    this.grid = m.rows.map(r => r.split(''));
    const p = this.p; p.x = x; p.y = y; p.px = x * T; p.py = y * T; p.dir = dir; p.moving = false;
    this.path = []; this.target = null; this.marker = null;
    // companheiro atrás do jogador
    const [dx, dy] = DIRS[dir]; let cx = x - dx, cy = y - dy;
    if (!this.walkable(cx, cy, true)) {
      const alt = [[x - 1, y], [x + 1, y], [x, y + 1], [x, y - 1]].find(([ax, ay]) => this.walkable(ax, ay, true) && !(m.warps || []).some(w => w.x === ax && w.y === ay));
      [cx, cy] = alt || [x, y];
    }
    Object.assign(this.c, { x: cx, y: cy, px: cx * T, py: cy * T, moving: false, dir });
    this.npcs = (m.npcs || []).map(n => ({ ...n, px: n.x * T, py: n.y * T, moving: false, t: 0, home: { x: n.x, y: n.y }, cd: rand(2, 5) }));
    this.parts = [];
    this.build();
    G.save.pos = { map: mapId, x, y, dir };
  }
  tile(x, y) { return (x < 0 || y < 0 || x >= this.W || y >= this.H) ? 'T' : this.grid[y][x]; }
  walkable(x, y, ignoreNpc = false) {
    const t = this.tile(x, y); if (SOLID.has(t)) return false;
    if (!ignoreNpc && this.npcs.some(n => (n.x === x && n.y === y) || (n.moving && n.tx === x && n.ty === y))) return false;
    return true;
  }
  build() {
    const W = this.W * T, H = this.H * T;
    const [mc, m] = makeCanvas(W, H); const [oc, o] = makeCanvas(W, H); const [sc, s] = makeCanvas(W, H);
    this.mapC = mc; this.overC = oc; this.shoreC = sc;
    const isPath = t => t === '=' || t === 'b';
    const isWater = t => t === '~' || t === 'b';
    this.lights = []; this.tall = []; this.water = []; this.windows = [];
    const g = (k, f) => spr(k, f);
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      const t = this.grid[y][x], X = x * T, Y = y * T;
      const v = Math.floor(hash2(x, y) * 3);
      if (t === ',') m.drawImage(g('fl' + v, () => S.flowers(v)), X, Y);
      else if (t === '=') {
        m.drawImage(g('path' + (v % 2), () => S.pathTile(v % 2)), X, Y);
        // franjas de grama nas bordas da trilha
        const gc = ['#5db84b', '#7dcc5a'];
        const edge = (ex, ey, fn) => { if (!isPath(this.tile(x + ex, y + ey))) for (let i = 0; i < 16; i++) { const h = hash2(x * 16 + i, y * 16 + ex * 3 + ey, 9); if (h < 0.75) { m.fillStyle = gc[h < 0.3 ? 1 : 0]; fn(i, h < 0.3 ? 2 : 1); } } };
        edge(0, -1, (i, d) => m.fillRect(X + i, Y, 1, d));
        edge(0, 1, (i, d) => m.fillRect(X + i, Y + 16 - d, 1, d));
        edge(-1, 0, (i, d) => m.fillRect(X, Y + i, d, 1));
        edge(1, 0, (i, d) => m.fillRect(X + 16 - d, Y + i, d, 1));
      } else m.drawImage(g('gr' + v, () => S.grass(v)), X, Y);
      if (t === 'w') this.tall.push([X, Y, (x + y) % 2]);
      if (t === '~') this.water.push([X, Y]);
      if (t === 'b') m.drawImage(g('bridge', S.bridge), X, Y);
    }
    // margens da água
    for (const [X, Y] of this.water) {
      const x = X / T, y = Y / T;
      if (!isWater(this.tile(x, y - 1))) { s.fillStyle = '#2a5fae'; s.fillRect(X, Y, 16, 2); s.fillStyle = '#bfe6ff'; s.fillRect(X, Y + 2, 16, 1); }
      if (!isWater(this.tile(x, y + 1))) { s.fillStyle = '#bfe6ff'; s.fillRect(X, Y + 15, 16, 1); }
      if (!isWater(this.tile(x - 1, y))) { s.fillStyle = '#bfe6ff'; s.fillRect(X, Y, 1, 16); }
      if (!isWater(this.tile(x + 1, y))) { s.fillStyle = '#bfe6ff'; s.fillRect(X + 15, Y, 1, 16); }
    }
    // objetos (em ordem de linha), parte alta vai para a camada de cima
    const put = (img, X, Y, baseY) => {
      const cut = baseY - Y; // pixels acima do tile-base
      if (cut > 0) o.drawImage(img, 0, 0, img.width, cut, X, Y, img.width, cut);
      m.drawImage(img, 0, Math.max(0, cut), img.width, img.height - Math.max(0, cut), X, Math.max(Y, baseY), img.width, img.height - Math.max(0, cut));
    };
    const shadow = (cx, cy, rx, ry) => { m.fillStyle = 'rgba(20,40,30,0.28)'; m.beginPath(); m.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); m.fill(); };
    const done = new Set();
    let houseIdx = 0;
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      const t = this.grid[y][x], X = x * T, Y = y * T;
      if (t === 'T' || t === 'P') { shadow(X + 8, Y + 14, 7, 2.5); put(g('tree' + t, () => S.tree(t === 'P' ? 'blossom' : 'leaf')), X, Y - 12, Y); }
      else if (t === 'r') { shadow(X + 8, Y + 13, 6, 2); m.drawImage(g('rock', S.rock), X, Y); }
      else if (t === 'B') { shadow(X + 8, Y + 14, 7, 2); m.drawImage(g('bush', S.bush), X, Y); }
      else if (t === 'F') m.drawImage(g('fence', S.fence), X, Y);
      else if (t === 'S') { shadow(X + 8, Y + 14, 4, 1.5); m.drawImage(g('sign', S.sign), X, Y); }
      else if (t === 'L') { shadow(X + 8, Y + 14, 4, 1.5); put(g('lamp', () => S.lamp(false)), X, Y - 14, Y); this.lights.push({ x: X + 8, y: Y - 9, r: 44, color: 'rgba(255,190,90,0.9)', lamp: true, X, Y }); }
      else if (t === 'M') { shadow(X + 8, Y + 14, 7, 2); put(g('mono', S.monolith), X, Y - 16, Y); this.lights.push({ x: X + 8, y: Y - 2, r: 40, color: 'rgba(170,140,255,0.9)' }); }
      else if (t === 'A' && !done.has(x + ',' + y)) {
        done.add((x + 1) + ',' + y);
        shadow(X + 16, Y + 14, 14, 3);
        put(g('altar', S.altar), X, Y - 10, Y);
        this.crystal = { x: X + 10, y: Y - 22 };
        this.lights.push({ x: X + 16, y: Y - 12, r: 52, color: 'rgba(110,240,215,0.9)' });
      } else if ((t === 'H' || t === 'D') && !done.has(x + ',' + y)) {
        let w = 0; while (['H', 'D'].includes(this.tile(x + w, y))) w++;
        let h = 0; while (['H', 'D'].includes(this.tile(x, y + h))) h++;
        let doorCol = 0;
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { done.add((x + i) + ',' + (y + j)); if (this.tile(x + i, y + j) === 'D') doorCol = i; }
        const style = (this.m.houseStyles || [])[houseIdx++] || 0;
        const hp = S.house(w, h, doorCol, style);
        const img = spr(`house${w}x${h}d${doorCol}s${style}`, () => hp);
        shadow(X + w * 8, Y + h * 16 - 1, w * 8 + 2, 3);
        put(img, X, Y - 6, Y);
        for (const wn of hp.windows) {
          this.windows.push({ x: X + wn.x, y: Y - 6 + wn.y, w: wn.w, h: wn.h });
          this.lights.push({ x: X + wn.x + 4, y: Y - 6 + wn.y + 8, r: 22, color: 'rgba(255,200,110,0.9)' });
        }
      }
    }
    this.mapW = W; this.mapH = H;
    // textura de floresta para fora do mapa
    const [pc, px] = makeCanvas(16, 16); px.fillStyle = '#235f30'; px.fillRect(0, 0, 16, 16);
    px.drawImage(spr('treeT', () => S.tree('leaf')), 0, -5); this.oobC = pc; this.oobPat = null;
  }

  // ---------- ciclo ----------
  enter() {
    G.mode = 'world';
    setPanel('world');
    $('#hud').classList.remove('hidden');
    playMusic(this.m.music);
    updateHud(this.m.name);
    clearQueue();
  }
  exit() { $('#hud').classList.add('hidden'); }

  update(dt) {
    const p = this.p;
    this.bumpCd -= dt; this.excl = Math.max(0, this.excl - dt); this.flash = Math.max(0, this.flash - dt);
    this.updateParticles(dt);
    this.updateNpcs(dt);
    // movimento
    if (p.moving) {
      p.t += dt / p.dur;
      if (p.t >= 1) { p.moving = false; p.px = p.x * T; p.py = p.y * T; this.arrive(); }
      else { p.px = (p.fx + (p.x - p.fx) * p.t) * T; p.py = (p.fy + (p.y - p.fy) * p.t) * T; }
    }
    const c = this.c;
    if (c.moving) {
      c.t += dt / c.dur;
      if (c.t >= 1) { c.moving = false; c.px = c.x * T; c.py = c.y * T; }
      else { c.px = (c.fx + (c.x - c.fx) * c.t) * T; c.py = (c.fy + (c.y - c.fy) * c.t) * T; }
    }
    if (this.locked || G.busy) { consume('a'); consume('b'); return; }
    if (this.marker) { this.marker.t -= dt; if (this.marker.t <= 0) this.marker = null; }
    if (!p.moving) {
      const d = input.dir;
      if (d >= 0) {
        this.path = []; this.target = null;
        if (p.dir !== d && !p.cont) { p.dir = d; p.turn = 0.08; }
        else if ((p.turn -= dt) <= 0) this.tryStep(d);
      } else if (this.path.length) {
        const [nx, ny] = this.path[0];
        const dd = nx > p.x ? 3 : nx < p.x ? 2 : ny < p.y ? 1 : 0;
        if (this.walkable(nx, ny)) { this.path.shift(); this.tryStep(dd, 0.17); }
        else { const end = this.path[this.path.length - 1]; this.path = this.findPath(end[0], end[1]) || []; if (!this.path.length) this.target = null; }
      } else if (this.target) {
        const tg = this.target; this.target = null;
        p.dir = tg.x > p.x ? 3 : tg.x < p.x ? 2 : tg.y < p.y ? 1 : 0;
        if (Math.abs(tg.x - p.x) + Math.abs(tg.y - p.y) === 1) this.interact();
      } else { p.cont = false; p.turn = 0; }
    }
    if (consume('a') && !p.moving) this.interact();
    consume('b');
    // balão de necessidade do companheiro
    this.emoteT -= dt;
    if (this.emoteT <= 0) {
      const need = moodOf(G.save).need;
      this.emoteKind = this.emoteKind ? null : (need ? need.key : null);
      this.emoteT = this.emoteKind ? 2.2 : rand(5, 8);
    }
  }

  tryStep(d, dur = 0) {
    const p = this.p; p.dir = d;
    const [dx, dy] = DIRS[d]; const nx = p.x + dx, ny = p.y + dy;
    if (!this.walkable(nx, ny)) {
      if (this.bumpCd <= 0) { sfx('bump'); this.bumpCd = 0.35; }
      p.cont = false; return;
    }
    p.fx = p.x; p.fy = p.y; p.x = nx; p.y = ny; p.t = 0; p.moving = true; p.cont = true;
    p.dur = dur || (input.run ? 0.13 : 0.21); p.alt = !p.alt;
    // companheiro vai para onde o jogador estava
    const c = this.c;
    if (!(c.x === p.fx && c.y === p.fy)) {
      c.fx = c.x; c.fy = c.y; c.x = p.fx; c.y = p.fy; c.t = 0; c.moving = true; c.dur = p.dur;
      c.dir = c.x > c.fx ? 3 : c.x < c.fx ? 2 : c.y < c.fy ? 1 : 0;
    }
    if (input.run && this.tile(p.fx, p.fy) === '=') this.burst(p.fx * T + 8, p.fy * T + 15, 3, ['#e6cb92', '#f3dfae'], 'dust');
  }

  async arrive() {
    const p = this.p, s = G.save;
    s.pos = { map: this.mapId, x: p.x, y: p.y, dir: p.dir };
    s.stats.steps++;
    if (s.stats.steps % 25 === 0) petAdd(s, { hunger: -1, energy: -1 });
    const warp = (this.m.warps || []).find(w => w.x === p.x && w.y === p.y);
    if (warp) { this.path = []; this.target = null; await this.doWarp(warp); return; }
    const t = this.tile(p.x, p.y);
    if (t === 'w') {
      this.burst(p.x * T + 8, p.y * T + 12, 4, ['#62c052', '#9fe07a'], 'grass');
      if (s.stats.steps % 6 === 0) petAdd(s, { clean: -1 });
      this.encSteps++;
      if (this.encSteps >= 3 && Math.random() < 0.13) { this.encSteps = 0; this.path = []; this.target = null; await this.encounter(); }
    }
  }

  bfs() {
    const W = this.W, Hh = this.H, p = this.p, prev = new Int32Array(W * Hh).fill(-1), q = [p.y * W + p.x];
    prev[q[0]] = q[0];
    const isWarp = (x, y) => (this.m.warps || []).some(w => w.x === x && w.y === y);
    for (let qi = 0; qi < q.length; qi++) {
      const cur = q[qi], cx = cur % W, cy = (cur / W) | 0;
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= Hh) continue;
        const ni = ny * W + nx; if (prev[ni] !== -1 || !this.walkable(nx, ny)) continue;
        prev[ni] = cur; if (!isWarp(nx, ny)) q.push(ni);
      }
    }
    return prev;
  }
  pathFrom(prev, tx, ty) {
    const W = this.W; let i = ty * W + tx; if (prev[i] === -1) return null;
    const out = []; while (prev[i] !== i) { out.push([i % W, (i / W) | 0]); i = prev[i]; }
    return out.reverse();
  }
  findPath(tx, ty) { return this.pathFrom(this.bfs(), tx, ty); }
  // toque no mapa: anda até lá (ou até ao lado de quem/que foi tocado e interage)
  tapAt(clientX, clientY) {
    if (this.locked || G.busy || !this.cam) return;
    const r = G.canvas.getBoundingClientRect();
    const gx = (clientX - r.left) / G.cssPx + this.cam.x, gy = (clientY - r.top) / G.cssPx + this.cam.y;
    const p = this.p;
    let tx = Math.floor(gx / T), ty = Math.floor(gy / T);
    const npc = this.npcs.find(n => gx >= n.px && gx < n.px + 16 && gy >= n.py - 8 && gy < n.py + 16);
    if (npc) { tx = npc.x; ty = npc.y; }
    if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return;
    const t = this.tile(tx, ty);
    const interactive = npc || ['S', 'D', 'A', 'M', '~', 'L'].includes(t);
    this.marker = { x: tx * T + 8, y: ty * T + 8, t: 0.7, ok: true };
    if (interactive) {
      if (Math.abs(tx - p.x) + Math.abs(ty - p.y) === 1 && !p.moving) { this.path = []; this.target = { x: tx, y: ty }; return; }
      const prev = this.bfs(); let best = null;
      for (const [dx, dy] of DIRS) {
        const ax = tx + dx, ay = ty + dy; if (!this.walkable(ax, ay) && !(ax === p.x && ay === p.y)) continue;
        const path = (ax === p.x && ay === p.y) ? [] : this.pathFrom(prev, ax, ay);
        if (path && (!best || path.length < best.length)) best = path;
      }
      if (best) { this.path = best; this.target = { x: tx, y: ty }; }
      else this.marker.ok = false;
      return;
    }
    if (!this.walkable(tx, ty)) { this.marker.ok = false; return; }
    const path = this.findPath(tx, ty);
    if (path) { this.path = path; this.target = null; } else this.marker.ok = false;
  }

  async doWarp(w) {
    this.locked = true;
    await fadeOut(260);
    this.load(w.to, w.tx, w.ty, w.dir);
    this.enter();
    writeSave(G.save);
    await fadeIn(260);
    banner(this.m.name);
    this.locked = false;
  }

  async encounter() {
    this.locked = true;
    const zone = this.m.zone ? this.m.zone(this.p.x, this.p.y) : 'sul';
    const tab = ENCOUNTERS[zone]; const period = dayPhase().period;
    const sp = pickWeighted(tab[period]);
    const lvl = randi(tab.levels[0], tab.levels[1]);
    sfx('encounter'); this.excl = 0.6;
    await wait(450);
    this.flash = 0.35; await wait(380);
    G.wipe = { p: 0 }; await tween(G.wipe, { p: 1 }, 480, ease.inOut);
    this.locked = false;
    await G.goto('battle', { foe: makeCreature(sp, lvl) });
  }

  async interact() {
    const p = this.p; const [dx, dy] = DIRS[p.dir]; const x = p.x + dx, y = p.y + dy;
    const npc = this.npcs.find(n => n.x === x && n.y === y && !n.moving);
    const t = this.tile(x, y);
    this.locked = true;
    try {
      if (npc) { npc.dir = [1, 0, 3, 2][p.dir]; await this.talk(npc); }
      else if (t === 'S') await say(this.m.signs[`${x},${y}`] || ['...']);
      else if (t === 'D') await this.door(this.m.doors[`${x},${y}`]);
      else if (t === 'A') await this.heal();
      else if (t === 'M') await this.monolith();
      else if (t === '~') await say(['A água brilha com reflexos azulados.', 'Dá pra ver pequenas luzes dançando lá no fundo...']);
      else if (t === 'L') await say(dayPhase().lampsOn ? ['O lampião aquece a noite com uma luz alaranjada.'] : ['Um lampião de ferro. À noite ele acende sozinho.']);
    } finally { this.locked = false; clearQueue(); }
  }

  async talk(n) {
    const s = G.save;
    if (n.id === 'cida') {
      if (!s.flags.metCida) {
        await say(DIALOG.cida.first, { speaker: 'Vó Cida' });
        s.items.fita += 5; s.flags.metCida = true; sfx('item');
        await say(['Você recebeu 5 Fitas-encanto!'], {});
        await say(DIALOG.cida.after, { speaker: 'Vó Cida' });
        writeSave(s); return;
      }
      const i = (s.tipIdx.cida = ((s.tipIdx.cida ?? -1) + 1) % DIALOG.cida.tips.length);
      await say(DIALOG.cida.tips[i], { speaker: 'Vó Cida' }); return;
    }
    const tm = TAMERS[n.id];
    if (tm && !s.flags['beat_' + n.id]) {
      await say(tm.intro, { speaker: tm.name });
      const i = await choose('Aceitar o desafio?', ['Batalhar!', 'Agora não'], { speaker: tm.name });
      if (i !== 0) return;
      if (firstAlive(s) < 0) { await say(['Seus espíritos estão exaustos. Descanse no Santuário primeiro.']); return; }
      sfx('encounter'); this.excl = 0.5; await wait(400);
      G.wipe = { p: 0 }; await tween(G.wipe, { p: 1 }, 480, ease.inOut);
      await G.goto('battle', { tamer: { id: n.id, name: tm.name, team: tm.team.map(([sp, l]) => makeCreature(sp, l)) } });
      return;
    }
    const lines = DIALOG[n.id]; const i = (s.tipIdx[n.id] = ((s.tipIdx[n.id] ?? -1) + 1) % lines.length);
    await say(lines[i], { speaker: { tito: 'Tito', lia: 'Lia, a andarilha', duda: 'Duda, o domador' }[n.id] });
  }

  async door(d) {
    if (!d) return;
    if (d.kind === 'locked') { await say(d.text); return; }
    if (d.kind === 'home') {
      sfx('select');
      await G.goto('pet', { home: true });
    }
  }

  async heal() {
    const s = G.save;
    await say(['Um cristal sereno flutua sobre o altar do Santuário.']);
    sfx('heal');
    this.burst(this.crystal.x + 6, this.crystal.y + 8, 22, ['#9ff5e2', '#ffffff', '#4fd8c0'], 'sparkle');
    this.flash = 0.25;
    healAll(s);
    const msgs = ['Uma luz suave envolve o grupo. Todos recuperaram as forças!'];
    if (s.items.fita < 5) { s.items.fita = 5; msgs.push('O Santuário renovou suas Fitas-encanto (5).'); }
    await say(msgs);
    writeSave(s);
  }

  async monolith() {
    const s = G.save;
    if (!s.flags.monolith) {
      await say(['Runas antigas brilham na pedra...', 'Algo escorrega de uma fresta e cai aos seus pés!']);
      s.items.doce += 3; s.flags.monolith = true; sfx('item');
      this.burst(this.p.x * T + 8, this.p.y * T - 10, 16, ['#b49cff', '#7cf5d8', '#ffffff'], 'sparkle');
      await say(['Você ganhou 3 Doces de Luar!', 'Dê um ao seu companheiro na tela dele: ele vai adorar.']);
      writeSave(s);
    } else await say(['As runas pulsam devagar, como uma respiração.', 'Dizem que esta pedra é mais velha que a própria vila.']);
  }

  updateNpcs(dt) {
    for (const n of this.npcs) {
      if (n.moving) {
        n.t += dt / 0.3;
        if (n.t >= 1) { n.moving = false; n.x = n.tx; n.y = n.ty; n.px = n.x * T; n.py = n.y * T; }
        else { n.px = (n.x + (n.tx - n.x) * n.t) * T; n.py = (n.y + (n.ty - n.y) * n.t) * T; }
        continue;
      }
      if (this.locked) continue;
      n.cd -= dt;
      if (n.cd <= 0) {
        n.cd = rand(2, 5);
        const d = randi(0, 3);
        if (n.wander && Math.random() < 0.6) {
          const [dx, dy] = DIRS[d]; const tx = n.x + dx, ty = n.y + dy;
          const occupied = (tx === this.p.x && ty === this.p.y) || (tx === this.c.x && ty === this.c.y) || (tx === this.p.fx && ty === this.p.fy && this.p.moving);
          if (Math.abs(tx - n.home.x) <= 2 && Math.abs(ty - n.home.y) <= 1 && this.walkable(tx, ty, true) && !occupied && this.tile(tx, ty) !== 'w') {
            n.tx = tx; n.ty = ty; n.t = 0; n.moving = true;
          }
        }
        n.dir = d;
      }
    }
  }

  // ---------- partículas ----------
  burst(x, y, n, colors, kind) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = kind === 'sparkle' ? rand(20, 60) : rand(10, 30);
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (kind === 'grass' ? 25 : 10), life: 0, max: rand(0.35, 0.8), c: colors[i % colors.length], kind, g: kind === 'sparkle' ? 0 : 80 });
    }
  }
  updateParticles(dt) {
    const ph = dayPhase(); const cam = this.cam || { x: 0, y: 0 };
    // ambiente
    const amb = this.parts.filter(q => q.amb).length;
    if (ph.night) {
      if (amb < 16 && Math.random() < dt * 4) this.parts.push({ amb: 1, kind: 'firefly', x: cam.x + rand(0, G.iw), y: cam.y + rand(0, G.ih), vx: rand(-6, 6), vy: rand(-6, 6), life: 0, max: rand(4, 8), ph: rand(0, 6) });
    } else if (amb < 12 && Math.random() < dt * 1.5) {
      const petal = this.mapId === 'vila';
      this.parts.push({ amb: 1, kind: 'leaf', x: cam.x + rand(-20, G.iw), y: cam.y - 6, vx: rand(6, 14), vy: rand(10, 18), life: 0, max: 14, ph: rand(0, 6), c: petal ? (Math.random() < 0.5 ? '#ffaed6' : '#ffe0f0') : (Math.random() < 0.5 ? '#9fe07a' : '#e8c35a') });
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const q = this.parts[i]; q.life += dt;
      if (q.kind === 'firefly') { q.vx += rand(-20, 20) * dt; q.vy += rand(-20, 20) * dt; q.vx *= 0.98; q.vy *= 0.98; }
      else if (q.kind === 'leaf') { q.vx = 8 + Math.sin(q.life * 2 + q.ph) * 14; }
      else q.vy += (q.g || 0) * dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.life > q.max || (q.amb && q.y > cam.y + G.ih + 10)) this.parts.splice(i, 1);
    }
  }

  // ---------- desenho ----------
  draw(ctx) {
    const iw = G.iw, ih = G.ih, p = this.p, t = G.t;
    let camX = this.mapW <= iw ? (this.mapW - iw) / 2 : Math.max(0, Math.min(this.mapW - iw, p.px + 8 - iw / 2));
    let camY = this.mapH <= ih ? (this.mapH - ih) / 2 : Math.max(0, Math.min(this.mapH - ih, p.py + 8 - ih / 2 + 6));
    camX = Math.round(camX); camY = Math.round(camY); this.cam = { x: camX, y: camY };
    if (!this.oobPat) this.oobPat = ctx.createPattern(this.oobC, 'repeat');
    if (this.oobPat.setTransform) this.oobPat.setTransform(new DOMMatrix([1, 0, 0, 1, -camX, -camY]));
    ctx.fillStyle = this.oobPat; ctx.fillRect(0, 0, iw, ih);
    ctx.drawImage(this.mapC, -camX, -camY);
    const vis = (X, Y, w = 16, h = 16) => X + w > camX && X < camX + iw && Y + h > camY && Y < camY + ih;
    // água animada
    const wf = Math.floor(t * 3) % 4;
    const wimg = spr('water' + wf, () => S.waterTile(wf));
    for (const [X, Y] of this.water) if (vis(X, Y)) ctx.drawImage(wimg, X - camX, Y - camY);
    ctx.drawImage(this.shoreC, -camX, -camY);
    // mato alto
    const tf = Math.floor(t * 1.6) % 2;
    for (const [X, Y, k] of this.tall) if (vis(X, Y)) ctx.drawImage(spr('tall' + ((tf + k) % 2), () => S.tallGrass((tf + k) % 2)), X - camX, Y - camY);
    // cristal do santuário flutuando
    const ph = dayPhase();
    if (this.crystal) {
      const by = Math.round(Math.sin(t * 2) * 2);
      ctx.drawImage(spr('crystal', S.crystal), this.crystal.x - camX, this.crystal.y + by - camY);
    }
    if (this.marker) {
      const mk = this.marker, a = Math.min(1, mk.t * 2), rr = 4 + (0.7 - mk.t) * 6;
      ctx.globalAlpha = a; ctx.strokeStyle = mk.ok ? '#fff6c4' : '#ff6b7a'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(mk.x - camX, mk.y - rr - camY); ctx.lineTo(mk.x + rr - camX, mk.y - camY); ctx.lineTo(mk.x - camX, mk.y + rr - camY); ctx.lineTo(mk.x - rr - camX, mk.y - camY); ctx.closePath(); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // entidades ordenadas por y
    const ents = [];
    for (const n of this.npcs) ents.push({ y: n.py, draw: () => this.drawChar(ctx, n.look, n.dir, n.moving ? (n.t < 0.5 ? 1 : 0) : 0, n.px - camX, n.py - camY) });
    const comp = companion(G.save);
    const c = this.c;
    ents.push({ y: c.py - 1, draw: () => this.drawComp(ctx, comp, c.px - camX, c.py - camY) });
    const frame = p.moving ? (p.t < 0.5 ? (p.alt ? 1 : 2) : 0) : 0;
    ents.push({ y: p.py, draw: () => this.drawChar(ctx, 'player', p.dir, frame, Math.round(p.px) - camX, Math.round(p.py) - camY) });
    ents.sort((a, b) => a.y - b.y).forEach(e => e.draw());
    // franja do mato por cima dos pés
    const front = spr('tallFront', () => S.tallGrass(0, true));
    for (const [X, Y] of this.tall) if (vis(X, Y)) {
      const occ = [p, c, ...this.npcs].some(e => Math.abs(e.px - X) < 16 && Math.abs(e.py - Y) < 16);
      if (occ) ctx.drawImage(front, X - camX, Y - camY);
    }
    ctx.drawImage(this.overC, -camX, -camY);
    // lampiões acesos à noite (por cima da camada alta)
    if (ph.lampsOn) for (const l of this.lights) if (l.lamp && vis(l.X, l.Y - 14, 16, 30)) ctx.drawImage(spr('lampOn', () => S.lamp(true)), 0, 0, 16, 14, l.X - camX, l.Y - 14 - camY, 16, 14);
    // partículas (exceto vaga-lumes)
    for (const q of this.parts) {
      if (q.kind === 'firefly') continue;
      ctx.globalAlpha = q.amb ? 0.9 : Math.max(0, 1 - q.life / q.max);
      ctx.fillStyle = q.c || '#fff';
      const sz = q.kind === 'sparkle' ? 2 : 1;
      ctx.fillRect(Math.round(q.x - camX), Math.round(q.y - camY), sz, q.kind === 'leaf' ? 1 + (Math.sin(q.life * 6 + q.ph) > 0 ? 1 : 0) : sz);
    }
    ctx.globalAlpha = 1;
    // balão do companheiro / exclamação
    if (this.emoteKind && !this.locked) {
      const ek = this.emoteKind, img = spr('emote' + ek, () => emote(ek));
      ctx.drawImage(img, Math.round(c.px - camX + 10), Math.round(c.py - camY - 22 + Math.sin(t * 4)));
    }
    if (this.excl > 0) ctx.drawImage(spr('emotealert', () => emote('alert')), Math.round(p.px - camX + 2), Math.round(p.py - camY - 22));
    this.drawLighting(ctx, ph, camX, camY, comp);
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, this.flash * 4) * (Math.floor(this.flash * 20) % 2 ? 1 : 0.4)})`; ctx.fillRect(0, 0, iw, ih); }
  }

  drawChar(ctx, look, dir, frame, x, y) {
    ctx.fillStyle = 'rgba(20,30,40,0.3)';
    ctx.beginPath(); ctx.ellipse(x + 8, y + 15, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(spr(`ch_${look}_${dir}_${frame}`, () => S.character(look, dir, frame)), x, y - 8);
  }
  drawComp(ctx, comp, x, y) {
    if (!comp) return;
    const bob = Math.sin(G.t * 3.2) * 1.6;
    const img = spr(`mini_${comp.species}_${Math.floor(G.t * 4) % 2}`, () => S.mini(comp.species, Math.floor(G.t * 4) % 2));
    ctx.fillStyle = `rgba(20,30,40,${0.22 - bob * 0.03})`;
    ctx.beginPath(); ctx.ellipse(x + 8, y + 15, 4 - bob * 0.3, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(img, Math.round(x + 8 - img.width / 2), Math.round(y + 12 - img.height - 2 + bob));
  }
  drawLighting(ctx, ph, camX, camY, comp) {
    const iw = G.iw, ih = G.ih, t = G.t;
    if (ph.tint.some(v => v < 254)) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgb(${ph.tint.join(',')})`; ctx.fillRect(0, 0, iw, ih);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (ph.dark < 0.02) return;
    if (!this.lc || this.lc.width !== iw || this.lc.height !== ih) [this.lc, this.lx] = makeCanvas(iw, ih);
    const lx = this.lx, L = getLight();
    lx.globalCompositeOperation = 'source-over';
    lx.clearRect(0, 0, iw, ih);
    lx.fillStyle = `rgba(6,8,30,${ph.dark})`; lx.fillRect(0, 0, iw, ih);
    lx.globalCompositeOperation = 'destination-out';
    const all = [];
    for (const l of this.lights) all.push(l);
    const c = this.c, p = this.p;
    const big = comp && comp.species === 'pirilume';
    all.push({ x: c.px + 8, y: c.py + 2, r: big ? 58 : 48, color: comp ? SPECIES[comp.species].glow : null, flick: 1 });
    all.push({ x: p.px + 8, y: p.py + 6, r: 38 });
    for (const q of this.parts) if (q.kind === 'firefly') all.push({ x: q.x, y: q.y, r: 9 });
    for (const l of all) {
      const r = l.r * (l.flick ? 1 + Math.sin(t * 9) * 0.04 : 1);
      const X = l.x - camX, Y = l.y - camY;
      if (X + r < 0 || X - r > iw || Y + r < 0 || Y - r > ih) continue;
      lx.drawImage(L, X - r, Y - r, r * 2, r * 2);
    }
    ctx.drawImage(this.lc, 0, 0);
    // brilho colorido aditivo
    ctx.globalCompositeOperation = 'lighter';
    for (const l of all) {
      if (!l.color) continue;
      const r = l.r * 0.8, X = l.x - camX, Y = l.y - camY;
      if (X + r < 0 || X - r > iw || Y + r < 0 || Y - r > ih) continue;
      ctx.globalAlpha = Math.min(0.55, ph.dark * 0.8);
      ctx.drawImage(glowSprite(l.color), X - r, Y - r, r * 2, r * 2);
    }
    // janelas acesas
    if (ph.lampsOn) {
      ctx.globalAlpha = Math.min(0.9, ph.dark * 1.6);
      ctx.fillStyle = '#ffcf6b';
      for (const w of this.windows) ctx.fillRect(w.x - camX, w.y - camY, w.w, w.h);
    }
    // vaga-lumes
    for (const q of this.parts) {
      if (q.kind !== 'firefly') continue;
      const a = (Math.sin(q.life * 3 + q.ph) + 1) / 2 * Math.min(1, q.life, q.max - q.life);
      ctx.globalAlpha = a; ctx.fillStyle = '#e9ff8a';
      ctx.fillRect(Math.round(q.x - camX), Math.round(q.y - camY), 1, 1);
      ctx.globalAlpha = a * 0.5; ctx.drawImage(glowSprite('rgba(220,255,120,0.8)'), q.x - camX - 4, q.y - camY - 4, 8, 8);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}
void SPECIES; void choose; void toast;
