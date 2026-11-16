// myth.js — 300 espécies "Lendas e Feras" (#301–#600), geradas de forma determinística.
// Feras: arquétipos de bichos populares em jogos de criaturas (lobos, raposas, aves de rapina, dragões,
// serpentes, peixes, mariposas, golens), com linhas de evolução de até 3 estágios.
// Lendas: 60 espíritos únicos inspirados em mitos do sol, da lua, do trovão, do mar, das montanhas...
// Tudo original: só arquétipos e temas de mitologia, nada copiado de outro jogo.
import { rng, hex } from './gfx.js';
import { hsl, ramp, TIERS } from './gen.js';

export const MYTH_GENOMES = {};
export const MYTH_SPECIES = {};
export const MYTH_ORDER = [];

const TYPES10 = ['brasa', 'rio', 'mata', 'bruma', 'pedra', 'vento', 'luz', 'gelo', 'raio', 'comum'];
const pick = (r, a) => a[Math.floor(r() * a.length)];
const between = (r, [a, b]) => a + r() * (b - a);
const H3 = (a, b, c) => [hex(a), hex(b), hex(c)];

// paleta e partes típicas de cada tipo
const THEME = {
  brasa: { h: [0, 28], s: [78, 94], l: [48, 55], S: [40, 92, 70], A: [24, 30, 30], E: H3('#fff7c2', '#ffc83d', '#ff7a2a'),
    plans: ['fera', 'draco', 'ave', 'fera', 'serpe', 'colosso'], tail: ['chama', 'pincel', 'multi'], mane: ['chama', 'juba'], horns: ['duplos', 'nenhum', 'curvos'], head: 'chama' },
  rio: { h: [192, 222], s: [58, 82], l: [48, 57], S: [185, 45, 86], A: [12, 75, 66], E: H3('#eaffff', '#7ff0ff', '#30b8f0'),
    plans: ['aquatico', 'serpe', 'fera', 'aquatico', 'draco', 'ave'], tail: ['peixe', 'chicote', 'pincel'], mane: ['juba', 'nenhuma'], horns: ['unico', 'nenhum'], head: 'ondas' },
  mata: { h: [86, 138], s: [40, 62], l: [40, 50], S: [52, 58, 74], A: [28, 42, 38], E: H3('#f4ffd0', '#b8f55a', '#6cc93a'),
    plans: ['fera', 'inseto', 'colosso', 'fera', 'serpe', 'divino'], tail: ['folha', 'pincel', 'multi'], mane: ['folhas', 'juba'], horns: ['galhada', 'galhada', 'nenhum'], head: 'folhas' },
  bruma: { h: [252, 292], s: [38, 62], l: [40, 54], S: [300, 48, 80], A: [262, 28, 26], E: H3('#fff0ff', '#ff9cf0', '#c46cff'),
    plans: ['fera', 'divino', 'inseto', 'serpe', 'ave', 'fera'], tail: ['multi', 'multi', 'chama'], mane: ['juba', 'nenhuma'], horns: ['nenhum', 'unico'], head: 'veu' },
  pedra: { h: [20, 44], s: [12, 28], l: [44, 54], S: [30, 16, 70], A: [168, 45, 58], E: H3('#fff3d0', '#ffc870', '#e08a30'),
    plans: ['colosso', 'fera', 'draco', 'inseto', 'colosso', 'serpe'], tail: ['cristal', 'chicote', 'pincel'], mane: ['cristal', 'espinhos'], horns: ['curvos', 'cristal'], head: 'elmo' },
  vento: { h: [158, 198], s: [24, 48], l: [68, 76], S: [200, 20, 94], A: [40, 55, 66], E: H3('#ffffff', '#b6ffe6', '#5fe0bd'),
    plans: ['ave', 'serpe', 'ave', 'inseto', 'fera', 'divino'], tail: ['nuvem', 'multi', 'pincel'], mane: ['nuvem', 'juba'], horns: ['nenhum', 'galhada'], head: 'nuvem' },
  luz: { h: [38, 54], s: [70, 90], l: [60, 68], S: [45, 30, 94], A: [44, 88, 58], E: H3('#ffffff', '#fff2a8', '#ffcf4a'),
    plans: ['divino', 'ave', 'fera', 'inseto', 'divino', 'serpe'], tail: ['multi', 'pincel', 'chama'], mane: ['juba', 'chama'], horns: ['unico', 'galhada'], head: 'raios' },
  gelo: { h: [184, 206], s: [38, 62], l: [70, 78], S: [200, 25, 95], A: [195, 70, 80], E: H3('#ffffff', '#c8f6ff', '#6fd6ff'),
    plans: ['fera', 'ave', 'serpe', 'colosso', 'aquatico', 'fera'], tail: ['cristal', 'pincel', 'multi'], mane: ['cristal', 'nuvem'], horns: ['galhada', 'cristal'], head: 'cristal' },
  raio: { h: [208, 246], s: [45, 68], l: [46, 56], S: [50, 92, 66], A: [230, 25, 28], E: H3('#ffffff', '#fff36a', '#ffc21a'),
    plans: ['fera', 'ave', 'draco', 'serpe', 'fera', 'inseto'], tail: ['raio', 'raio', 'pincel'], mane: ['raio', 'espinhos'], horns: ['duplos', 'unico'], head: 'raio' },
  comum: { h: [16, 44], s: [20, 48], l: [50, 62], S: [38, 40, 86], A: [36, 25, 80], E: H3('#ffffff', '#ffe6c2', '#ffbf80'),
    plans: ['fera', 'ave', 'draco', 'fera', 'colosso', 'aquatico'], tail: ['pincel', 'chicote', 'multi'], mane: ['juba', 'nenhuma'], horns: ['curvos', 'nenhum', 'galhada'], head: 'coroa' },
};
const LEGEND_PLANS = {
  brasa: ['ave', 'draco', 'fera', 'divino', 'serpe', 'colosso'], rio: ['serpe', 'aquatico', 'divino', 'draco', 'fera', 'aquatico'],
  mata: ['fera', 'divino', 'serpe', 'colosso', 'inseto', 'fera'], bruma: ['divino', 'fera', 'serpe', 'ave', 'inseto', 'divino'],
  pedra: ['colosso', 'draco', 'fera', 'serpe', 'divino', 'colosso'], vento: ['ave', 'serpe', 'divino', 'ave', 'fera', 'inseto'],
  luz: ['divino', 'ave', 'fera', 'divino', 'serpe', 'inseto'], gelo: ['ave', 'fera', 'serpe', 'divino', 'colosso', 'aquatico'],
  raio: ['ave', 'fera', 'draco', 'serpe', 'divino', 'colosso'], comum: ['draco', 'divino', 'serpe', 'colosso', 'fera', 'ave'],
};
const PATTERNS = { normal: ['nenhum', 'nenhum', 'listras', 'manchas', 'runas', 'estrelas'], dark: ['veias', 'runas', 'estrelas', 'listras'] };

