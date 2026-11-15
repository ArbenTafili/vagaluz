// gen.js — gerador determinístico de espécies originais (genoma + dados).
// Mesma semente = mesmas criaturas em qualquer aparelho, então saves continuam válidos.
import { rng, rgba } from './gfx.js';

export function hsl(h, s, l, a = 255) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(100, s)) / 100; l = Math.max(0, Math.min(100, l)) / 100;
  const k = n => (n + h / 30) % 12, f = n => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return rgba(Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255), a);
}
// rampa de 4 tons com deslocamento de matiz (luz quente, sombra fria)
export function ramp(h, s, l) {
  return [hsl(h - 10, s - 10, l + 27), hsl(h - 5, s, l + 13), hsl(h, s, l), hsl(h + 10, s + 6, l - 15)];
}

const STYLE = {
  brasa: { h: [6, 38], s: [80, 96], l: [52, 60], head: ['flame', 'flame', 'tuft', 'horn1'], ears: ['flame', 'cat', 'horn', 'none'], tail: ['flame', 'flame', 'wisp'], acc: 30 },
  rio: { h: [188, 222], s: [62, 85], l: [52, 62], head: ['bubble', 'curl', 'none', 'shell'], ears: ['fin', 'round', 'none', 'fin'], tail: ['fin', 'fin', 'curl'], acc: 180 },
  mata: { h: [82, 140], s: [45, 70], l: [48, 58], head: ['sprout', 'flower', 'mushroom', 'leafcrown'], ears: ['leaf', 'long', 'round', 'leaf'], tail: ['leaf', 'fluffy', 'none'], acc: 330 },
  bruma: { h: [248, 292], s: [45, 70], l: [58, 68], head: ['moon', 'star', 'halo', 'none'], ears: ['cat', 'long', 'antenna', 'none'], tail: ['wisp', 'wisp', 'curl'], acc: 50 },
  pedra: { h: [22, 48], s: [12, 30], l: [52, 62], head: ['crystals', 'moss', 'horn1', 'none'], ears: ['horn', 'none', 'round', 'crystal'], tail: ['none', 'curl', 'fluffy'], acc: 168 },
  comum: { h: [18, 46], s: [30, 58], l: [58, 68], head: ['tuft', 'none', 'flower', 'tuft'], ears: ['cat', 'round', 'long', 'antenna'], tail: ['fluffy', 'curl', 'none', 'fluffy'], acc: 350 },
  vento: { h: [176, 206], s: [30, 55], l: [70, 78], head: ['swirl', 'tuft', 'none'], ears: ['wing', 'long', 'antenna'], tail: ['curl', 'wisp', 'fluffy'], acc: 40 },
  luz: { h: [40, 58], s: [80, 96], l: [62, 70], head: ['halo', 'star', 'flame'], ears: ['round', 'antenna', 'cat'], tail: ['wisp', 'fluffy', 'curl'], acc: 280 },
  gelo: { h: [184, 204], s: [40, 70], l: [72, 80], head: ['shards', 'crystals', 'none'], ears: ['crystal', 'cat', 'round'], tail: ['fluffy', 'curl', 'none'], acc: 220 },
  raio: { h: [46, 58], s: [88, 98], l: [55, 62], head: ['zigzag', 'horn1', 'tuft'], ears: ['zigzag', 'cat', 'antenna'], tail: ['bolt', 'bolt', 'curl'], acc: 265 },
};
const HEAD2 = {
  brasa: ['halo', 'horn1'], rio: ['shell', 'halo'], mata: ['flower', 'leafcrown'], bruma: ['halo', 'star'], pedra: ['crystals', 'horn1'],
  comum: ['tuft', 'flower'], vento: ['halo', 'swirl'], luz: ['halo', 'star'], gelo: ['shards', 'halo'], raio: ['horn1', 'zigzag'],
};
const TYPES10 = ['mata', 'rio', 'brasa', 'comum', 'bruma', 'pedra', 'vento', 'luz', 'gelo', 'raio'];
const SHAPES = ['round', 'round', 'oval', 'wide', 'drop', 'pear', 'ghost', 'cloud', 'blocky'];
const ARMS = ['none', 'nubs', 'nubs', 'wings', 'fins', 'leaf'];
const PATTERNS = ['none', 'belly', 'belly', 'spots', 'stripes', 'mask'];
const MOUTHS = ['smile', 'smile', 'cat', 'fang', 'o', 'smile'];

