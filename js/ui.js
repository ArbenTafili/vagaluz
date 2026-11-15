// ui.js — camada HTML: diálogos, painel, HUD, grupo, transições.
import { G, wait, waitPress, waitPressOr, onNextPress, pressA } from './engine.js';
import { SPECIES, TYPES, statsFor, xpToNext, DEX_ORDER } from './data.js';
import { creature, mini } from './sprites.js';
import { toCanvas } from './gfx.js';
import { sfx } from './audio.js';
import { maxHp, moodOf, companion, writeSave, setCompanion } from './state.js';

export const $ = (s) => document.querySelector(s);
export const $$ = (s) => [...document.querySelectorAll(s)];

const ICONS = {
  paw: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="10" r="2.4"/><circle cx="10" cy="5.5" r="2.4"/><circle cx="14.5" cy="5.5" r="2.4"/><circle cx="18.5" cy="10" r="2.4"/><path d="M12 11c3 0 6 4.5 6 7 0 2-2 2.6-3.5 2.2-1-.3-1.6-.7-2.5-.7s-1.5.4-2.5.7C8 20.6 6 20 6 18c0-2.5 3-7 6-7z"/></svg>',
  party: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="8" r="3.4"/><circle cx="16.5" cy="9" r="2.8"/><path d="M2 19c0-3.3 2.7-6 6-6s6 2.7 6 6v1H2z"/><path d="M14.6 13.4c.6-.2 1.2-.3 1.9-.3 3 0 5.5 2.4 5.5 5.4V20h-6.4v-1c0-2.1-.4-4-1-5.6z"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>',
  ribbon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 10c-2-3-7-5-8.5-3S5 13 12 12c7 1 10-3 8.5-5S14 7 12 10z"/><path d="m11 12-4 9 3-1 1.5 2 .5-10zm2 0 4 9-3-1-1.5 2-.5-10z"/><circle cx="12" cy="11" r="2"/></svg>',
  run: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="15" cy="4" r="2.4"/><path d="m10 8 4-1 3 3 3 1-.6 2-3.7-1.2-1.5-1.5-1.2 3.5 3 2.5V22h-2v-4l-3-2.3-1.4 3.6L5 22l-1-1.8 3.6-2.7L10 10l-2 1v3H6V9.8z"/></svg>',
  food: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c-1-2-3-3-5-2.5C3.5 5.5 3 10 4.5 14S9 21 12 20c3 1 6-2 7.5-6S20.5 5.5 17 4.5C15 4 13 5 12 7z"/><path d="M12 7c0-2 1-4 3-5" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>',
  drop: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s7 7.5 7 12.5A7 7 0 0 1 5 14.5C5 9.5 12 2 12 2z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4.5"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></g></svg>',
  book: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4.5C4 3.7 4.7 3 5.5 3H11v16H5.5c-.8 0-1.5.4-1.5 1V4.5zM13 3h5.5c.8 0 1.5.7 1.5 1.5V20c0-.6-.7-1-1.5-1H13V3z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="m16 9 6 6m0-6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};
export function icon(name) { return ICONS[name] || ''; }
export function initIcons(root = document) {
  root.querySelectorAll('[data-ico]').forEach(el => { el.innerHTML = ICONS[el.dataset.ico] || ''; });
}

// ---------- painel ----------
export function setPanel(name) {
  $('#panel').dataset.mode = name;
  $$('.psec').forEach(s => s.classList.toggle('on', s.id === 'p-' + name));
}

// ---------- diálogo ----------
const msg = () => $('#msg');
let typing = null;
async function typeInto(el, text, boxEl) {
  el.textContent = '';
  boxEl.classList.remove('ready');
  let skip = false;
  typing = () => { skip = true; };
  for (let i = 0; i < text.length; i++) {
    if (skip) { el.textContent = text; break; }
    el.textContent = text.slice(0, i + 1);
    if (i % 3 === 0 && text[i] !== ' ') sfx('talk');
    await wait(text[i] === '.' || text[i] === '!' || text[i] === '?' ? 70 : 18);
  }
  typing = null;
  boxEl.classList.add('ready');
}
// mostra falas; aguarda toque/A para avançar. Em batalha, usa a caixa do painel.
export async function say(lines, opts = {}) {
  if (typeof lines === 'string') lines = [lines];
  const inBattle = G.mode === 'battle';
  const box = inBattle ? $('#btext') : msg();
  const textEl = inBattle ? box : box.querySelector('.text');
  if (!inBattle) {
    box.querySelector('.speaker').textContent = opts.speaker || '';
    box.querySelector('.choices').innerHTML = '';
    box.classList.remove('hidden');
  }
  for (const line of lines) {
    const cancelSkip = onNextPress(() => { if (typing) typing(); });
    await typeInto(textEl, line, box);
    cancelSkip();
    if (opts.auto) await waitPressOr(opts.auto);
    else await waitPress();
  }
  if (!inBattle && !opts.keep) box.classList.add('hidden');
  box.classList.remove('ready');
}

export async function choose(text, options, opts = {}) {
  const box = msg();
  box.querySelector('.speaker').textContent = opts.speaker || '';
  box.classList.remove('hidden');
  await typeInto(box.querySelector('.text'), text, box);
  box.classList.remove('ready');
  const ch = box.querySelector('.choices');
  return new Promise(res => {
    ch.innerHTML = '';
    options.forEach((o, i) => {
      const b = document.createElement('button'); b.textContent = o;
      b.onclick = (e) => { e.stopPropagation(); sfx('select'); ch.innerHTML = ''; box.classList.add('hidden'); res(i); };
      ch.appendChild(b);
    });
  });
}

// ---------- toast / banner / fade ----------
let toastT = 0;
export function toast(text, ms = 1800) {
  const el = $('#toast'); el.textContent = text; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms);
}
let bannerT = 0;
export function banner(text) {
  const el = $('#banner'); el.textContent = text; el.classList.add('show');
  clearTimeout(bannerT); bannerT = setTimeout(() => el.classList.remove('show'), 2200);
}
export async function fadeOut(ms = 280) { const f = $('#fade'); f.style.transitionDuration = ms + 'ms'; f.classList.add('on'); await wait(ms + 20); }
export async function fadeIn(ms = 280) { const f = $('#fade'); f.style.transitionDuration = ms + 'ms'; f.classList.remove('on'); await wait(ms); }

