import type { Limit, Payment, Rules } from './types';

export const LIMIT_NAMES: Record<Limit, string> = {
  mangan: '満貫',
  haneman: '跳満',
  baiman: '倍満',
  sanbaiman: '三倍満',
  kazoe: '数え役満',
  yakuman: '役満',
};

/** 翻と符から基本点を出す */
export function basePoints(han: number, fu: number, rules: Rules): { base: number; limit: Limit | null } {
  if (han >= 13 && rules.kazoeYakuman) return { base: 8000, limit: 'kazoe' };
  if (han >= 11) return { base: 6000, limit: 'sanbaiman' };
  if (han >= 8) return { base: 4000, limit: 'baiman' };
  if (han >= 6) return { base: 3000, limit: 'haneman' };
  if (han >= 5) return { base: 2000, limit: 'mangan' };
  const base = fu * 2 ** (han + 2);
  if (base >= 2000) return { base: 2000, limit: 'mangan' };
  if (rules.kiriageMangan && ((han === 4 && fu === 30) || (han === 3 && fu === 60))) {
    return { base: 2000, limit: 'mangan' };
  }
  return { base, limit: null };
}

const ceil100 = (n: number) => Math.ceil(n / 100) * 100;

/** 支払いを出す。本場は1本場300点（ツモなら1人100点ずつ） */
export function payment(base: number, dealer: boolean, tsumo: boolean, honba = 0): Payment {
  if (!tsumo) {
    const amount = ceil100(base * (dealer ? 6 : 4)) + honba * 300;
    return { kind: 'ron', amount, total: amount };
  }
  if (dealer) {
    const each = ceil100(base * 2) + honba * 100;
    return { kind: 'tsumo-dealer', each, total: each * 3 };
  }
  const fromDealer = ceil100(base * 2) + honba * 100;
  const fromNonDealer = ceil100(base) + honba * 100;
  return { kind: 'tsumo', dealer: fromDealer, nonDealer: fromNonDealer, total: fromDealer + fromNonDealer * 2 };
}
