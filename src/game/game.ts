// 対局の進行と持ち点の精算。画面からは切り離してある。
// プレイヤーは 0〜3 の番号で、0 が起家（東1局の親）。席順もこの番号の順。

import { payment as calcPayment } from '../engine/points';
import { WIND_NAMES } from '../engine/tiles';
import type { Rules, ScoreResult, Wind } from '../engine/types';

export interface GameSettings {
  /** 起家から席順に4人 */
  players: string[];
  length: 'east' | 'south';
  startPoints: number;
  returnPoints: number;
  /** 10-20 なら [10, 20] */
  uma: [number, number];
  /** 0点未満で終了する */
  tobi: boolean;
  rules: Rules;
}

export interface Round {
  /** 0=東場 1=南場 */
  wind: Wind;
  /** 0〜3。東1局なら 0。その局の親のプレイヤー番号と同じ */
  kyoku: number;
  honba: number;
  /** 場に出ている立直棒の本数 */
  kyotaku: number;
}

export interface WinEntry {
  player: number;
  /** 本場は、本場を受け取る人（ロンなら放銃者に一番近い人）だけ含めて計算しておく */
  result: ScoreResult;
  /** 責任払い（パオ）の人 */
  pao?: number;
}

export type HandEvent =
  | { kind: 'win'; tsumo: boolean; loser?: number; winners: WinEntry[]; riichi: number[] }
  | { kind: 'draw'; tenpai: number[]; nagashi: number[]; riichi: number[] }
  | { kind: 'abort'; reason: string; riichi: number[] };

export interface HandRecord {
  round: Round;
  event: HandEvent;
  /** 立直棒と供託の受け渡しも含めた、点数の増減 */
  deltas: number[];
  scoresAfter: number[];
}

export type GameStatus = 'playing' | 'dealerMayEnd' | 'finished';

export interface Game {
  settings: GameSettings;
  scores: number[];
  round: Round;
  records: HandRecord[];
  status: GameStatus;
}

export const ABORT_REASONS = ['九種九牌', '四風連打', '四家立直', '四開槓'] as const;

export function newGame(settings: GameSettings): Game {
  return {
    settings,
    scores: settings.players.map(() => settings.startPoints),
    round: { wind: 0, kyoku: 0, honba: 0, kyotaku: 0 },
    records: [],
    status: 'playing',
  };
}

export function seatWind(player: number, round: Round): Wind {
  return ((player - round.kyoku + 4) % 4) as Wind;
}

export function roundLabel(round: Round): string {
  return `${WIND_NAMES[round.wind]}${round.kyoku + 1}局 ${round.honba}本場`;
}

/** ロンの和了者を、放銃者から見て近い順（下家・対面・上家の順）に並べる */
export function byNearness(loser: number, players: number[]): number[] {
  return [...players].sort((a, b) => ((a - loser + 4) % 4) - ((b - loser + 4) % 4));
}

/** 本場と供託を受け取る人 */
export function bonusTaker(event: Extract<HandEvent, { kind: 'win' }>): number {
  if (event.tsumo || event.loser === undefined) return event.winners[0].player;
  return byNearness(event.loser, event.winners.map((w) => w.player))[0];
}

function isLastHand(game: Game): boolean {
  const lastWind = game.settings.length === 'east' ? 0 : 1;
  return game.round.wind === lastWind && game.round.kyoku === 3;
}