const ROOTS = {
  brasa: ['Fagu', 'Bras', 'Tiçã', 'Fumar', 'Ardi', 'Labar', 'Cinz', 'Fogar', 'Calor', 'Queim', 'Tisn', 'Rubr', 'Chamusc', 'Lenh'],
  rio: ['Marol', 'Pingu', 'Riach', 'Ondul', 'Brej', 'Lagu', 'Orvalh', 'Chuvisc', 'Cascat', 'Marej', 'Remans', 'Igarap', 'Correg', 'Bolhar'],
  mata: ['Folh', 'Ramal', 'Cipoz', 'Semen', 'Galh', 'Raizin', 'Capin', 'Broton', 'Samamb', 'Taquar', 'Musgu', 'Gravet', 'Jasmin', 'Trevin'],
  bruma: ['Névo', 'Sombr', 'Assomb', 'Luar', 'Sonhol', 'Mistér', 'Penumbr', 'Vult', 'Murmur', 'Calad', 'Ecor', 'Breu', 'Neblin', 'Lunar'],
  pedra: ['Seix', 'Rochel', 'Cascalh', 'Granit', 'Geod', 'Basalt', 'Arenit', 'Pedreg', 'Lajot', 'Calcár', 'Quartz', 'Ardós', 'Rolad', 'Penhasc'],
  comum: ['Fofur', 'Pulul', 'Bichan', 'Tiquin', 'Peluc', 'Cutuc', 'Bolot', 'Rabic', 'Pipoc', 'Fuxic', 'Xodó', 'Muxox', 'Belisc', 'Cafun'],
  vento: ['Ventur', 'Soprin', 'Brisol', 'Ciclon', 'Assobi', 'Rajad', 'Plumar', 'Nuvar', 'Pipar', 'Redemo', 'Ventan', 'Aragem', 'Sibil', 'Flutu'],
  luz: ['Lumin', 'Clarid', 'Brilh', 'Auror', 'Solar', 'Raiad', 'Estel', 'Fulgor', 'Lampej', 'Alvor', 'Candel', 'Reluz', 'Radi', 'Faról'],
  gelo: ['Gelad', 'Nevisc', 'Geadin', 'Friol', 'Granizz', 'Glacin', 'Flocar', 'Invern', 'Gelinh', 'Nevad', 'Cristel', 'Frígid', 'Polar', 'Orvalg'],
  raio: ['Trovej', 'Relamp', 'Chocal', 'Zapir', 'Centel', 'Tempest', 'Voltar', 'Estal', 'Fagulh', 'Ribomb', 'Clarão', 'Elétr', 'Faísq', 'Trovisc'],
};
const SUF = [
  ['im', 'ito', 'inho', 'ico', 'ela', 'ote', 'uca', 'eco', 'ilo', 'ixo', 'ino', 'ola'],
  ['ão', 'udo', 'eiro', 'ento', 'oso', 'ara', 'ume', 'al', 'aço', 'ura'],
  ['ardo', 'orum', 'ante', 'arca', 'oral', 'eon', 'ístico', 'oroso', 'aléu', 'íneo'],
];
const SINGLE_SUF = ['ix', 'or', 'ana', 'eu', 'ária', 'ion', 'ês', 'ulo'];