// nomes: raízes de bichos/elementos + sufixos por estágio; lendas têm raízes e sufixos próprios
const ROOTS = {
  brasa: ['Fornal', 'Tocheir', 'Carvoal', 'Fulgur', 'Abrasad', 'Rubrez', 'Escald', 'Chamej', 'Ardent', 'Fogach', 'Cinzar', 'Lavrad'],
  rio: ['Mareant', 'Aguap', 'Ondej', 'Salgad', 'Pororoc', 'Lagoar', 'Coralin', 'Espum', 'Afluent', 'Abissin', 'Rebojar', 'Naufrag'],
  mata: ['Cipoal', 'Ramagem', 'Silvestr', 'Bromél', 'Jatobar', 'Ipêz', 'Caniç', 'Folhagem', 'Matagal', 'Espinheir', 'Seivar', 'Juncal'],
  bruma: ['Sombrej', 'Lusco', 'Vulton', 'Noctil', 'Assombr', 'Sonâmb', 'Brumal', 'Penumbr', 'Fantasm', 'Ermit', 'Quimer', 'Agour'],
  pedra: ['Rochaz', 'Pedregul', 'Granital', 'Ferrug', 'Minér', 'Lajed', 'Seixal', 'Cascalheir', 'Bigorn', 'Escarp', 'Quartzon', 'Jazid'],
  vento: ['Ventani', 'Penach', 'Revoad', 'Gavian', 'Planad', 'Sopral', 'Ventoinh', 'Bruscar', 'Asador', 'Aerin', 'Altiv', 'Rodamoinh'],
  luz: ['Luzern', 'Clarin', 'Fulgent', 'Brilhant', 'Lampar', 'Ourel', 'Solei', 'Faiscal', 'Reluzent', 'Candeal', 'Dourad', 'Alvorej'],
  gelo: ['Geleir', 'Nevasc', 'Friorent', 'Gelíd', 'Pinguel', 'Granizal', 'Invernal', 'Regel', 'Floquet', 'Cristalin', 'Iglu', 'Tundr'],
  raio: ['Trovoad', 'Faiscant', 'Voltaic', 'Ribombar', 'Estalej', 'Raiant', 'Fulminar', 'Choquel', 'Trovisc', 'Elétric', 'Centelhar', 'Estrond'],
  comum: ['Valent', 'Ligeir', 'Matilh', 'Guerreir', 'Andarilh', 'Corajos', 'Bravur', 'Robust', 'Sagaz', 'Fiel', 'Vigil', 'Campeir'],
};
const SUF = [['ito', 'inho', 'ico', 'im', 'eco', 'ote', 'uco', 'ilho'], ['ar', 'eiro', 'udo', 'ano', 'ento', 'ivo', 'aço', 'eno'], ['ardo', 'astro', 'ório', 'arca', 'orte', 'uxo', 'ânio', 'ério']];
const SINGLE_SUF = ['ante', 'or', 'ira', 'al', 'ês', 'ena', 'oz', 'il'];
const LEGEND_ROOTS = {
  brasa: ['Solar', 'Ígne', 'Fornalh', 'Cratér', 'Rubr', 'Brasar'], rio: ['Abiss', 'Marém', 'Tormar', 'Correntez', 'Oceân', 'Profund'],
  mata: ['Silvã', 'Raizar', 'Bosqu', 'Primav', 'Verdej', 'Floresc'], bruma: ['Eclips', 'Nebul', 'Sonhar', 'Crepúsc', 'Umbral', 'Noctiv'],
  pedra: ['Titã', 'Monól', 'Cordilh', 'Gemar', 'Rochedr', 'Basal'], vento: ['Celest', 'Zéfir', 'Tufã', 'Ventan', 'Altur', 'Nimb'],
  luz: ['Aurór', 'Radiân', 'Zênit', 'Alvor', 'Lúmin', 'Fulgên'], gelo: ['Glaci', 'Boreal', 'Invern', 'Geleir', 'Cristal', 'Nevad'],
  raio: ['Trovej', 'Fulmin', 'Relamp', 'Tormen', 'Voltar', 'Estron'], comum: ['Primev', 'Etern', 'Origin', 'Cosm', 'Tempor', 'Ancestr'],
};
const LEGEND_SUF = ['ion', 'aris', 'oth', 'ael', 'andor', 'ix', 'ora', 'emus', 'arion', 'eth'];
// nomes de criaturas de outros jogos que nunca podem aparecer, mesmo por acaso
const BLOCK = new Set(['magmar', 'vulpix', 'raichu', 'arcanine', 'lucario', 'lugia', 'entei', 'raikou', 'suicune', 'celebi', 'latios', 'latias', 'kyogre', 'groudon', 'rayquaza', 'dialga', 'palkia', 'arceus', 'zekrom', 'reshiram', 'xerneas', 'yveltal', 'solgaleo', 'lunala', 'eevee', 'umbreon', 'espeon', 'gengar', 'dragonite', 'garchomp', 'tyranitar', 'salamence', 'metagross', 'gyarados', 'lapras', 'snorlax', 'charizard', 'moltres', 'zapdos', 'articuno', 'mewtwo', 'jirachi', 'darkrai', 'heatran', 'kyurem', 'zacian', 'koraidon', 'miraidon', 'torkoal', 'landorus', 'tornadus', 'thundurus']);