/** その局の点数の増減と、親が続けるかどうか */
export function settle(game: Game, event: HandEvent): { deltas: number[]; dealerStays: boolean; kyotakuAfter: number } {
  const { round } = game;
  const dealer = round.kyoku;
  const deltas = [0, 0, 0, 0];
  for (const p of event.riichi) deltas[p] -= 1000;
  const sticks = round.kyotaku + event.riichi.length;

  if (event.kind === 'win') {
    const taker = bonusTaker(event);
    for (const { player, result, pao } of event.winners) {
      const p = result.payment;
      if (p.kind === 'ron') {
        const loser = event.loser!;
        if (pao !== undefined && pao !== loser) {
          // 責任払い（ロン）: 放銃者と責任者で半分ずつ。本場は責任者が払う
          const honbaPart = player === taker ? round.honba * 300 : 0;
          const half = Math.ceil((p.amount - honbaPart) / 200) * 100;
          deltas[loser] -= p.amount - honbaPart - half;
          deltas[pao] -= half + honbaPart;
        } else {
          deltas[loser] -= p.amount;
        }
      } else if (pao !== undefined) {
        // 責任払い（ツモ）: 責任者が全部払う
        deltas[pao] -= p.total;
      } else {
        for (let q = 0; q < 4; q++) {
          if (q === player) continue;
          deltas[q] -= p.kind === 'tsumo-dealer' ? p.each : q === dealer ? p.dealer : p.nonDealer;
        }
      }
      deltas[player] += p.total;
    }
    deltas[taker] += sticks * 1000;
    return { deltas, dealerStays: event.winners.some((w) => w.player === dealer), kyotakuAfter: 0 };
  }

  if (event.kind === 'draw') {
    if (event.nagashi.length > 0) {
      // 流し満貫は満貫のツモと同じ払い方。本場は付けない。テンパイ料はなし
      for (const n of event.nagashi) {
        const p = calcPayment(2000, n === dealer, true, 0);
        for (let q = 0; q < 4; q++) {
          if (q === n) continue;
          deltas[q] -= p.kind === 'tsumo-dealer' ? p.each : p.kind === 'tsumo' ? (q === dealer ? p.dealer : p.nonDealer) : 0;
        }
        deltas[n] += p.total;
      }
    } else if (event.tenpai.length > 0 && event.tenpai.length < 4) {
      const n = event.tenpai.length;
      for (let q = 0; q < 4; q++) {
        deltas[q] += event.tenpai.includes(q) ? 3000 / n : -3000 / (4 - n);
      }
    }
    return { deltas, dealerStays: event.tenpai.includes(dealer), kyotakuAfter: sticks };
  }

  return { deltas, dealerStays: true, kyotakuAfter: sticks };
}

/** 順位。同点なら起家に近い人が上 */
export function ranking(game: Game): { player: number; rank: number; points: number; score: number }[] {
  const { settings, scores } = game;
  const order = scores.map((points, player) => ({ player, points })).sort((a, b) => b.points - a.points || a.player - b.player);
  const [small, big] = settings.uma;
  const uma = [big, small, -small, -big];
  const oka = ((settings.returnPoints - settings.startPoints) * 4) / 1000;
  return order.map(({ player, points }, i) => ({
    player,
    rank: i + 1,
    points,
    score: Math.round(((points - settings.returnPoints) / 1000 + uma[i] + (i === 0 ? oka : 0)) * 10) / 10,
  }));
}

function finish(game: Game): Game {
  const scores = [...game.scores];
  if (game.round.kyotaku > 0) {
    // 残った供託はトップが取る
    const top = ranking(game)[0].player;
    scores[top] += game.round.kyotaku * 1000;
  }
  return { ...game, scores, round: { ...game.round, kyotaku: 0 }, status: 'finished' };
}

/** 局の結果を反映して、次の局に進める */
export function applyHand(game: Game, event: HandEvent): Game {
  const { deltas, dealerStays, kyotakuAfter } = settle(game, event);
  const scores = game.scores.map((s, i) => s + deltas[i]);
  const record: HandRecord = { round: game.round, event, deltas, scoresAfter: scores };
  const r = game.round;

  let round: Round;
  if (dealerStays) {
    round = { ...r, honba: r.honba + 1, kyotaku: kyotakuAfter };
  } else {
    const nextKyoku = (r.kyoku + 1) % 4;
    round = {
      wind: (nextKyoku === 0 ? r.wind + 1 : r.wind) as Wind,
      kyoku: nextKyoku,
      honba: event.kind === 'win' ? 0 : r.honba + 1,
      kyotaku: kyotakuAfter,
    };
  }

  const next: Game = { ...game, scores, round, records: [...game.records, record] };
  if (game.settings.tobi && scores.some((s) => s < 0)) return finish(next);
  if (isLastHand(game)) {
    if (!dealerStays) return finish(next);
    // オーラスの和了止め・テンパイ止め: 親がトップなら、終わるかどうかを選べる
    if (event.kind !== 'abort' && ranking(next)[0].player === r.kyoku) return { ...next, status: 'dealerMayEnd' };
  }
  return next;
}

/** オーラスで親が終わることを選んだ */
export function endByDealer(game: Game): Game {
  return finish(game);
}

/** オーラスで親が続けることを選んだ */
export function continueByDealer(game: Game): Game {
  return { ...game, status: 'playing' };
}
