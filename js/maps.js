// maps.js — mapas originais em grade de caracteres.
// Legenda: . grama  , flores  w mato alto  = trilha  ~ água  b ponte
//          T árvore  P ipê-rosa  r pedra  B arbusto  F cerca  L lampião  S placa
//          H casa  D porta  A altar (2 tiles)  M Pedra Antiga

export const SOLID = new Set(['T', 'P', 'r', 'B', 'F', 'L', 'S', 'H', 'D', 'A', 'M', '~']);

export const MAPS = {
  vila: {
    name: 'Vila Orvalho', music: 'vila',
    rows: [
      'TTTTTTTTT==TTTTTTTTT',
      'TPT..L...==...L..TPT',
      'T,......S==.......,T',
      'T.HHHH...==...HHHH.T',
      'T.HHHH...==...HHHH.T',
      'T.HHHH..,==,..HHHH.T',
      'T.HDHH...==...HHDH.T',
      'T..=.....==.....=..T',
      'T..==============..T',
      'T......======......T',
      'T.,.L..=....=..L.,.T',
      'T......=.AA.=......T',
      'T......=....=......T',
      'T.B....======....B.T',
      'T,..........,.~~~~.T',
      'T.P..,.......~~~~~.T',
      'T..B....,.....~~~..T',
      'TTTTTTTTTTTTTTTTTTTT',
    ],
    warps: [
      { x: 9, y: 0, to: 'trilha', tx: 9, ty: 34, dir: 1 },
      { x: 10, y: 0, to: 'trilha', tx: 10, ty: 34, dir: 1 },
    ],
    npcs: [
      { id: 'cida', look: 'cida', x: 13, y: 11, dir: 2 },
      { id: 'tito', look: 'tito', x: 6, y: 15, dir: 0, wander: true },
    ],
    signs: {
      '8,2': ['Vila Orvalho — onde a névoa vem dormir.', '↑ Trilha da Bruma'],
    },
    doors: {
      '3,6': { kind: 'home' },
      '16,6': { kind: 'locked', text: ['Casa da Vó Cida.', 'Está trancada... ela deve estar no Santuário.'] },
    },
    houseStyles: [0, 1],
    start: { x: 3, y: 7, dir: 0 },
    healSpot: { x: 9, y: 12, dir: 1 },
  },
  trilha: {
    name: 'Trilha da Bruma', music: 'trilha',
    rows: [
      'TTTTTTTTTTTTTTTTTTTT',
      'TTTTT,,.....,,.TTTTT',
      'TTTP.,....,....,.PTT',
      'TTT.,..r.M..r..,.TTT',
      'TT..,....==....,..TT',
      'TT.B.....==.....B.TT',
      'TTT......==......TTT',
      'TTwwww...==...wwwwTT',
      'TTwwwww..==..wwwwwTT',
      'TTwwwww..==..wwwwwTT',
      'TT.www...==...wwwrTT',
      'TTT......====....TTT',
      'TT..r......==....TTT',
      'TTwww......==..wwTTT',
      'TTwwww.....==.wwwwTT',
      'TTwwww.....==.wwwwTT',
      'TT.ww......==..wwwTT',
      'TTT....=====....r.TT',
      'TT..,..==.........TT',
      'TTww...==....wwww.TT',
      'TTwww..==...wwwwwTTT',
      'TTwww..==...wwwww.TT',
      'TT.ww..====.......TT',
      'TT,......==...,..TTT',
      'TT..B....==....B..TT',
      '~~~~~~~~~bb~~~~~~~~~',
      '~~~~~~~~~bb~~~~~~~~~',
      'TT.,.....==.....,.TT',
      'TTwww....==...wwwwTT',
      'TTwwww...==...wwwwTT',
      'TTwwww...==..wwwwwTT',
      'TT.ww....==...www.TT',
      'TT.....S.==.....r.TT',
      'TTT,.....==.....,TTT',
      'TTTT.....==.....TTTT',
      'TTTTTTTTT==TTTTTTTTT',
    ],
    warps: [
      { x: 9, y: 35, to: 'vila', tx: 9, ty: 1, dir: 0 },
      { x: 10, y: 35, to: 'vila', tx: 10, ty: 1, dir: 0 },
    ],
    npcs: [
      { id: 'lia', look: 'lia', x: 12, y: 18, dir: 2 },
      { id: 'duda', look: 'duda', x: 6, y: 12, dir: 3 },
    ],
    signs: {
      '7,32': ['Trilha da Bruma', 'Cuidado: espíritos selvagens vivem no mato alto!'],
    },
    doors: {},
    zone: (x, y) => (y <= 16 ? 'norte' : 'sul'),
  },
};

export const DIALOG = {
  cida: {
    first: [
      'Ah, que espírito lindo! Então o ovo finalmente chocou.',
      'Cuide bem dele: um espírito feliz luta com mais coragem.',
      'Dizem que existem mais de trezentos tipos de espíritos por aí. Será que você encontra todos?',
      'No mato alto da Trilha da Bruma vivem espíritos selvagens. Enfraqueça um em batalha e amarre uma Fita-encanto para criar um laço.',
      'Tome, leve mais estas fitas.',
    ],
    after: [
      'Quando estiverem cansados, toquem o cristal do Santuário. Ele restaura as forças.',
    ],
    tips: [
      ['Chama vence folha. Água vence chama. Folha vence água e pedra.', 'Monte um grupo variado e nada vai te parar!'],
      ['À noite a névoa sobe, e os Brumitos saem para passear...'],
      ['Seu companheiro sente fome, sono e saudade, como todo mundo.', 'Quanto mais bem cuidado, mais forte ele fica nas batalhas.'],
    ],
  },
  tito: [
    ['Você viu? À noite aparecem uns espíritos com orelhinhas de gato!'],
    ['Meu sonho é ter um Pedrusco. Dizem que é raríssimo!'],
    ['Minha vó diz que a lagoa brilha quando a lua está cheia.'],
  ],
  lia: [
    ['Água apaga chama, chama queima folha, folha bebe água.', 'Gelo, Vento, Luz e Raio também têm seus truques. Monte um grupo variado!'],
    ['Lá no alto da trilha tem uma Pedra Antiga.', 'Dizem que ela guarda presentes para quem chega com o coração leve.'],
    ['Os espíritos do norte da trilha são mais fortes. Vá com calma!'],
  ],
  duda: [
    ['Respeito! Pode passar quando quiser.', 'Dica: espíritos de Pedra aguentam muito, mas sofrem contra Água e Mata.'],
    ['À noite aparecem espíritos que nunca vi de dia. Vale a pena explorar no escuro!'],
  ],
};

// valida larguras (útil durante o desenvolvimento)
export function validateMaps() {
  const errs = [];
  for (const [id, m] of Object.entries(MAPS)) {
    const w = m.rows[0].length;
    m.rows.forEach((r, y) => { if (r.length !== w) errs.push(`${id} linha ${y}: ${r.length} != ${w}`); });
  }
  return errs;
}
