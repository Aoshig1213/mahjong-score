import { describe, expect, it } from 'vitest';
import { payment } from '../engine/points';
import { DEFAULT_RULES, type ScoreResult } from '../engine/types';
import { applyHand, newGame, type Game } from '../game/game';
import { buildRecord, computeStats, mergeImport, monthOf, months, nameOf, parseImport, type GameRecord, type Member } from './records';

const members: Member[] = [
  { id: 'a', name: '自分' },
  { id: 'b', name: '田中' },
  { id: 'c', name: '佐藤' },
  { id: 'd', name: '鈴木' },
  { id: 'e', name: '高橋' },
];

function result(base: number, dealer: boolean, tsumo: boolean): ScoreResult {
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
    payment: payment(base, dealer, tsumo),
  };
}

function game(ids: string[]): Game {
  return newGame({
    players: ids.map((id) => members.find((m) => m.id === id)!.name),
    playerIds: ids,
    length: 'east',
    startPoints: 25000,
    returnPoints: 25000,
    uma: [10, 20],
    tobi: true,
    rules: DEFAULT_RULES,
  });
}

/** 1局目: 席1 が 席2 から 3900、2局目: 席0 が流局テンパイ */
function sampleRecord(ids: string[], date: string): GameRecord {
  let g = game(ids);
  g = applyHand(g, { kind: 'win', tsumo: false, loser: 2, winners: [{ player: 1, result: result(960, false, false) }], riichi: [] });
  g = applyHand(g, { kind: 'draw', tenpai: [0], nagashi: [], riichi: [] });
  return buildRecord(g, new Date(date));
}

describe('成績の集計', () => {
  const r1 = sampleRecord(['a', 'b', 'c', 'd'], '2026-10-27T12:00:00');
  const r2 = sampleRecord(['b', 'a', 'e', 'c'], '2026-11-03T12:00:00');

  it('1戦の順位とスコアを記録する', () => {
    // 席0(自分) 28000 / 席1(田中) 27900 / 席3(鈴木) 24000 / 席2(佐藤) 20100
    expect(r1.ranking.map((r) => [r.player, r.rank, r.score])).toEqual([
      [0, 1, 23],
      [1, 2, 12.9],
      [3, 3, -11],
      [2, 4, -24.9],
    ]);
  });

  it('人ごとに対局数・順位・スコア・和了率・放銃率を出す', () => {
    const stats = computeStats([r1, r2], members);
    const me = stats.find((s) => s.id === 'a')!;
    // r1 は席0で1位（+23）、r2 は席1で 3900 を和了して2位（+12.9）
    expect(me).toMatchObject({ name: '自分', games: 2, rankCounts: [1, 1, 0, 0], avgRank: 1.5, totalScore: 35.9 });
    expect(me).toMatchObject({ hands: 4, wins: 1, winRate: 0.25, avgWinPoints: 3900 });

    const sato = stats.find((s) => s.id === 'c')!;
    // r1 は席2で放銃して4位、r2 は席3で3位
    expect(sato).toMatchObject({ games: 2, dealIns: 1, dealInRate: 0.25, rankCounts: [0, 0, 1, 1], lastRate: 0.5 });

    expect(stats[0].totalScore).toBeGreaterThanOrEqual(stats[1].totalScore);
  });

  it('月で分ける', () => {
    expect(monthOf(r1)).toBe('2026-10');
    expect(months([r1, r2])).toEqual(['2026-11', '2026-10']);
  });

  it('消したメンバーは記録に残っている名前を使う', () => {
    expect(nameOf('e', members.slice(0, 4), [r2])).toBe('高橋');
  });
});

describe('書き出し・読み込み', () => {
  it('このアプリのファイルでなければ読み込まない', () => {
    expect(() => parseImport('{"foo":1}')).toThrow('このアプリで書き出したファイルではありません');
  });

  it('同じIDのものは足さない', () => {
    const r = sampleRecord(['a', 'b', 'c', 'd'], '2026-10-27T12:00:00');
    const merged = mergeImport(
      { members: members.slice(0, 2), games: [r] },
      { app: 'mahjong-score', version: 1, exportedAt: '', members, games: [r, { ...r, id: 'other' }] },
    );
    expect(merged.members.map((m) => m.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(merged.newGames.map((g) => g.id)).toEqual(['other']);
  });
});
