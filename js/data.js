// data.js — tipos, golpes, espécies (18 feitas à mão + 282 geradas) e regras.
import { buildGenerated, GEN_SPECIES, GEN_ORDER } from './gen.js';

export const TYPES = {
  comum: { name: 'Comum', color: '#9a948f' },
  brasa: { name: 'Brasa', color: '#ff7a33' },
  rio: { name: 'Rio', color: '#3f9cff' },
  mata: { name: 'Mata', color: '#45b356' },
  bruma: { name: 'Bruma', color: '#9b7cf5' },
  pedra: { name: 'Pedra', color: '#a8875e' },
  vento: { name: 'Vento', color: '#4fc2d9' },
  luz: { name: 'Luz', color: '#e8a91c' },
  gelo: { name: 'Gelo', color: '#6ccbe8' },
  raio: { name: 'Raio', color: '#7c6cff' },
};

// atacante -> defensor -> multiplicador
const CHART = {
  comum: { pedra: 0.5, bruma: 0.5 },
  brasa: { mata: 2, gelo: 2, rio: 0.5, pedra: 0.5, brasa: 0.5 },
  rio: { brasa: 2, pedra: 2, mata: 0.5, rio: 0.5, gelo: 0.5 },
  mata: { rio: 2, pedra: 2, brasa: 0.5, mata: 0.5, vento: 0.5 },
  bruma: { bruma: 2, comum: 2, luz: 0.5, pedra: 0.5 },
  pedra: { brasa: 2, gelo: 2, vento: 2, rio: 0.5, mata: 0.5 },
  vento: { mata: 2, raio: 0.5, pedra: 0.5 },
  luz: { bruma: 2, luz: 0.5, brasa: 0.5 },
  gelo: { mata: 2, vento: 2, brasa: 0.5, rio: 0.5, gelo: 0.5 },
  raio: { rio: 2, vento: 2, mata: 0.5, pedra: 0.5, raio: 0.5 },
};
export function typeMult(atk, def) { return (CHART[atk] && CHART[atk][def]) || 1; }

const st = (target, stat, stages) => ({ target, stat, stages });
export const MOVES = {
  esbarrao: { name: 'Esbarrão', type: 'comum', power: 40, acc: 100 },
  bicada: { name: 'Bicada', type: 'comum', power: 40, acc: 100 },
  pancada: { name: 'Pancada', type: 'comum', power: 60, acc: 95 },
  golpe_total: { name: 'Golpe Total', type: 'comum', power: 80, acc: 85 },
  lingua_ligeira: { name: 'Língua Ligeira', type: 'comum', power: 45, acc: 100 },
  olhar_fofo: { name: 'Olhar Fofo', type: 'comum', power: 0, acc: 100, effect: st('foe', 'atk', -1) },
  brilho: { name: 'Brilho Interior', type: 'luz', power: 0, acc: 100, effect: st('self', 'atk', 1) },
  faisca: { name: 'Faísca', type: 'brasa', power: 40, acc: 100 },
  chama_guia: { name: 'Chama-Guia', type: 'brasa', power: 60, acc: 95 },
  fogo_fatuo: { name: 'Fogo-Fátuo', type: 'brasa', power: 80, acc: 90 },
  respingo: { name: 'Respingo', type: 'rio', power: 40, acc: 100 },
  bolha: { name: 'Bolha', type: 'rio', power: 40, acc: 100 },
  correnteza: { name: 'Correnteza', type: 'rio', power: 60, acc: 95 },
  mare_alta: { name: 'Maré Alta', type: 'rio', power: 80, acc: 90 },
  folhada: { name: 'Folhada', type: 'mata', power: 40, acc: 100 },
  raiz_laco: { name: 'Raiz-Laço', type: 'mata', power: 50, acc: 95, drain: 0.5 },
  chuva_petalas: { name: 'Chuva de Pétalas', type: 'mata', power: 80, acc: 90 },
  esporos: { name: 'Esporos Sonolentos', type: 'mata', power: 0, acc: 95, effect: st('foe', 'atk', -1) },
  sussurro: { name: 'Sussurro', type: 'bruma', power: 40, acc: 100 },
  assombro: { name: 'Assombro', type: 'bruma', power: 60, acc: 90 },
  pesadelo: { name: 'Pesadelo', type: 'bruma', power: 80, acc: 90 },
  veu_nevoa: { name: 'Véu de Névoa', type: 'bruma', power: 0, acc: 100, effect: st('self', 'def', 1) },
  po_brilhante: { name: 'Pó Brilhante', type: 'bruma', power: 0, acc: 100, effect: st('foe', 'atk', -1) },
  canto_noturno: { name: 'Canto Noturno', type: 'bruma', power: 0, acc: 100, effect: st('foe', 'def', -1) },
  pedrisco: { name: 'Pedrisco', type: 'pedra', power: 45, acc: 95 },
  chifrada: { name: 'Chifrada', type: 'pedra', power: 55, acc: 95 },
  lasca_cristal: { name: 'Lasca de Cristal', type: 'pedra', power: 70, acc: 90 },
  casca_dura: { name: 'Casca Dura', type: 'pedra', power: 0, acc: 100, effect: st('self', 'def', 1) },
  brisa: { name: 'Brisa', type: 'vento', power: 40, acc: 100 },
  rajada: { name: 'Rajada', type: 'vento', power: 55, acc: 95 },
  ciclone: { name: 'Ciclone', type: 'vento', power: 80, acc: 90 },
  clarao: { name: 'Clarão', type: 'luz', power: 40, acc: 100 },
  raio_de_sol: { name: 'Raio de Sol', type: 'luz', power: 60, acc: 95 },
  aurora: { name: 'Aurora', type: 'luz', power: 80, acc: 90 },
  geada: { name: 'Geada', type: 'gelo', power: 40, acc: 100 },
  estalactite: { name: 'Estalactite', type: 'gelo', power: 60, acc: 95 },
  nevasca: { name: 'Nevasca', type: 'gelo', power: 80, acc: 90 },
  centelha: { name: 'Centelha', type: 'raio', power: 40, acc: 100 },
  relampago: { name: 'Relâmpago', type: 'raio', power: 65, acc: 95 },
  tempestade: { name: 'Tempestade', type: 'raio', power: 85, acc: 85 },
};

