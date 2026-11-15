// audio.js — música e efeitos 100% sintetizados (composições originais, Web Audio).
let ac = null, master, music, sfxBus, filt, noiseBuf;
let enabled = true, wanted = null, playing = null, step = 0, nextT = 0, timer = null;

const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10] };
const ROOTS = { C4: 261.63, D4: 293.66, F4: 349.23, A3: 220.0, G3: 196.0 };
const _ = '-', o = '.';
// melodias em graus da escala, uma colcha por colcheia (8 por compasso)
const TRACKS = {
  vila: {
    bpm: 92, root: 'F4', scale: 'major', prog: [0, 5, 3, 4, 0, 5, 3, 0], lead: 'square', perc: false,
    mel: [4, _, 2, _, 0, _, 2, 4, 5, _, 4, 2, 0, _, o, o, 3, _, 5, _, 7, _, 5, 3, 4, _, _, _, 1, 2, 4, _,
      4, _, 5, 4, 2, _, 0, 2, 5, _, 7, _, 9, _, 7, 5, 3, _, 2, _, 1, _, 3, _, 0, _, _, _, o, o, o, o],
  },
  trilha: {
    bpm: 112, root: 'D4', scale: 'dorian', prog: [0, 6, 3, 0, 0, 6, 4, 0], lead: 'square', perc: true,
    mel: [0, _, 2, 4, _, 3, 2, _, 6, _, 5, 4, _, 2, 4, _, 3, _, 4, 5, _, 7, 6, 5, 4, _, _, _, 2, _, o, o,
      7, _, 6, 7, _, 4, 2, _, 6, _, 4, 6, _, 5, 4, _, 4, _, 5, 4, 2, _, 1, _, 0, _, _, _, o, o, o, o],
  },
  batalha: {
    bpm: 148, root: 'A3', scale: 'minor', prog: [0, 5, 6, 4, 0, 5, 6, 4], lead: 'square', perc: true, drive: true,
    mel: [7, o, 7, 6, 7, o, 4, o, 5, o, 5, 4, 5, o, 2, o, 6, o, 6, 5, 6, o, 8, o, 9, _, 8, _, 7, _, 4, _,
      7, o, 9, o, 10, o, 9, 7, 5, o, 7, o, 8, o, 7, 5, 6, o, 8, o, 9, o, 8, 6, 4, _, 4, _, 6, _, 7, _],
  },
  casa: {
    bpm: 76, root: 'C4', scale: 'major', prog: [0, 3, 4, 0, 5, 3, 4, 0], lead: 'triangle', perc: false,
    mel: [4, _, _, 2, _, _, 4, _, 5, _, _, 3, _, _, 1, _, 4, _, _, 3, 2, _, 1, _, 0, _, _, _, _, _, o, o,
      2, _, _, 4, _, _, 5, _, 7, _, _, 5, _, _, 3, _, 4, _, _, 2, _, _, 1, _, 0, _, _, _, _, _, o, o],
  },
};