// número flutuante sobre o canvas (coordenadas internas do jogo)
export function floatText(x, y, text, cls = '') {
  const el = document.createElement('div'); el.className = 'dmg ' + cls; el.textContent = text;
  el.style.left = (x * G.cssPx) + 'px'; el.style.top = (y * G.cssPx) + 'px';
  $('#fx').appendChild(el); setTimeout(() => el.remove(), 950);
}

// ---------- HUD ----------
let lastHud = '';
export function updateHud(locName) {
  const s = G.save; if (!s) return;
  const h = new Date();
  const hr = G.hourOverride != null ? G.hourOverride : h.getHours() + h.getMinutes() / 60;
  const hh = Math.floor(hr), mm = G.hourOverride != null ? Math.round((hr - hh) * 60) : h.getMinutes();
  const night = hr < 5.5 || hr >= 18.5;
  const key = `${locName}|${hh}:${mm}|${night}`;
  if (key !== lastHud) {
    lastHud = key;
    if (locName) $('#hud-loc').textContent = locName;
    $('#hud-clock').innerHTML = `<span class="ico" style="color:${night ? '#cdb8ff' : '#ffd66b'}">${icon(night ? 'moon' : 'sun')}</span> ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  const comp = companion(s);
  if (comp) {
    const chip = $('#hud-pet'); const m = moodOf(s);
    chip.classList.toggle('alert', !!m.need);
    const cv = chip.querySelector('canvas');
    if (cv.dataset.sp !== comp.species) {
      cv.dataset.sp = comp.species;
      const mc = toCanvas(mini(comp.species, 0)); cv.width = mc.width; cv.height = mc.height;
      cv.getContext('2d').drawImage(mc, 0, 0);
    }
  }
}
export function soundIcon(on) { $('#btn-sound').innerHTML = icon(on ? 'soundOn' : 'soundOff'); }

// ---------- retratos ----------
const portraitCache = new Map();
export function portrait(speciesId, expr = 'neutral') {
  const k = speciesId + expr;
  if (!portraitCache.has(k)) portraitCache.set(k, toCanvas(creature(speciesId, 0, expr)));
  const src = portraitCache.get(k);
  const c = document.createElement('canvas'); c.width = 48; c.height = 48;
  c.getContext('2d').drawImage(src, 0, 0); return c;
}
export function typeBadge(t) { return `<span class="type" style="background:${TYPES[t].color}">${TYPES[t].name}</span>`; }
export function hpClass(r) { return r > 0.5 ? '' : r > 0.2 ? 'mid' : 'low'; }

// ---------- grupo ----------
// mode: 'view' (exploração) | 'battle' (escolher substituto). Resolve índice escolhido ou -1.
export function openParty(mode = 'view', opts = {}) {
  const s = G.save;
  const sheet = $('#sheet'), body = $('#sheet-body');
  $('#sheet-title').textContent = mode === 'battle' ? (opts.forced ? 'Escolha quem entra' : 'Trocar espírito') : 'Seu grupo';
  sheet.classList.remove('hidden');
  return new Promise(res => {
    const close = (v) => { sheet.classList.add('hidden'); body.innerHTML = ''; res(v); };
    $('#sheet-close').onclick = () => { if (opts.forced) return; sfx('back'); close(-1); };
    $('#sheet-close').style.visibility = opts.forced ? 'hidden' : 'visible';
    const render = () => {
      body.innerHTML = '';
      s.party.forEach((c, i) => body.appendChild(monRow(c, i, mode, opts, (act) => {
        if (act === 'lead') { s.party.splice(i, 1); s.party.unshift(c); sfx('select'); writeSave(s); render(); }
        else if (act === 'pick') { sfx('select'); close(i); }
        else if (act === 'store') { s.party.splice(i, 1); s.box.push(c); sfx('back'); writeSave(s); render(); }
        else if (act === 'companion') { setCompanion(s, c); sfx('happy'); toast(`${c.name} agora é seu companheiro!`); writeSave(s); render(); }
      })));
      if (mode === 'view') {
        const bag = document.createElement('div'); bag.className = 'bag';
        bag.innerHTML = `<div>Fitas-encanto<br><b>${s.items.fita}</b></div><div>Doces de Luar<br><b>${s.items.doce}</b></div><div>Laços criados<br><b>${s.stats.recruited}</b></div>`;
        body.appendChild(bag);
        const sub = document.createElement('div'); sub.className = 'sheet-sub';
        sub.textContent = `Morando no habitat, em casa (${s.box.length})`; body.appendChild(sub);
        if (!s.box.length) { const e = document.createElement('div'); e.className = 'empty'; e.textContent = 'Ninguém por aqui ainda.'; body.appendChild(e); }
        s.box.forEach((c, i) => body.appendChild(monRow(c, i, 'box', opts, (act) => {
          if (act === 'bring' && s.party.length < 6) { s.box.splice(i, 1); s.party.push(c); sfx('select'); writeSave(s); render(); }
        })));
      }
    };
    render();
  });
}
function monRow(c, i, mode, opts, onAct) {
  const sp = SPECIES[c.species], mh = maxHp(c), r = c.hp / mh;
  const row = document.createElement('div');
  row.className = 'mon' + (i === 0 && mode !== 'box' ? ' lead' : '') + (c.hp <= 0 ? ' fainted' : '');
  row.appendChild(portrait(c.species, c.hp <= 0 ? 'closed' : 'neutral'));
  const info = document.createElement('div'); info.className = 'info';
  info.innerHTML = `<div class="top"><b>${c.name}</b><span class="lv">Nv.${c.level}</span>${typeBadge(sp.type)}</div>
    <div class="bar hp"><i class="${hpClass(r)}" style="width:${Math.max(0, r * 100)}%"></i></div>
    <small>PV ${Math.max(0, c.hp)}/${mh}${c.companion ? ' · <span class="tag">♥ companheiro</span>' : ''}</small>
    <div class="bar xp"><i style="width:${(c.xp / xpToNext(c.level)) * 100}%"></i></div>`;
  row.appendChild(info);
  const btn = document.createElement('button');
  if (mode === 'battle') {
    const can = c.hp > 0 && i !== opts.active;
    btn.textContent = i === opts.active ? 'Em campo' : c.hp <= 0 ? 'Exausto' : 'Entrar';
    btn.disabled = !can; if (can) btn.className = 'go';
    btn.onclick = () => can && onAct('pick');
  } else if (mode === 'box') {
    btn.textContent = 'Trazer'; btn.className = 'go';
    btn.onclick = () => onAct('bring');
  } else {
    if (i > 0) { btn.textContent = 'Na frente'; btn.onclick = () => onAct('lead'); }
    else { btn.textContent = 'Líder'; btn.disabled = true; }
    if (!c.companion) {
      const b3 = document.createElement('button'); b3.textContent = '♥ Companheiro';
      b3.onclick = () => onAct('companion'); row.appendChild(b3);
    }
    if (!c.companion && G.save.party.length > 1 && opts.canStore) {
      const b2 = document.createElement('button'); b2.textContent = 'Guardar'; b2.onclick = () => onAct('store'); row.appendChild(b2);
    }
  }
  row.appendChild(btn);
  return row;
}

// ---------- nome ----------
export function askName(def) {
  const dlg = $('#name-dlg'), inp = $('#name-input');
  dlg.classList.remove('hidden'); inp.value = def;
  setTimeout(() => { inp.focus(); inp.select(); }, 50);
  return new Promise(res => {
    const done = () => {
      const v = inp.value.trim().slice(0, 12) || def;
      dlg.classList.add('hidden'); inp.blur(); sfx('select'); res(v);
    };
    $('#name-ok').onclick = done;
    inp.onkeydown = e => { if (e.key === 'Enter') done(); e.stopPropagation(); };
  });
}

export function bindTapToAdvance() {
  // tocar na caixa de diálogo / texto de batalha / na tela avança
  $('#msg').addEventListener('pointerdown', e => { if (e.target.closest('.choices')) return; pressA('tap'); });
  $('#btext').addEventListener('pointerdown', () => pressA('tap'));
}
void statsFor;

// ---------- cartão do companheiro (painel de exploração) ----------
export function updateCompCard() {
  const s = G.save; const c = s && companion(s); if (!c) return;
  $('#cc-name').textContent = c.name; $('#cc-lv').textContent = 'Nv.' + c.level;
  const m = moodOf(s); $('#cc-mood').textContent = `${m.label} · ${m.pct >= 0 ? '+' : ''}${m.pct}%`;
  for (const i of $$('.cc-bars i')) i.firstChild.style.width = Math.round(s.pet[i.dataset.k]) + '%';
  const need = $('#cc-need'); need.textContent = m.need ? `${m.need.text}!` : 'Está bem cuidado e feliz.'; need.classList.toggle('warn', !!m.need);
  const cv = $('#cc-img');
  if (cv.dataset.sp !== c.species) { cv.dataset.sp = c.species; cv.width = 48; cv.height = 48; const x = cv.getContext('2d'); x.clearRect(0, 0, 48, 48); x.drawImage(portrait(c.species), 0, 0); }
}

// ---------- espiritário (coleção de 300 espécies) ----------
export function openDex() {
  const s = G.save, sheet = $('#sheet'), body = $('#sheet-body');
  const seen = DEX_ORDER.filter(id => s.seen[id]).length, caught = DEX_ORDER.filter(id => s.seen[id + '_caught']).length;
  $('#sheet-title').textContent = 'Espiritário';
  sheet.classList.remove('hidden');
  body.innerHTML = `<div class="dex-stats">Vistos ${seen} · Laços ${caught} · Espécies ${DEX_ORDER.length}</div><div class="dex-head" id="dex-head"></div><div class="dex-grid" id="dex-grid"></div>`;
  const grid = $('#dex-grid'), head = $('#dex-head');
  const num = i => '#' + String(i + 1).padStart(3, '0');
  const show = (id, i) => {
    const sp = SPECIES[id];
    if (!s.seen[id]) { head.innerHTML = `<div class="q">?</div><div><b>${num(i)} ???</b><p>Você ainda não encontrou este espírito. Explore a trilha de dia e de noite!</p></div>`; return; }
    head.innerHTML = ''; head.appendChild(portrait(id));
    const info = document.createElement('div');
    const evo = sp.evolve ? (s.seen[sp.evolve.to] ? `Evolui para ${SPECIES[sp.evolve.to].name} no Nv. ${sp.evolve.level}.` : `Evolui no Nv. ${sp.evolve.level}.`) : '';
    info.innerHTML = `<b>${num(i)} ${sp.name}</b> ${typeBadge(sp.type)}<p>${sp.dex}</p><p>${evo} ${s.seen[id + '_caught'] ? '<span style="color:var(--pink)">♦ Laço criado</span>' : 'Visto na natureza'}</p>`;
    head.appendChild(info);
  };
  const frag = document.createDocumentFragment();
  DEX_ORDER.forEach((id, i) => {
    const b = document.createElement('button'); b.className = 'dex-cell' + (s.seen[id + '_caught'] ? ' caught' : '');
    if (s.seen[id]) b.appendChild(portrait(id)); else b.append('?');
    const n = document.createElement('span'); n.className = 'n'; n.textContent = i + 1; b.appendChild(n);
    b.onclick = () => { grid.querySelectorAll('.sel').forEach(e => e.classList.remove('sel')); b.classList.add('sel'); sfx('select'); show(id, i); };
    frag.appendChild(b);
  });
  grid.appendChild(frag);
  const first = DEX_ORDER.findIndex(id => s.seen[id]); show(DEX_ORDER[Math.max(0, first)], Math.max(0, first));
  return new Promise(res => {
    $('#sheet-close').style.visibility = 'visible';
    $('#sheet-close').onclick = () => { sfx('back'); sheet.classList.add('hidden'); body.innerHTML = ''; res(); };
  });
}