// ---------- espécies feitas à mão ----------
export const SPECIES = {
  pirilim: { name: 'Pirilim', type: 'brasa', base: { hp: 46, atk: 54, def: 44, spd: 60 }, xp: 22, catch: 0.4, float: true, glow: '#ffb648',
    learn: [[1, 'esbarrao'], [1, 'faisca'], [3, 'olhar_fofo'], [5, 'chama_guia']], evolve: { level: 6, to: 'pirilume' },
    dex: 'Uma faísca de espírito que nasce de ovos aquecidos pela lua. Brilha mais quando está feliz.',
    evoLine: 'A chama agora tem um brilho azulado de fogo-fátuo. Ele vai iluminar muito mais as noites!' },
  pirilume: { name: 'Pirilume', type: 'brasa', base: { hp: 64, atk: 74, def: 58, spd: 76 }, xp: 40, catch: 0.2, float: true, glow: '#8fe3ff',
    learn: [[1, 'esbarrao'], [1, 'faisca'], [3, 'olhar_fofo'], [5, 'chama_guia'], [6, 'fogo_fatuo']],
    dex: 'Guia viajantes perdidos com sua chama azulada. Dizem que sua auréola guarda um desejo.' },
  bolhim: { name: 'Bolhim', type: 'rio', base: { hp: 52, atk: 48, def: 50, spd: 52 }, xp: 22, catch: 0.4, glow: '#8fe3e0',
    learn: [[1, 'esbarrao'], [1, 'bolha'], [3, 'olhar_fofo'], [5, 'correnteza']], evolve: { level: 6, to: 'marulho' },
    dex: 'Brinca de soprar bolhas nos riachos. Cada bolha guarda um pedacinho de risada.',
    evoLine: 'Uma crista de ondas surgiu na cabeça dele. Dá até pra ouvir o mar!' },
  marulho: { name: 'Marulho', type: 'rio', base: { hp: 72, atk: 66, def: 68, spd: 66 }, xp: 40, catch: 0.2, glow: '#9fe6ff',
    learn: [[1, 'esbarrao'], [1, 'bolha'], [3, 'olhar_fofo'], [5, 'correnteza'], [6, 'mare_alta']],
    dex: 'Onde ele passa, o ar cheira a maresia. Protege os riachos com muita coragem.' },
  brotim: { name: 'Brotim', type: 'mata', base: { hp: 50, atk: 50, def: 52, spd: 50 }, xp: 22, catch: 0.4, glow: '#cdeea0',
    learn: [[1, 'esbarrao'], [1, 'folhada'], [3, 'olhar_fofo'], [5, 'raiz_laco']], evolve: { level: 6, to: 'ipezal' },
    dex: 'Suas orelhas de folha crescem um tiquinho a cada dia de sol.',
    evoLine: 'Uma copa de flores cor-de-rosa desabrochou na cabeça dele!' },
  ipezal: { name: 'Ipêzal', type: 'mata', base: { hp: 70, atk: 70, def: 70, spd: 62 }, xp: 40, catch: 0.2, glow: '#ffaed6',
    learn: [[1, 'esbarrao'], [1, 'folhada'], [3, 'olhar_fofo'], [5, 'raiz_laco'], [6, 'chuva_petalas']],
    dex: 'Quando floresce, enche a trilha de pétalas. Os outros espíritos adoram cochilar à sua sombra.' },
  musgolim: { name: 'Musgolim', type: 'mata', base: { hp: 52, atk: 46, def: 52, spd: 34 }, xp: 18, catch: 0.6, glow: '#a5d65e', wild: true,
    learn: [[1, 'esbarrao'], [1, 'folhada'], [4, 'raiz_laco']], dex: 'Vive em tocos antigos. Quando dorme, vira um montinho de musgo.' },
  gotelha: { name: 'Gotelha', type: 'rio', base: { hp: 48, atk: 52, def: 46, spd: 56 }, xp: 20, catch: 0.5, float: true, glow: '#8fd8ff', wild: true,
    learn: [[1, 'esbarrao'], [1, 'respingo'], [4, 'correnteza']], dex: 'Uma gota do riacho que ganhou vontade própria. Adora apagar fogueiras.' },
  brumito: { name: 'Brumito', type: 'bruma', base: { hp: 42, atk: 56, def: 40, spd: 64 }, xp: 22, catch: 0.45, float: true, glow: '#cdb8ff', wild: true, night: true,
    learn: [[1, 'sussurro'], [1, 'veu_nevoa'], [6, 'assombro']], dex: 'Aparece no mato alto quando a névoa sobe à noite. Ronrona como vento.' },
  pedrusco: { name: 'Pedrusco', type: 'pedra', base: { hp: 58, atk: 58, def: 72, spd: 24 }, xp: 28, catch: 0.35, glow: '#7cf5d8', wild: true, rare: true,
    learn: [[1, 'esbarrao'], [1, 'pedrisco'], [4, 'casca_dura']], dex: 'Um guardião de pedra que dorme há séculos. Sua runa acende quando sente amizade.' },
  fagulho: { name: 'Fagulho', type: 'brasa', base: { hp: 46, atk: 58, def: 42, spd: 58 }, xp: 20, catch: 0.5, glow: '#ffa060', wild: true,
    learn: [[1, 'esbarrao'], [1, 'faisca'], [4, 'chama_guia']], dex: 'Corre pelas pedras quentes deixando pegadas de brasa.' },
  sapuri: { name: 'Sapuri', type: 'rio', base: { hp: 54, atk: 48, def: 48, spd: 48 }, xp: 20, catch: 0.55, glow: '#98e0a0', wild: true,
    learn: [[1, 'lingua_ligeira'], [1, 'respingo'], [4, 'correnteza']], dex: 'Usa uma folha de vitória-régia como chapéu e coaxa canções de ninar.' },
  cogumelim: { name: 'Cogumelim', type: 'mata', base: { hp: 50, atk: 44, def: 54, spd: 40 }, xp: 20, catch: 0.55, glow: '#f58ac0', wild: true, night: true,
    learn: [[1, 'esbarrao'], [1, 'esporos'], [3, 'folhada'], [5, 'raiz_laco']], dex: 'Seu chapéu brilha fraquinho no escuro, como uma luminária de cabeceira.' },
  lumiposa: { name: 'Lumiposa', type: 'bruma', base: { hp: 44, atk: 52, def: 44, spd: 62 }, xp: 22, catch: 0.45, float: true, glow: '#dcc6ff', wild: true, night: true,
    learn: [[1, 'sussurro'], [1, 'po_brilhante'], [6, 'assombro']], dex: 'Mariposa espiritual atraída pela luz dos lampiões da vila.' },
  corujito: { name: 'Corujito', type: 'comum', base: { hp: 50, atk: 52, def: 46, spd: 54 }, xp: 20, catch: 0.5, glow: '#dcbc8e', wild: true, night: true,
    learn: [[1, 'bicada'], [1, 'canto_noturno'], [5, 'rajada']], dex: 'Fica acordado a noite toda vigiando a trilha. De dia, cochila de olhos abertos.' },
  ventolim: { name: 'Ventolim', type: 'vento', base: { hp: 44, atk: 50, def: 42, spd: 68 }, xp: 20, catch: 0.5, float: true, glow: '#e6f5ff', wild: true,
    learn: [[1, 'bicada'], [1, 'brisa'], [4, 'rajada']], dex: 'Um pedacinho de nuvem que se perdeu do céu e resolveu ficar.' },
  cascudo: { name: 'Cascudo', type: 'pedra', base: { hp: 54, atk: 54, def: 66, spd: 30 }, xp: 22, catch: 0.45, glow: '#7fc4a8', wild: true,
    learn: [[1, 'esbarrao'], [1, 'casca_dura'], [4, 'chifrada']], dex: 'Seu casco é duro como pedra, mas por baixo ele é bem molenga.' },
  geodim: { name: 'Geodim', type: 'pedra', base: { hp: 56, atk: 62, def: 68, spd: 34 }, xp: 30, catch: 0.3, glow: '#d4a8ff', wild: true, rare: true,
    learn: [[1, 'pedrisco'], [1, 'casca_dura'], [5, 'lasca_cristal']], dex: 'Os cristais nas costas guardam a luz das estrelas. Raríssimo!' },
};
const HANDMADE = Object.keys(SPECIES);
buildGenerated(new Set(Object.values(SPECIES).map(s => s.name)));
Object.assign(SPECIES, GEN_SPECIES);
export const DEX_ORDER = [...HANDMADE, ...GEN_ORDER];
export const STARTERS = [
  { id: 'pirilim', egg: 'brasa', label: 'Ovo morno', hint: 'pulsa com um calor gostoso' },
  { id: 'bolhim', egg: 'rio', label: 'Ovo orvalhado', hint: 'está sempre úmido e fresquinho' },
  { id: 'brotim', egg: 'mata', label: 'Ovo de broto', hint: 'tem cheirinho de folha nova' },
];