function freqOf(tr, deg, oct = 0) {
  const sc = SCALES[tr.scale]; const o7 = Math.floor(deg / 7), i = ((deg % 7) + 7) % 7;
  return ROOTS[tr.root] * Math.pow(2, (sc[i] + 12 * (o7 + oct)) / 12);
}
function tone(f, t, dur, { type = 'triangle', vol = 0.2, dest = music, att = 0.01, rel = 0.08, slide = 0 } = {}) {
  const os = ac.createOscillator(), g = ac.createGain();
  os.type = type; os.frequency.setValueAtTime(f, t);
  if (slide) os.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + att);
  g.gain.setTargetAtTime(0.0001, t + Math.max(att, dur - rel), rel / 2);
  os.connect(g); g.connect(dest); os.start(t); os.stop(t + dur + rel * 3);
}
function noise(t, dur, vol = 0.2, dest = sfxBus, hp = 0) {
  const src = ac.createBufferSource(); src.buffer = noiseBuf;
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  if (hp) { const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; src.connect(f); f.connect(g); }
  else src.connect(g);
  g.connect(dest); src.start(t); src.stop(t + dur + 0.02);
}

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ac = new AC();
  master = ac.createGain(); master.gain.value = enabled ? 0.9 : 0; master.connect(ac.destination);
  filt = ac.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 2600; filt.connect(master);
  music = ac.createGain(); music.gain.value = 0.55; music.connect(filt);
  sfxBus = ac.createGain(); sfxBus.gain.value = 0.7; sfxBus.connect(master);
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  timer = setInterval(schedule, 60);
  if (wanted) playMusic(wanted, true);
}
export function setSound(on) {
  enabled = on;
  if (master) master.gain.setTargetAtTime(on ? 0.9 : 0, ac.currentTime, 0.05);
}
export function playMusic(name, force = false) {
  wanted = name;
  if (!ac || (!force && playing === name)) return;
  playing = name; step = 0; nextT = ac.currentTime + 0.12;
  music.gain.cancelScheduledValues(ac.currentTime);
  music.gain.setValueAtTime(0.0001, ac.currentTime); music.gain.linearRampToValueAtTime(0.55, ac.currentTime + 0.6);
}
export function stopMusic() { wanted = null; playing = null; }

function schedule() {
  if (!ac || !playing || document.hidden) return;
  const tr = TRACKS[playing]; const spb = 60 / tr.bpm / 2; // segundos por colcheia
  if (nextT < ac.currentTime - 0.3) nextT = ac.currentTime + 0.05;
  while (nextT < ac.currentTime + 0.25) {
    const n = tr.mel.length, i = step % n, bar = Math.floor(i / 8) % tr.prog.length, beat = i % 8;
    const ch = tr.prog[bar];
    // melodia (com sustentação)
    const tok = tr.mel[i];
    if (typeof tok === 'number') {
      let len = 1; while (tr.mel[(i + len) % n] === _ && len < 8) len++;
      tone(freqOf(tr, tok), nextT, spb * len * 0.95, { type: tr.lead, vol: tr.lead === 'square' ? 0.055 : 0.13, att: 0.015, rel: 0.12 });
    }
    // baixo
    if (tr.drive) { tone(freqOf(tr, ch + (beat % 2 ? 4 : 0), -2), nextT, spb * 0.9, { vol: 0.17, rel: 0.05 }); }
    else if (beat === 0 || beat === 4) tone(freqOf(tr, ch + (beat === 4 ? 4 : 0), -2), nextT, spb * 3.6, { vol: 0.16, rel: 0.2 });
    // arpejo suave
    const arp = [0, 2, 4, 7, 4, 2, 0, 2][beat];
    tone(freqOf(tr, ch + arp, -1), nextT, spb * 0.8, { type: 'triangle', vol: 0.05, rel: 0.06 });
    // percussão leve
    if (tr.perc) {
      if (beat % 2 === 1) noise(nextT, 0.04, 0.035, music, 6000);
      if (beat === 0 || beat === 4) tone(110, nextT, 0.12, { type: 'sine', vol: 0.22, slide: 40, rel: 0.05 });
      if (tr.drive && (beat === 2 || beat === 6)) noise(nextT, 0.09, 0.06, music, 1500);
    }
    nextT += spb; step++;
  }
}