const PLAN_TXT = {
  fera: ['Corre pelas campinas mais rápido que o vento.', 'Marca o caminho com pegadas que brilham no escuro.', 'Vive em bando e protege os filhotes de todos.'],
  ave: ['Plana em círculos por horas sem bater as asas.', 'Seu canto anuncia quando o tempo vai mudar.', 'Faz o ninho no alto das árvores mais antigas.'],
  serpe: ['Desliza entre as nuvens baixas ao amanhecer.', 'Enrola-se nas pedras quentes para cochilar.', 'Seu corpo comprido ondula como um rio.'],
  draco: ['Guarda tesouros que só ele consegue enxergar.', 'Bate as asas e levanta poeira por toda a trilha.', 'Fica mais forte a cada estação que passa.'],
  divino: ['Aparece para quem se perde à noite e mostra o caminho.', 'Ninguém sabe de onde veio, só que sempre esteve aqui.', 'Sua presença acalma até os espíritos mais bravos.'],
  colosso: ['Dorme por anos e acorda coberto de musgo.', 'Cada passo seu faz o chão tremer de leve.', 'O núcleo no peito pulsa como um coração.'],
  aquatico: ['Canta no fundo dos lagos em noites sem vento.', 'Nada contra a correnteza só por diversão.', 'Salta da água para tocar a luz da lua.'],
  inseto: ['Suas asas espalham um pó que brilha no escuro.', 'Muda de cor conforme o humor.', 'Dança em volta das lamparinas da vila.'],
};
const TYPE_TXT = {
  brasa: 'Esquenta o ar ao redor quando se anima.', rio: 'Deixa uma trilha de orvalho por onde passa.', mata: 'Flores brotam onde ele descansa.',
  bruma: 'Some na névoa quando alguém chega perto.', pedra: 'É duro como as rochas da serra.', vento: 'Leve como uma pena, rápido como um sopro.',
  luz: 'Brilha mais forte quando está feliz.', gelo: 'Seu hálito vira neve no ar.', raio: 'Os pelos ficam em pé antes de um trovão.', comum: 'Leal e corajoso com quem cuida dele.',
};
const LEGEND_TXT = {
  brasa: ['Dizem que acendeu o primeiro amanhecer.', 'Dorme dentro de um vulcão adormecido.', 'Seu rugido aquece um inverno inteiro.'],
  rio: ['Guarda o fundo de todos os rios.', 'Quando chora, chove por sete dias.', 'Desenha as marés com a cauda.'],
  mata: ['Quando dorme, a floresta inteira silencia.', 'Fez brotar a primeira semente do mundo.', 'Conversa com árvores de mil anos.'],
  bruma: ['Tece os sonhos de quem dorme na vila.', 'Só aparece em noites de eclipse.', 'Guarda as memórias que as pessoas esquecem.'],
  pedra: ['Ergueu as montanhas com as próprias mãos.', 'É mais velho que qualquer pedra da trilha.', 'Seu coração é uma gema do tamanho de uma casa.'],
  vento: ['Carrega as estações de um lado para o outro.', 'Um bater de asas vira tempestade.', 'Mora acima das nuvens mais altas.'],
  luz: ['Seu brilho afasta qualquer pesadelo.', 'Nasceu do primeiro raio de sol.', 'Quem o vê ganha coragem por um ano inteiro.'],
  gelo: ['Pinta de branco o mundo inteiro no inverno.', 'Dorme dentro de uma geleira eterna.', 'Seu sopro congela cachoeiras.'],
  raio: ['Anuncia sua chegada com mil trovões.', 'Corre entre as nuvens mais rápido que a luz.', 'Acendeu a primeira fogueira com um raio.'],
  comum: ['Dizem que viu o mundo nascer.', 'Guarda o equilíbrio entre todos os espíritos.', 'Ninguém sabe sua idade, nem ele mesmo.'],
};