// ---------- fórmulas ----------
export function statsFor(speciesId, level) {
  const b = SPECIES[speciesId].base;
  return {
    hp: Math.floor(b.hp * level / 20) + level + 12,
    atk: Math.floor(b.atk * level / 30) + 5,
    def: Math.floor(b.def * level / 30) + 5,
    spd: Math.floor(b.spd * level / 30) + 5,
  };
}
export function xpToNext(level) { return 6 + level * 6; }
export function xpReward(speciesId, level) { return Math.floor(SPECIES[speciesId].xp * level / 4) + 2; }
export function movesAt(speciesId, level) {
  const out = [];
  for (const [l, m] of SPECIES[speciesId].learn) if (l <= level && !out.includes(m)) out.push(m);
  return out.slice(-4);
}

let uidCounter = Date.now() % 100000;
export function makeCreature(speciesId, level, opts = {}) {
  const c = {
    uid: 'c' + (uidCounter++) + Math.floor(Math.random() * 1000),
    species: speciesId, name: opts.name || SPECIES[speciesId].name,
    level, xp: 0, moves: movesAt(speciesId, level), companion: !!opts.companion,
  };
  c.hp = statsFor(speciesId, level).hp;
  return c;
}

// ---------- encontros: cada espécie selvagem mora numa zona e período ----------
export const ENCOUNTERS = {
  sul: { dia: [], noite: [], levels: [2, 4] },
  norte: { dia: [], noite: [], levels: [4, 7] },
};
let gj = 0;
for (const id of DEX_ORDER) {
  const sp = SPECIES[id];
  if (!sp.wild) continue;
  if (!sp.gen) {
    const w = sp.rare ? 3 : 9;
    const zone = sp.rare ? 'norte' : 'sul';
    const per = sp.night ? ['noite'] : ['dia', 'noite'];
    for (const p of per) { ENCOUNTERS[zone][p].push([id, w]); if (!sp.rare) ENCOUNTERS.norte[p].push([id, w / 3]); }
    continue;
  }
  const j = gj++;
  const zone = j % 2 ? 'norte' : 'sul';
  const per = [['dia'], ['noite'], ['dia', 'noite']][Math.floor(j / 2) % 3];
  for (const p of per) ENCOUNTERS[zone][p].push([id, sp.rare ? 1.2 : 3.5]);
}

export const ITEMS = {
  fita: { name: 'Fita-encanto', desc: 'Amarre num espírito enfraquecido para criar um laço.' },
  doce: { name: 'Doce de Luar', desc: 'Um docinho raro. Deixa o companheiro muito feliz.' },
};

// domadores (batalhas contra pessoas)
export const TAMERS = {
  lia: { name: 'Lia, a andarilha', team: [['sapuri', 4], ['fagulho', 4]], reward: { doce: 1, fita: 3 },
    intro: ['Ei! Você tem cara de quem leva jeito. Que tal uma batalha?'], win: ['Uau! Seus espíritos confiam muito em você.', 'Tome, você mereceu.'], lose: ['Boa tentativa! Cuide bem deles e volte depois.'] },
  duda: { name: 'Duda, o domador', team: [['cascudo', 6], ['lumiposa', 6], ['cogumelim', 7]], reward: { doce: 2, fita: 5 },
    intro: ['Ninguém passa pelo norte da trilha sem me enfrentar!', 'Prepare-se!'], win: ['Não acredito... Você é dos bons!', 'Leve isto. E volte quando quiser revanche.'], lose: ['Ha! Treine mais um pouco no sul da trilha.'] },
};
