// test3d asset kit, exposed to films as K.kit. Real-world scale in metres; everything is procedural (no downloaded assets).
import { board, SQ } from './board.js';
import { king, pawn, goldMaterial, tilt, topple } from './pieces.js';
import { makeRice } from './rice.js';
import { coins, coinMaterial, chips, card } from './props.js';
import { numberTag } from './tag.js';
import { cup, cups, cupMaterial, liftCup, paper, paperStack } from './table-props.js';
import { stage } from './stage.js';

export function makeKit(K) {
  return {
    SQ,
    board: (opts) => board(K, opts),
    king: (opts) => king(K, opts),
    pawn: (opts) => pawn(K, opts),
    goldMaterial: (opts) => goldMaterial(K, opts),
    tilt, topple,
    rice: makeRice(K),
    coins: (n, opts) => coins(K, n, opts),
    coinMaterial: (opts) => coinMaterial(K, opts),
    chips: (n, opts) => chips(K, n, opts),
    card: (opts) => card(K, opts),
    cup: (opts) => cup(K, opts),
    cups: (n, opts) => cups(K, n, opts),
    cupMaterial: (opts) => cupMaterial(K, opts),
    liftCup,
    paper: (opts) => paper(K, opts),
    paperStack: (opts) => paperStack(K, opts),
    numberTag: (text, opts) => numberTag(K, text, opts),
    stage: (opts) => stage(K, opts),
  };
}
