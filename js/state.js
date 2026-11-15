// state.js — salvamento (localStorage), medidores do bichinho e progressão das criaturas.
import { SPECIES, statsFor, xpToNext, movesAt, MOVES, makeCreature } from './data.js';

const KEY = 'vagaluz-save-v1';

export function newSave() {
  const now = Date.now();
  return {
    v: 1, createdAt: now, savedAt: now, hatched: false,
    pos: { map: 'vila', x: 3, y: 7, dir: 0 },
    party: [], box: [],
    items: { fita: 5, doce: 0 },
    pet: { hunger: 70, joy: 75, energy: 85, clean: 80, sleeping: false, last: now },
    flags: {}, stats: { battles: 0, wins: 0, recruited: 0, steps: 0 },
    settings: { sound: true }, seen: {}, tipIdx: {},
  };
}
export function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.v === 1) return s;
  } catch (e) { /* sem save */ }
  return null;
}
export function writeSave(s) {
  try { s.savedAt = Date.now(); localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (e) { return false; }
}
export function wipeSave() { try { localStorage.removeItem(KEY); } catch (e) { /* ok */ } }

// ---------- bichinho virtual ----------
// perda por hora (tempo real, inclusive com o app fechado)
const DECAY = { hunger: 9, joy: 6, energy: 6, clean: 4 };
export function tickPet(s, now = Date.now()) {
  const p = s.pet;
  let hrs = (now - p.last) / 3600000;
  if (hrs <= 0) { p.last = now; return; }
  hrs = Math.min(hrs, 48);
  const slow = p.sleeping ? 0.5 : 1;
  p.hunger -= DECAY.hunger * hrs * slow;
  p.joy -= DECAY.joy * hrs * slow;
  p.clean -= DECAY.clean * hrs * slow;
  if (p.sleeping) p.energy += 30 * hrs; else p.energy -= DECAY.energy * hrs;
  for (const k of ['hunger', 'joy', 'energy', 'clean']) p[k] = Math.max(0, Math.min(100, p[k]));
  p.last = now;
}
export function petAdd(s, deltas) {
  for (const k in deltas) s.pet[k] = Math.max(0, Math.min(100, s.pet[k] + deltas[k]));
}
export function petAvg(s) { const p = s.pet; return (p.hunger + p.joy + p.energy + p.clean) / 4; }
export function bondMult(s) { return 0.85 + 0.3 * petAvg(s) / 100; }
export function moodOf(s) {
  const a = petAvg(s), p = s.pet;
  const label = a >= 80 ? 'Radiante' : a >= 60 ? 'Feliz' : a >= 40 ? 'Tranquilo' : a >= 20 ? 'Tristinho' : 'Abatido';
  let need = null;
  const low = [['hunger', 'Está com fome'], ['energy', 'Está com sono'], ['clean', 'Precisa de um banho'], ['joy', 'Quer brincar']]
    .filter(([k]) => p[k] < 30).sort((x, y) => p[x[0]] - p[y[0]]);
  if (low.length) need = { key: low[0][0], text: low[0][1] };
  const pct = Math.round((bondMult(s) - 1) * 100);
  return { label, need, pct, avg: a };
}

// ---------- criaturas ----------
export function companion(s) { return s.party.find(c => c.companion) || s.box.find(c => c.companion); }
export function maxHp(c) { return statsFor(c.species, c.level).hp; }
export function healAll(s) { for (const c of s.party) c.hp = maxHp(c); }
export function firstAlive(s) { return s.party.findIndex(c => c.hp > 0); }
export function hatchCompanion(s, name, speciesId = 'pirilim') {
  const c = makeCreature(speciesId, 4, { name, companion: true });
  s.party.unshift(c); s.hatched = true; s.seen[speciesId] = true; s.seen[speciesId + '_caught'] = true;
  return c;
}
export function setCompanion(s, c) {
  for (const x of [...s.party, ...s.box]) x.companion = false;
  c.companion = true;
}
// dá XP e devolve eventos (subiu de nível, aprendeu golpe, pode evoluir)
export function giveXp(c, amount) {
  const ev = [];
  c.xp += amount;
  while (c.xp >= xpToNext(c.level)) {
    c.xp -= xpToNext(c.level);
    const before = maxHp(c);
    c.level++;
    c.hp = Math.min(maxHp(c), c.hp + (maxHp(c) - before));
    ev.push({ kind: 'level', level: c.level });
    for (const [lv, mv] of SPECIES[c.species].learn) if (lv === c.level && !c.moves.includes(mv)) ev.push(learnMove(c, mv));
  }
  return ev;
}
export function learnMove(c, mv) {
  if (c.moves.includes(mv)) return { kind: 'none' };
  if (c.moves.length < 4) { c.moves.push(mv); return { kind: 'learn', move: mv }; }
  // troca o golpe mais fraco
  let wi = 0; c.moves.forEach((m, i) => { if ((MOVES[m].power || 30) < (MOVES[c.moves[wi]].power || 30)) wi = i; });
  const old = c.moves[wi]; c.moves[wi] = mv;
  return { kind: 'learn', move: mv, forgot: old };
}
export function canEvolve(c) {
  const ev = SPECIES[c.species].evolve; return ev && c.level >= ev.level ? ev.to : null;
}
export function evolve(c, to) {
  const wasDefault = c.name === SPECIES[c.species].name;
  const ratio = c.hp / maxHp(c);
  c.species = to; if (wasDefault) c.name = SPECIES[to].name;
  c.hp = Math.max(1, Math.round(maxHp(c) * ratio));
  const evs = [];
  for (const mv of movesAt(to, c.level)) if (!c.moves.includes(mv)) evs.push(learnMove(c, mv));
  return evs;
}
