import { calcFu } from './fu';
import { interpretations, meldToGroup, type Group, type Interpretation } from './hand';
import { basePoints, payment } from './points';
import { countTiles, doraFromIndicator, isRed, tileId, type TileId } from './tiles';
import { DEFAULT_RULES, type CalcOutcome, type HandInput, type Rules, type ScoreResult } from './types';
import { findYaku, findYakuman, type YakuContext } from './yaku';

/** 入力に矛盾があればその内容を返す */
function validate(input: HandInput, meldGroups: Group[]): string | null {
  const melds = input.melds ?? [];
  const need = 14 - melds.length * 3;
  if (input.hand.length !== need) {
    return `手牌の枚数が合いません（鳴きが${melds.length}つなら${need}枚、いまは${input.hand.length}枚）`;
  }
  if (!input.hand.some((t) => tileId(t) === tileId(input.winTile))) return '和了牌が手牌に入っていません';

  const all = [...input.hand, ...melds.flatMap((m) => m.tiles)].map(tileId);
  if (countTiles(all).some((c) => c > 4)) return '同じ牌が5枚以上あります';

  const open = meldGroups.some((g) => g.open);
  const dealer = input.seatWind === 0;
  if ((input.riichi || input.doubleRiichi) && open) return '鳴いていると立直はできません';
  if (input.ippatsu && !(input.riichi || input.doubleRiichi)) return '一発は立直しているときだけです';
  if (input.haitei && !input.tsumo) return '海底摸月はツモのときだけです';
  if (input.houtei && input.tsumo) return '河底撈魚はロンのときだけです';
  if (input.rinshan && !input.tsumo) return '嶺上開花はツモのときだけです';
  if (input.rinshan && !meldGroups.some((g) => g.kind === 'kantsu')) return '嶺上開花は槓をしているときだけです';
  if (input.rinshan && input.haitei) return '嶺上開花と海底摸月は同時につきません';
  if (input.chankan && input.tsumo) return '槍槓はロンのときだけです';
  if (input.tenhou && !(dealer && input.tsumo && melds.length === 0)) return '天和は親が鳴かずにツモったときだけです';
  if (input.chiihou && !(!dealer && input.tsumo && melds.length === 0)) return '地和は子が鳴かずにツモったときだけです';
  return null;
}

function countDora(indicators: string[] | undefined, ids: TileId[]): number {
  return (indicators ?? []).reduce((sum, t) => {
    const dora = doraFromIndicator(tileId(t));
    return sum + ids.filter((id) => id === dora).length;
  }, 0);
}

function evaluate(ctx: YakuContext, dealer: boolean): ScoreResult | null {
  const { input, rules, interp } = ctx;
  const honba = input.honba ?? 0;

  const yakuman = findYakuman(ctx);
  if (yakuman.length > 0) {
    const times = yakuman.reduce((sum, y) => sum + y.times, 0);
    const base = 8000 * times;
    return {
      yaku: [],
      yakuman,
      dora: 0,
      akaDora: 0,
      uraDora: 0,
      han: 0,
      fu: 0,
      fuItems: [],
      wait: interp.wait,
      limit: 'yakuman',
      basePoints: base,
      payment: payment(base, dealer, input.tsumo, honba),
    };
  }

  const yaku = findYaku(ctx);
  if (yaku.length === 0) return null;

  const allCodes = [...input.hand, ...(input.melds ?? []).flatMap((m) => m.tiles)];
  const dora = countDora(input.dora, ctx.allIds);
  const akaDora = allCodes.filter(isRed).length;
  const uraDora = input.riichi || input.doubleRiichi ? countDora(input.uraDora, ctx.allIds) : 0;
  const han = yaku.reduce((sum, y) => sum + y.han, 0) + dora + akaDora + uraDora;

  const pinfu = yaku.some((y) => y.name === '平和');
  const { fu, items } = calcFu(interp, input, rules, ctx.menzen, pinfu);
  const { base, limit } = basePoints(han, fu, rules);

  return {
    yaku,
    yakuman: [],
    dora,
    akaDora,
    uraDora,
    han,
    fu,
    fuItems: items,
    wait: interp.wait,
    limit,
    basePoints: base,
    payment: payment(base, dealer, input.tsumo, honba),
  };
}

/** 高い方を選ぶ。点数 → 翻 → 符 の順に比べる */
function better(a: ScoreResult, b: ScoreResult): boolean {
  if (a.basePoints !== b.basePoints) return a.basePoints > b.basePoints;
  if (a.han !== b.han) return a.han > b.han;
  return a.fu > b.fu;
}

/** 和了した手の点数を計算する */
export function calculate(input: HandInput, rules: Rules = DEFAULT_RULES): CalcOutcome {
  let meldGroups: Group[];
  let handIds: TileId[];
  let winId: TileId;
  try {
    meldGroups = (input.melds ?? []).map(meldToGroup);
    handIds = input.hand.map(tileId);
    winId = tileId(input.winTile);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const error = validate(input, meldGroups);
  if (error) return { ok: false, error };

  const interps: Interpretation[] = interpretations(handIds, winId, meldGroups, input.tsumo);
  if (interps.length === 0) return { ok: false, error: '和了の形になっていません' };

  const allIds = [...handIds, ...(input.melds ?? []).flatMap((m) => m.tiles.map(tileId))];
  const dealer = input.seatWind === 0;
  let best: ScoreResult | null = null;
  for (const interp of interps) {
    const ctx: YakuContext = {
      input,
      rules,
      interp,
      allIds,
      handCounts: countTiles(handIds),
      winId,
      menzen: !meldGroups.some((g) => g.open),
      noMelds: meldGroups.length === 0,
    };
    const result = evaluate(ctx, dealer);
    if (result && (!best || better(result, best))) best = result;
  }

  if (!best) return { ok: false, error: '役がありません' };
  return { ok: true, result: best };
}