// golpes novos: um golpe ancestral por tipo (lendas e o último estágio das feras) + dois de efeito
export const MYTH_MOVES = {
  erupcao_solar: { name: 'Erupção Solar', type: 'brasa', power: 95, acc: 85 },
  diluvio: { name: 'Dilúvio', type: 'rio', power: 95, acc: 85 },
  floresta_viva: { name: 'Floresta Viva', type: 'mata', power: 85, acc: 90, drain: 0.35 },
  eclipse: { name: 'Eclipse', type: 'bruma', power: 95, acc: 85 },
  abalo_ancestral: { name: 'Abalo Ancestral', type: 'pedra', power: 95, acc: 85 },
  furacao_celeste: { name: 'Furacão Celeste', type: 'vento', power: 95, acc: 85 },
  coroa_solar: { name: 'Coroa Solar', type: 'luz', power: 95, acc: 85 },
  era_glacial: { name: 'Era Glacial', type: 'gelo', power: 95, acc: 85 },
  ira_trovao: { name: 'Ira do Trovão', type: 'raio', power: 100, acc: 80 },
  pulso_primordial: { name: 'Pulso Primordial', type: 'comum', power: 95, acc: 90 },
  aura_divina: { name: 'Aura Divina', type: 'luz', power: 0, acc: 100, effect: { target: 'self', stat: 'def', stages: 2 } },
  rugido_ancestral: { name: 'Rugido Ancestral', type: 'comum', power: 0, acc: 100, effect: { target: 'self', stat: 'atk', stages: 2 } },
};
const SIGNATURE = { brasa: 'erupcao_solar', rio: 'diluvio', mata: 'floresta_viva', bruma: 'eclipse', pedra: 'abalo_ancestral', vento: 'furacao_celeste', luz: 'coroa_solar', gelo: 'era_glacial', raio: 'ira_trovao', comum: 'pulso_primordial' };
const STATUS = ['olhar_fofo', 'casca_dura', 'veu_nevoa', 'po_brilhante', 'canto_noturno', 'brilho', 'rugido_ancestral'];