const FLAVOR = {
  brasa: ['Aquece as noites frias da trilha.', 'Solta faíscas quando fica animado.', 'Dorme perto de brasas que ainda estão quentes.'],
  rio: ['Vive nos remansos dos riachos.', 'Cantarola como água correndo entre as pedras.', 'Aparece onde o orvalho é mais denso.'],
  mata: ['Cresce um pouquinho a cada chuva.', 'Esconde-se entre as folhas e quase ninguém o vê.', 'Dizem que perfuma o caminho por onde passa.'],
  bruma: ['Só aparece quando a névoa sobe.', 'Sussurra segredos para quem dorme.', 'É feito do mesmo tecido dos sonhos.'],
  pedra: ['Fica parado por anos sem se cansar.', 'Guarda o calor do sol dentro do corpo.', 'Rola morro abaixo quando está feliz.'],
  comum: ['Adora companhia e cafuné.', 'Segue viajantes por pura curiosidade.', 'Faz barulhinhos engraçados quando come.'],
  vento: ['Viaja sem rumo levado pela brisa.', 'Assobia uma melodia que muda com o tempo.', 'Some quando o vento para de soprar.'],
  luz: ['Brilha mais forte ao amanhecer.', 'Guia quem se perde no escuro.', 'Seu brilho espanta pesadelos.'],
  gelo: ['Deixa um rastro de geada por onde passa.', 'Fica mais animado nos dias frios.', 'Guarda flocos de neve como tesouros.'],
  raio: ['Seus pelos se arrepiam antes das tempestades.', 'Corre tão rápido que deixa um estalo no ar.', 'Recarrega a energia durante os temporais.'],
};
const TRAIT = {
  flame: 'A chama na cabeça muda de cor com o humor.', bubble: 'Sopra bolhas para brincar.', curl: 'O cachinho na cabeça prevê a chuva.',
  shell: 'Carrega uma conchinha da sorte.', sprout: 'O broto na cabeça cresce quando está feliz.', flower: 'A flor na cabeça abre ao sol.',
  mushroom: 'O chapéu de cogumelo brilha no escuro.', leafcrown: 'Usa uma coroa de folhas que nunca murcha.', moon: 'A marca de lua acende nas noites claras.',
  star: 'Dizem que caiu do céu numa noite de estrelas.', halo: 'A auréola guarda um pedido antigo.', crystals: 'Os cristais nas costas cantam com o vento.',
  moss: 'O musgo nas costas abriga bichinhos minúsculos.', horn1: 'O chifre brilha quando sente perigo.', tuft: 'O topete fica em pé quando se assusta.',
  swirl: 'Gira em círculos para se refrescar.', shards: 'Os cristais de gelo nunca derretem.', zigzag: 'O raio na testa faísca de alegria.', none: 'É mais forte do que parece.',
};

export const TIERS = {
  brasa: ['faisca', 'chama_guia', 'fogo_fatuo'], rio: ['respingo', 'correnteza', 'mare_alta'], mata: ['folhada', 'raiz_laco', 'chuva_petalas'],
  bruma: ['sussurro', 'assombro', 'pesadelo'], pedra: ['pedrisco', 'chifrada', 'lasca_cristal'], comum: ['bicada', 'pancada', 'golpe_total'],
  vento: ['brisa', 'rajada', 'ciclone'], luz: ['clarao', 'raio_de_sol', 'aurora'], gelo: ['geada', 'estalactite', 'nevasca'], raio: ['centelha', 'relampago', 'tempestade'],
};
const STATUS = ['olhar_fofo', 'casca_dura', 'veu_nevoa', 'po_brilhante', 'canto_noturno', 'brilho'];

export const GENOMES = {};   // id -> genoma visual
export const GEN_SPECIES = {}; // id -> dados de espécie
export const GEN_ORDER = [];

const pick = (r, a) => a[Math.floor(r() * a.length)];
const between = (r, [a, b]) => a + r() * (b - a);

