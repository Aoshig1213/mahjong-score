import type { Interpretation } from './hand';
import { isDragon, isYaochu, tileName } from './tiles';
import type { FuItem, HandInput, Rules } from './types';

const WAIT_NAMES = { kanchan: '嵌張待ち', penchan: '辺張待ち', tanki: '単騎待ち' } as const;

/** 符を計算する。fu は10符単位に切り上げた後の値 */
export function calcFu(
  interp: Interpretation,
  input: HandInput,
  rules: Rules,
  menzen: boolean,
  pinfu: boolean,
): { fu: number; items: FuItem[] } {
  if (interp.form === 'chiitoitsu') return { fu: 25, items: [{ label: '七対子', fu: 25 }] };
  if (interp.form !== 'standard') return { fu: 0, items: [] };

  const items: FuItem[] = [{ label: '副底', fu: 20 }];
  if (pinfu) {
    if (!input.tsumo) items.push({ label: '門前ロン', fu: 10 });
    return { fu: input.tsumo ? 20 : 30, items };
  }

  if (menzen && !input.tsumo) items.push({ label: '門前ロン', fu: 10 });
  if (input.tsumo) items.push({ label: 'ツモ', fu: 2 });

  for (const g of interp.groups) {
    if (g.kind === 'shuntsu') continue;
    let fu = g.kind === 'kantsu' ? 8 : 2;
    if (isYaochu(g.tile)) fu *= 2;
    if (!g.open) fu *= 2;
    const kind = g.kind === 'kantsu' ? (g.open ? '明槓' : '暗槓') : g.open ? '明刻' : '暗刻';
    items.push({ label: `${kind}（${tileName(g.tile)}）`, fu });
  }

  const pair = interp.pair;
  const isRound = pair === 27 + input.roundWind;
  const isSeat = pair === 27 + input.seatWind;
  let pairFu = 0;
  if (isDragon(pair)) pairFu = 2;
  else if (isRound && isSeat) pairFu = rules.doubleWindPairFu;
  else if (isRound || isSeat) pairFu = 2;
  if (pairFu > 0) items.push({ label: `雀頭（${tileName(pair)}）`, fu: pairFu });

  const wait = interp.wait;
  if (wait === 'kanchan' || wait === 'penchan' || wait === 'tanki') {
    items.push({ label: WAIT_NAMES[wait], fu: 2 });
  }

  const raw = items.reduce((sum, i) => sum + i.fu, 0);
  // 鳴いた平和の形（符が付かない）は30符にする
  const fu = raw === 20 ? 30 : Math.ceil(raw / 10) * 10;
  return { fu, items };
}