// ---------- efeitos ----------
const SFX = {
  select: t => tone(880, t, 0.06, { type: 'square', vol: 0.08, dest: sfxBus, slide: 1320 }),
  back: t => tone(660, t, 0.07, { type: 'square', vol: 0.07, dest: sfxBus, slide: 420 }),
  bump: t => tone(140, t, 0.08, { type: 'sine', vol: 0.25, dest: sfxBus, slide: 90 }),
  talk: t => tone(520 + Math.random() * 80, t, 0.03, { type: 'square', vol: 0.03, dest: sfxBus }),
  encounter: t => { for (let i = 0; i < 6; i++) tone(330 * Math.pow(1.19, i), t + i * 0.05, 0.08, { type: 'square', vol: 0.07, dest: sfxBus }); },
  hit: t => { noise(t, 0.14, 0.32); tone(220, t, 0.14, { type: 'sine', vol: 0.3, dest: sfxBus, slide: 55 }); },
  super: t => { noise(t, 0.2, 0.4); tone(300, t, 0.2, { type: 'square', vol: 0.12, dest: sfxBus, slide: 60 }); noise(t + 0.1, 0.12, 0.3); },
  weak: t => { noise(t, 0.08, 0.15, sfxBus, 2000); },
  heal: t => { [0, 4, 7, 12, 16].forEach((s, i) => tone(523 * Math.pow(2, s / 12), t + i * 0.07, 0.18, { vol: 0.12, dest: sfxBus })); },
  level: t => { [0, 4, 7, 12, 7, 12].forEach((s, i) => tone(523 * Math.pow(2, s / 12), t + i * 0.09, 0.14, { type: 'square', vol: 0.06, dest: sfxBus })); },
  throw: t => { tone(300, t, 0.3, { type: 'sine', vol: 0.15, dest: sfxBus, slide: 1100 }); noise(t, 0.25, 0.08, sfxBus, 3000); },
  tick: t => tone(320, t, 0.05, { type: 'square', vol: 0.08, dest: sfxBus }),
  catch: t => { [7, 12, 16, 19, 24].forEach((s, i) => tone(392 * Math.pow(2, s / 12), t + i * 0.08, 0.2, { type: 'square', vol: 0.06, dest: sfxBus })); },
  fail: t => { [7, 3, 0].forEach((s, i) => tone(392 * Math.pow(2, s / 12), t + i * 0.1, 0.14, { type: 'square', vol: 0.06, dest: sfxBus })); },
  faint: t => tone(440, t, 0.6, { type: 'triangle', vol: 0.2, dest: sfxBus, slide: 70 }),
  evolve: t => { for (let i = 0; i < 12; i++) tone(392 * Math.pow(2, ((i * 5) % 24) / 12), t + i * 0.06, 0.12, { vol: 0.09, dest: sfxBus }); },
  eat: t => { noise(t, 0.06, 0.18, sfxBus, 800); noise(t + 0.14, 0.06, 0.18, sfxBus, 800); },
  bubble: t => tone(500 + Math.random() * 300, t, 0.06, { type: 'sine', vol: 0.12, dest: sfxBus, slide: 1400 }),
  happy: t => { tone(660, t, 0.08, { vol: 0.1, dest: sfxBus, slide: 990 }); tone(990, t + 0.09, 0.1, { vol: 0.1, dest: sfxBus }); },
  item: t => { tone(784, t, 0.1, { type: 'square', vol: 0.06, dest: sfxBus }); tone(1175, t + 0.1, 0.2, { type: 'square', vol: 0.06, dest: sfxBus }); },
  crack: t => { noise(t, 0.05, 0.25, sfxBus, 2500); tone(900, t, 0.04, { type: 'square', vol: 0.05, dest: sfxBus }); },
  hatch: t => { for (let i = 0; i < 8; i++) tone(523 * Math.pow(2, [0, 4, 7, 11, 12, 16, 19, 24][i] / 12), t + i * 0.06, 0.25, { vol: 0.08, dest: sfxBus }); },
  run: t => { noise(t, 0.2, 0.1, sfxBus, 1000); tone(500, t, 0.2, { type: 'sine', vol: 0.1, dest: sfxBus, slide: 1500 }); },
};
export function sfx(name) {
  if (!ac || !enabled || !SFX[name]) return;
  try { SFX[name](ac.currentTime + 0.005); } catch (e) { /* ignora */ }
}
