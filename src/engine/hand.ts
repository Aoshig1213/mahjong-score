import { countTiles, isYaochu, suitOf, tileId, type TileId } from './tiles';
import type { Meld, Wait } from './types';

export interface Group {
  kind: 'shuntsu' | 'koutsu' | 'kantsu';
  /** 順子なら一番小さい牌 */
  tile: TileId;
  /** 鳴いた面子、またはロンで完成した刻子 */
  open: boolean;
}

export type Interpretation =
  | { form: 'standard'; groups: Group[]; pair: TileId; wait: Wait }
  | { form: 'chiitoitsu'; pairs: TileId[]; wait: 'tanki' }
  | { form: 'kokushi'; wait: 'tanki' | 'kokushi13' };

/** 鳴いた面子を Group に直す。形がおかしければ例外 */
export function meldToGroup(meld: Meld): Group {
  const ids = meld.tiles.map(tileId).sort((a, b) => a - b);
  const same = ids.every((id) => id === ids[0]);
  switch (meld.type) {
    case 'chi':
      if (
        ids.length !== 3 ||
        ids[0] >= 27 ||
        suitOf(ids[0]) !== suitOf(ids[2]) ||
        ids[1] !== ids[0] + 1 ||
        ids[2] !== ids[0] + 2
      ) {
        throw new Error('チーの牌が続いた3枚になっていません');
      }
      return { kind: 'shuntsu', tile: ids[0], open: true };
    case 'pon':
      if (ids.length !== 3 || !same) throw new Error('ポンの牌が同じ3枚になっていません');
      return { kind: 'koutsu', tile: ids[0], open: true };
    case 'minkan':
    case 'ankan':
      if (ids.length !== 4 || !same) throw new Error('槓の牌が同じ4枚になっていません');
      return { kind: 'kantsu', tile: ids[0], open: meld.type === 'minkan' };
  }
}

type RawGroup = { kind: 'shuntsu' | 'koutsu'; tile: TileId };

/** 牌の数から、面子だけに分ける分け方を全部出す */
function splitIntoSets(counts: number[], from: number, acc: RawGroup[], out: RawGroup[][]): void {
  let i = from;
  while (i < 34 && counts[i] === 0) i++;
  if (i === 34) {
    out.push([...acc]);
    return;
  }
  if (counts[i] >= 3) {
    counts[i] -= 3;
    acc.push({ kind: 'koutsu', tile: i });
    splitIntoSets(counts, i, acc, out);
    acc.pop();
    counts[i] += 3;
  }
  if (i < 27 && i % 9 <= 6 && counts[i + 1] > 0 && counts[i + 2] > 0) {
    counts[i]--;
    counts[i + 1]--;
    counts[i + 2]--;
    acc.push({ kind: 'shuntsu', tile: i });
    splitIntoSets(counts, i, acc, out);
    acc.pop();
    counts[i]++;
    counts[i + 1]++;
    counts[i + 2]++;
  }
}

function waitOfShuntsu(start: TileId, win: TileId): Wait {
  const pos = win - start;
  if (pos === 1) return 'kanchan';
  if (pos === 0 && start % 9 === 6) return 'penchan'; // 89 で 7 待ち
  if (pos === 2 && start % 9 === 0) return 'penchan'; // 12 で 3 待ち
  return 'ryanmen';
}

/**
 * 和了の形として考えられる解釈を全部出す。
 * 同じ手でも「どの面子で和了ったか」で符や役が変わるので、待ちの違いも別の解釈として出す。
 */
export function interpretations(
  handIds: TileId[],
  winId: TileId,
  meldGroups: Group[],
  tsumo: boolean,
): Interpretation[] {
  const counts = countTiles(handIds);
  const result: Interpretation[] = [];

  if (meldGroups.length === 0 && handIds.length === 14) {
    const yaochu = counts.flatMap((c, id) => (isYaochu(id) ? [c] : []));
    const others = counts.filter((c, id) => !isYaochu(id) && c > 0);
    if (others.length === 0 && yaochu.every((c) => c >= 1)) {
      result.push({ form: 'kokushi', wait: counts[winId] === 2 ? 'kokushi13' : 'tanki' });
    }
    const pairs = counts.flatMap((c, id) => (c === 2 ? [id] : []));
    if (pairs.length === 7) {
      result.push({ form: 'chiitoitsu', pairs, wait: 'tanki' });
    }
  }

  for (let pair = 0; pair < 34; pair++) {
    if (counts[pair] < 2) continue;
    counts[pair] -= 2;
    const splits: RawGroup[][] = [];
    splitIntoSets(counts, 0, [], splits);
    counts[pair] += 2;

    for (const sets of splits) {
      const seen = new Set<string>();
      const add = (groups: Group[], wait: Wait) => {
        const key = `${wait}|${groups.map((g) => `${g.kind}${g.tile}${g.open}`).join(',')}`;
        if (seen.has(key)) return;
        seen.add(key);
        result.push({ form: 'standard', groups: [...groups, ...meldGroups], pair, wait });
      };
      const closed = sets.map((s): Group => ({ ...s, open: false }));

      if (pair === winId) add(closed, 'tanki');
      closed.forEach((g, i) => {
        if (g.kind === 'koutsu' && g.tile === winId) {
          // ロンで完成した刻子は明刻になる
          const groups = closed.map((x, j) => (j === i ? { ...x, open: !tsumo } : x));
          add(groups, 'shanpon');
        }
        if (g.kind === 'shuntsu' && winId >= g.tile && winId <= g.tile + 2) {
          add(closed, waitOfShuntsu(g.tile, winId));
        }
      });
    }
  }
  return result;
}