function cssHex(c) { const r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255; return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join(''); }

function makeGenome(r, type, plan, legend) {
  const th = THEME[type];
  // dragão de fogo é sempre cor de carvão com brasas acesas (nada de lagartinho laranja)
  const dark = (type === 'brasa' && plan === 'draco') || r() < (legend ? 0.32 : 0.22);
  const h = between(r, th.h), s = between(r, th.s), l = between(r, th.l);
  // divindade de luz: manto cor de marfim (o dourado fica para a máscara e os raios)
  const R = dark ? ramp(h, s * 0.45, 25) : plan === 'divino' && type === 'luz' ? ramp(48, 30, 86) : ramp(h, s, l);
  const S = dark ? ramp(h + 10, s * 0.5, 42) : ramp(th.S[0] + (r() * 20 - 10), th.S[1], th.S[2]);
  const A = legend ? ramp(44, 85, 56) : ramp(th.A[0] + (r() * 16 - 8), th.A[1], th.A[2]);
  const W = plan === 'inseto' ? ramp(h + (r() < 0.5 ? 40 : -40), Math.min(95, s + 10), Math.min(72, l + 8))
    : plan === 'draco' ? (dark ? ramp(h + 8, s * 0.7, 36) : ramp(h + 6, s * 0.65, Math.max(22, l - 16))) // membrana mais escura que o corpo
    : plan === 'ave' || plan === 'aquatico' ? ramp(h + 8, s, l + 6) : dark ? ramp(h, s * 0.6, 38) : ramp(h + 12, s * 0.8, Math.min(80, l + 14));
  return {
    plan, type, legend, dark, R, S, A, W, E: th.E, iris: dark ? th.E[0] : th.E[2], glowEye: dark || (legend && r() < 0.5),
    skin: plan === 'divino' ? (type === 'luz' && !dark ? ramp(42, 85, 60) : legend ? ramp(44, 70, 72) : dark ? ramp(h, 20, 70) : ramp(32, 45, 82)) : R,
    pattern: pick(r, dark ? PATTERNS.dark : PATTERNS.normal),
    tail: plan === 'draco' ? ({ pedra: 'cristal', gelo: 'cristal', raio: 'raio' }[type] || 'lanca') : pick(r, th.tail), tails: 2 + Math.floor(r() * 3), mane: pick(r, th.mane), horns: pick(r, th.horns),
    ears: type === 'rio' && r() < 0.5 ? 'barbatana' : pick(r, ['pontuda', 'pontuda', 'longa', 'redonda']),
    earK: 0.85 + r() * 0.4, legK: 0.85 + r() * 0.3, bodyK: 0.9 + r() * 0.2, snoutK: 0.75 + r() * 0.55,
    plume: pick(r, { brasa: ['longa', 'longa'], luz: ['leque', 'longa'], vento: ['tesoura', 'longa'], gelo: ['longa', 'leque'], raio: ['tesoura'], bruma: ['leque', 'curta'] }[type] || ['curta', 'tesoura', 'leque']),
    crest: pick(r, ['penacho', 'longo', 'coroa', 'nenhuma']), hook: r() < 0.55, beakK: 0.8 + r() * 0.5, fly: r() < (legend ? 0.7 : 0.35), mask: r() < 0.3,
    fin: pick(r, ['espinhos', 'barbatana']), fish: pick(r, ['baleia', 'carpa']),
    bug: type === 'pedra' || type === 'raio' ? pick(r, ['besouro', 'besouro', 'mariposa']) : pick(r, ['mariposa', 'borboleta', 'besouro']),
    head: th.head, pose: pick(r, ['aberto', 'orando']),
    seed: Math.floor(r() * 1e6),
  };
}

