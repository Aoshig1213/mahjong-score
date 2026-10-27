import { describe, expect, it } from 'vitest';
import { payment } from '../engine/points';
import { DEFAULT_RULES, type ScoreResult } from '../engine/types';
import {
  applyHand,
  continueByDealer,
  endByDealer,
  newGame,
  ranking,
  roundLabel,
  seatWind,
  type Game,
  type GameSettings,
  type Round,
} from './game';

const SETTINGS: GameSettings = {
  players: ['A', 'B', 'C', 'D'],
  length: 'east',
  startPoints: 25000,
  returnPoints: 25000,
  uma: [10, 20],
  tobi: true,
  rules: DEFAULT_RULES,
};

/** 基本点から結果を作る（役の中身は精算に関係しない） */
function result(base: number, dealer: boolean, tsumo: boolean, honba = 0): ScoreResult {
  return {
    yaku: [],
    yakuman: [],
    dora: 0,
    akaDora: 0,
    uraDora: 0,
    han: 0,
    fu: 0,
    fuItems: [],
    wait: null,
    limit: null,
    basePoints: base,
    payment: payment(base, dealer, tsumo, honba),
  };
}

function gameAt(round: Partial<Round>, scores = [25000, 25000, 25000, 25000]): Game {
  return { ...newGame(SETTINGS), scores, round: { wind: 0, kyoku: 0, honba: 0, kyotaku: 0, ...round } };
}

describe('和了の精算', () => {
  it('子のロン。立直棒と供託は和了した人が取り、親が流れる', () => {
    const g = applyHand(gameAt({ kyotaku: 1 }), {
      kind: 'win',
      tsumo: false,
      loser: 2,
      winners: [{ player: 1, result: result(960, false, false) }], // 3900点
      riichi: [1],
    });
    expect(g.scores).toEqual([25000, 29900, 21100, 25000]);
    expect(g.round).toEqual({ wind: 0, kyoku: 1, honba: 0, kyotaku: 0 });
    expect(roundLabel(g.round)).toBe('東2局 0本場');
  });

  it('親の和了は連荘して1本場になる', () => {
    const g = applyHand(gameAt({}), {
      kind: 'win',
      tsumo: false,
      loser: 3,
      winners: [{ player: 0, result: result(2000, true, false) }],
      riichi: [],
    });
    expect(g.scores).toEqual([37000, 25000, 25000, 13000]);
    expect(g.round).toMatchObject({ kyoku: 0, honba: 1 });
  });

  it('子のツモ（1本場）', () => {
    const g = applyHand(gameAt({ honba: 1 }), {
      kind: 'win',
      tsumo: true,
      winners: [{ player: 2, result: result(640, false, true, 1) }], // 700・1300 + 本場
      riichi: [],
    });
    expect(g.scores).toEqual([25000 - 1400, 25000 - 800, 25000 + 3000, 25000 - 800]);
    expect(g.round).toMatchObject({ kyoku: 1, honba: 0 });
  });

  it('ダブロンは、本場と供託を放銃者に近い人だけが取る', () => {
    const g = applyHand(gameAt({ honba: 1, kyotaku: 2 }), {
      kind: 'win',
      tsumo: false,
      loser: 0,
      winners: [
        { player: 3, result: result(480, false, false) }, // 2000点
        { player: 2, result: result(1000, false, false, 1) }, // 4000点 + 300
      ],
      riichi: [],
    });
    expect(g.scores).toEqual([25000 - 2000 - 4300, 25000, 25000 + 4300 + 2000, 25000 + 2000]);
    // 親（0）は和了していないので流れる
    expect(g.round).toMatchObject({ kyoku: 1, honba: 0, kyotaku: 0 });
  });

  it('和了した人に親が入っていれば連荘', () => {
    const g = applyHand(gameAt({}), {
      kind: 'win',
      tsumo: false,
      loser: 1,
      winners: [
        { player: 2, result: result(480, false, false) },
        { player: 0, result: result(480, true, false) },
      ],
      riichi: [],
    });
    expect(g.round).toMatchObject({ kyoku: 0, honba: 1 });
  });

  it('責任払い（ツモ）は責任者が全部払う', () => {
    const g = applyHand(gameAt({}), {
      kind: 'win',
      tsumo: true,
      winners: [{ player: 1, result: result(8000, false, true), pao: 3 }],
      riichi: [],
    });
    expect(g.scores).toEqual([25000, 57000, 25000, -7000]);
  });

  it('責任払い（ロン）は放銃者と責任者で半分ずつ', () => {
    const g = applyHand(gameAt({}, [40000, 40000, 40000, 40000]), {
      kind: 'win',
      tsumo: false,
      loser: 2,
      winners: [{ player: 1, result: result(8000, false, false), pao: 3 }],
      riichi: [],
    });
    expect(g.scores).toEqual([40000, 72000, 24000, 24000]);
  });
});