export function buildGenerated(reserved = new Set()) {
  if (GEN_ORDER.length) return;
  const used = new Set([...reserved].map(n => n.toLowerCase()));
  let n = 0;
  const plan = [];
  for (let i = 0; i < 40; i++) plan.push(3);
  for (let i = 0; i < 50; i++) plan.push(2);
  for (let i = 0; i < 62; i++) plan.push(1);
  plan.forEach((stages, li) => {
    const r = rng(9001 + li * 7919);
    const type = TYPES10[(li + Math.floor(li / 50)) % TYPES10.length];
    const st = STYLE[type];
    const second = r() < 0.35 ? pick(r, TYPES10.filter(t => t !== type)) : null;
    const h = between(r, st.h), s = between(r, st.s), l = between(r, st.l);
    const base = {
      type, h, s, l, ramp: ramp(h, s, l),
      acc: ramp(h + st.acc + (r() * 40 - 20), Math.min(95, s + 10), 58),
      belly: ramp(h - 15, s * 0.4, 86),
      shape: pick(r, SHAPES), ears: pick(r, st.ears), tail: pick(r, st.tail), head: pick(r, st.head),
      arms: pick(r, ARMS), pattern: pick(r, PATTERNS), mouth: pick(r, MOUTHS),
      feet: r() < 0.3 ? 'float' : r() < 0.25 ? 'four' : 'stubby',
      ew: 3 + Math.floor(r() * 3), eh: 4 + Math.floor(r() * 3), gap: 4 + Math.floor(r() * 5), slit: type === 'pedra' && r() < 0.4,
      blush: r() < 0.75, rx: 11 + r() * 2.5, ry: 9.5 + r() * 2.5, seed: Math.floor(r() * 1e6),
    };
    if (base.shape === 'ghost' || base.shape === 'cloud') base.feet = 'float';
    // nome da linha
    let root = pick(r, ROOTS[type]);
    const lineIds = [];
    const evoLv = [6 + Math.floor(r() * 4), 15 + Math.floor(r() * 5)];
    // golpes da linha
    const learn = [[1, 'esbarrao'], [1, TIERS[type][0]], [3 + Math.floor(r() * 2), pick(r, STATUS)], [6 + Math.floor(r() * 2), TIERS[type][1]]];
    if (second) learn.push([8 + Math.floor(r() * 3), TIERS[second][0]]);
    if (stages >= 2) learn.push([evoLv[0] + 2, TIERS[type][2]]);
    else if (stages === 1) learn.push([10, TIERS[type][2]]);
    learn.sort((a, b) => a[0] - b[0]);
    const statW = { hp: 0.8 + r() * 0.5, atk: 0.8 + r() * 0.5, def: 0.8 + r() * 0.5, spd: 0.8 + r() * 0.5 };
    const wsum = statW.hp + statW.atk + statW.def + statW.spd;
    for (let sIdx = 0; sIdx < stages; sIdx++) {
      n++;
      const id = 'g' + String(n).padStart(3, '0');
      let name = '';
      for (let tries = 0; tries < 30 && (!name || used.has(name.toLowerCase())); tries++) {
        const rr = tries ? pick(r, ROOTS[type]) : root;
        if (tries) root = rr;
        const stem = /[aeiouáéíóúâêôãõ]$/i.test(rr) ? rr.slice(0, -1) : rr;
        name = stem + (stages === 1 ? pick(r, SINGLE_SUF) : pick(r, SUF[sIdx]));
      }
      used.add(name.toLowerCase());
      const stageMul = stages === 1 ? 1.22 : [1, 1.3, 1.6][sIdx];
      const total = 200 * stageMul;
      const b = {};
      for (const k of ['hp', 'atk', 'def', 'spd']) b[k] = Math.round(total * statW[k] / wsum);
      if (sIdx === 1) {
        if (base.ears === 'none') base.ears = pick(r, st.ears.filter(e => e !== 'none'));
        if (base.tail === 'none') base.tail = pick(r, st.tail.filter(t => t !== 'none'));
        base.arms = { none: 'nubs', nubs: pick(r, ['wings', 'fins', 'leaf', 'nubs']) }[base.arms] || base.arms;
        if (base.pattern === 'none' || base.pattern === 'belly') base.pattern = pick(r, ['spots', 'stripes', 'mask', 'belly']);
        base.ramp = ramp(h + 6, s + 6, l - 3);
      }
      if (sIdx === 2) {
        base.head2 = pick(r, HEAD2[type].filter(x => x !== base.head));
        base.marks = true;
        base.ramp = ramp(h + 12, s + 10, l - 6);
        base.acc = ramp(h + st.acc, Math.min(98, s + 18), 60);
      }
      GENOMES[id] = { ...base, stage: stages === 1 ? 1 : sIdx, single: stages === 1, eyeBase: sIdx === 2 || (stages === 1 && r() < 0.5) ? 'determined' : 'open' };
      GEN_SPECIES[id] = {
        name, type, base: b, xp: Math.round(18 * stageMul + (stages === 1 ? 6 : 0)),
        catch: stages === 1 ? 0.3 : [0.55, 0.35, 0.2][sIdx], learn,
        dex: `${pick(r, FLAVOR[type])} ${TRAIT[base.head] || TRAIT.none}`,
        glow: cssHex(base.ramp[1]), float: base.feet === 'float', stage: sIdx, gen: true,
        wild: sIdx === 0, rare: stages === 1,
      };
      lineIds.push(id); GEN_ORDER.push(id);
    }
    for (let k = 0; k < lineIds.length - 1; k++) GEN_SPECIES[lineIds[k]].evolve = { level: evoLv[k], to: lineIds[k + 1] };
  });
}
function cssHex(c) { const r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255; return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join(''); }