export function buildMyth(reserved = new Set()) {
  if (MYTH_ORDER.length) return;
  const used = new Set([...reserved].map(n => n.toLowerCase()));
  let n = 0;
  const nextId = () => 'm' + String(++n).padStart(3, '0');
  const nameFor = (r, roots, suffixes) => {
    for (let tries = 0; tries < 60; tries++) {
      const root = pick(r, roots), suf = pick(r, suffixes);
      const stem = /[aeiouáéíóúâêôãõ]$/i.test(root) && /^[aeiouáéíóúâêô]/i.test(suf) ? root.slice(0, -1) : root;
      const name = stem + suf;
      if (!used.has(name.toLowerCase()) && !BLOCK.has(name.toLowerCase())) { used.add(name.toLowerCase()); return name; }
    }
    const name = pick(r, roots) + suffixes[0] + (n % 10); used.add(name.toLowerCase()); return name;
  };
  const statsOf = (r, total) => {
    const w = { hp: 0.8 + r() * 0.5, atk: 0.8 + r() * 0.5, def: 0.8 + r() * 0.5, spd: 0.8 + r() * 0.5 };
    const sum = w.hp + w.atk + w.def + w.spd, b = {};
    for (const k of ['hp', 'atk', 'def', 'spd']) b[k] = Math.round(total * w[k] / sum);
    return b;
  };
  // --- feras: 40 linhas de 3, 45 linhas de 2 e 30 sem evolução = 240 ---
  const plan = [];
  for (let i = 0; i < 40; i++) plan.push(3);
  for (let i = 0; i < 45; i++) plan.push(2);
  for (let i = 0; i < 30; i++) plan.push(1);
  plan.forEach((stages, li) => {
    const r = rng(424242 + li * 6151);
    const type = TYPES10[(li + Math.floor(li / 40)) % 10];
    const th = THEME[type];
    const bodyPlan = th.plans[Math.floor(r() * th.plans.length)];
    const base = makeGenome(r, type, bodyPlan, false);
    const second = r() < 0.35 ? pick(r, TYPES10.filter(t => t !== type)) : null;
    const evoLv = [7 + Math.floor(r() * 4), 17 + Math.floor(r() * 6)];
    const learn = [[1, 'esbarrao'], [1, TIERS[type][0]], [4 + Math.floor(r() * 2), pick(r, STATUS)], [7 + Math.floor(r() * 2), TIERS[type][1]]];
    if (second) learn.push([9 + Math.floor(r() * 3), TIERS[second][0]]);
    learn.push([stages >= 2 ? evoLv[0] + 3 : 12, TIERS[type][2]]);
    if (stages === 3) learn.push([evoLv[1] + 4, SIGNATURE[type]]);
    learn.sort((a, b) => a[0] - b[0]);
    const roots = ROOTS[type];
    const root = [pick(r, roots)];
    const ids = [];
    for (let sIdx = 0; sIdx < stages; sIdx++) {
      const id = nextId();
      const stage = stages === 1 ? (r() < 0.5 ? 1 : 2) : stages === 2 ? sIdx + 1 : sIdx;
      const g = { ...base, stage, seed: base.seed + sIdx * 13 };
      if (stage === 1 && r() < 0.5) g.mane = 'nenhuma';
      if (stage === 1 && r() < 0.4) g.horns = 'nenhum';
      if (stage === 2 && g.horns === 'nenhum' && r() < 0.6) g.horns = pick(r, th.horns.filter(x => x !== 'nenhum')) || 'nenhum';
      if (stage === 2 && g.mane === 'nenhuma') g.mane = pick(r, th.mane.filter(x => x !== 'nenhuma')) || 'juba';
      if (stage === 2 && g.tail === 'multi') g.tails = Math.min(6, g.tails + 2);
      MYTH_GENOMES[id] = g;
      const stageMul = stages === 1 ? 1.32 : stages === 2 ? [1.1, 1.55][sIdx] : [1.05, 1.38, 1.72][sIdx];
      MYTH_SPECIES[id] = {
        name: nameFor(r, [root[0], ...roots], stages === 1 ? SINGLE_SUF : SUF[stages === 2 ? sIdx + 1 : sIdx]),
        type, base: statsOf(r, 200 * stageMul), xp: Math.round(19 * stageMul + (stages === 1 ? 6 : 0)),
        catch: stages === 1 ? 0.28 : stages === 2 ? [0.42, 0.22][sIdx] : [0.5, 0.3, 0.15][sIdx], learn,
        dex: `${pick(r, PLAN_TXT[bodyPlan])} ${TYPE_TXT[type]}`,
        glow: cssHex(g.dark ? g.E[1] : g.R[1]), float: ['divino', 'aquatico', 'serpe'].includes(bodyPlan) || (bodyPlan === 'ave' && g.fly && stage > 0) || (bodyPlan === 'inseto' && g.bug !== 'besouro' && stage > 0),
        stage: sIdx, myth: true, wild: sIdx === 0, rare: stages === 1,
      };
      ids.push(id); MYTH_ORDER.push(id);
    }
    for (let k = 0; k < ids.length - 1; k++) MYTH_SPECIES[ids[k]].evolve = { level: evoLv[k], to: ids[k + 1] };
  });
  // --- lendas: 6 por tipo = 60 ---
  TYPES10.forEach((type, ti) => {
    for (let j = 0; j < 6; j++) {
      const r = rng(777001 + ti * 104729 + j * 7907);
      const bodyPlan = LEGEND_PLANS[type][j];
      const g = makeGenome(r, type, bodyPlan, true);
      g.stage = 2;
      const roll = r();
      g.disk = roll < 0.35; g.halo = !g.disk && r() < 0.6; g.orbs = r() < 0.4; g.crown = r() < 0.3 && bodyPlan !== 'colosso'; g.gem = r() < 0.6;
      if (g.tail === 'multi') g.tails = 5 + Math.floor(r() * 2);
      if (g.mane === 'nenhuma') g.mane = THEME[type].mane[0];
      if (g.horns === 'nenhum') g.horns = THEME[type].horns.find(x => x !== 'nenhum') || 'unico';
      const id = nextId();
      MYTH_GENOMES[id] = g;
      const second = pick(r, TYPES10.filter(t => t !== type));
      MYTH_SPECIES[id] = {
        name: nameFor(r, LEGEND_ROOTS[type], LEGEND_SUF), type, base: statsOf(r, 200 * 2.15), xp: 70, catch: 0.07,
        learn: [[1, TIERS[type][0]], [1, TIERS[type][1]], [5, pick(r, ['aura_divina', 'rugido_ancestral', 'brilho', 'veu_nevoa'])], [9, TIERS[second][1]], [12, TIERS[type][2]], [18, SIGNATURE[type]]],
        dex: `${pick(r, LEGEND_TXT[type])} Um espírito lendário: raríssimo e muito forte.`,
        glow: cssHex(g.E[1]), float: bodyPlan !== 'fera' && bodyPlan !== 'colosso' && bodyPlan !== 'draco', stage: 0,
        myth: true, legend: true, wild: true, rare: true,
      };
      MYTH_ORDER.push(id);
    }
  });
}
void hsl;