describe('流局', () => {
  it('テンパイ料。親がテンパイなら連荘して本場が増える', () => {
    const g = applyHand(gameAt({}), { kind: 'draw', tenpai: [0, 2], nagashi: [], riichi: [2] });
    expect(g.scores).toEqual([26500, 23500, 25500, 23500]);
    expect(g.round).toEqual({ wind: 0, kyoku: 0, honba: 1, kyotaku: 1 });
  });

  it('親がノーテンなら流れるが、本場は増える', () => {
    const g = applyHand(gameAt({ honba: 1 }), { kind: 'draw', tenpai: [1], nagashi: [], riichi: [] });
    expect(g.scores).toEqual([24000, 28000, 24000, 24000]);
    expect(g.round).toMatchObject({ kyoku: 1, honba: 2 });
  });

  it('全員ノーテン・全員テンパイなら点数の移動はない', () => {
    expect(applyHand(gameAt({}), { kind: 'draw', tenpai: [], nagashi: [], riichi: [] }).scores).toEqual([25000, 25000, 25000, 25000]);
    expect(applyHand(gameAt({}), { kind: 'draw', tenpai: [0, 1, 2, 3], nagashi: [], riichi: [] }).scores).toEqual([
      25000, 25000, 25000, 25000,
    ]);
  });

  it('流し満貫は満貫のツモと同じ払い方で、テンパイ料はない', () => {
    const g = applyHand(gameAt({}), { kind: 'draw', tenpai: [1, 2], nagashi: [1], riichi: [] });
    expect(g.scores).toEqual([21000, 33000, 23000, 23000]);
  });

  it('途中流局は連荘して本場が増え、立直棒は供託に残る', () => {
    const g = applyHand(gameAt({ kyoku: 2 }), { kind: 'abort', reason: '四家立直', riichi: [0, 1, 2, 3] });
    expect(g.scores).toEqual([24000, 24000, 24000, 24000]);
    expect(g.round).toEqual({ wind: 0, kyoku: 2, honba: 1, kyotaku: 4 });
  });
});

describe('終局', () => {
  it('東風戦の東4局で子が和了すると終わる。残った供託はトップが取る', () => {
    const g = applyHand(gameAt({ kyoku: 3, kyotaku: 1 }), {
      kind: 'draw',
      tenpai: [1],
      nagashi: [],
      riichi: [],
    });
    expect(g.status).toBe('finished');
    expect(g.scores).toEqual([24000, 29000, 24000, 24000]);
  });

  it('オーラスで親がトップなら、終わるか続けるかを選べる', () => {
    const g = applyHand(gameAt({ kyoku: 3 }), {
      kind: 'win',
      tsumo: false,
      loser: 0,
      winners: [{ player: 3, result: result(480, true, false) }],
      riichi: [],
    });
    expect(g.status).toBe('dealerMayEnd');
    expect(endByDealer(g).status).toBe('finished');
    const cont = continueByDealer(g);
    expect(cont.status).toBe('playing');
    expect(cont.round).toMatchObject({ kyoku: 3, honba: 1 });
  });

  it('東南戦では東4局のあと南1局に進む', () => {
    const g = applyHand({ ...gameAt({ kyoku: 3 }), settings: { ...SETTINGS, length: 'south' } }, {
      kind: 'draw',
      tenpai: [],
      nagashi: [],
      riichi: [],
    });
    expect(g.status).toBe('playing');
    expect(roundLabel(g.round)).toBe('南1局 1本場');
  });

  it('0点未満の人が出たら飛びで終わる', () => {
    const g = applyHand(gameAt({}, [25000, 25000, 25000, 3000]), {
      kind: 'win',
      tsumo: false,
      loser: 3,
      winners: [{ player: 1, result: result(2000, false, false) }],
      riichi: [],
    });
    expect(g.status).toBe('finished');
  });

  it('順位とウマ（10-20、オカなし）。同点は起家に近い人が上', () => {
    const g = gameAt({}, [10000, 40000, 30000, 20000]);
    expect(ranking(g).map((r) => [r.player, r.rank, r.score])).toEqual([
      [1, 1, 35],
      [2, 2, 15],
      [3, 3, -15],
      [0, 4, -35],
    ]);
    expect(ranking(gameAt({})).map((r) => r.player)).toEqual([0, 1, 2, 3]);
  });

  it('自風は親から数える', () => {
    const round = { wind: 0, kyoku: 1, honba: 0, kyotaku: 0 } as const;
    expect([0, 1, 2, 3].map((p) => seatWind(p, round))).toEqual([3, 0, 1, 2]);
  });
});
