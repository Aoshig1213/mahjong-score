import type { Group, Interpretation } from './hand';
import {
  DRAGON_NAMES,
  WIND_NAMES,
  isDragon,
  isHonor,
  isTerminal,
  isWind,
  isYaochu,
  suitOf,
  type TileId,
} from './tiles';
import type { HandInput, Rules, Yaku, Yakuman } from './types';

export interface YakuContext {
  input: HandInput;
  rules: Rules;
  interp: Interpretation;
  /** 鳴いた牌も含む全部の牌（槓は4枚） */
  allIds: TileId[];
  /** 鳴いていない牌の数 */
  handCounts: number[];
  winId: TileId;
  /** 鳴いていない（暗槓は門前のまま） */
  menzen: boolean;
  /** 暗槓も含めて鳴きが1つもない */
  noMelds: boolean;
}

const GREEN = new Set<TileId>([19, 20, 21, 23, 25, 32]); // 2・3・4・6・8索と發

const isSet = (g: Group) => g.kind !== 'shuntsu';
const groupHasYaochu = (g: Group) =>
  g.kind === 'shuntsu' ? g.tile % 9 === 0 || g.tile % 9 === 6 : isYaochu(g.tile);

/** 1色だけか（字牌は別に見る）。0=萬子 1=筒子 2=索子、2色以上なら -1、字牌だけなら 3 */
function singleSuit(ids: TileId[]): number {
  const suits = new Set(ids.filter((id) => !isHonor(id)).map(suitOf));
  if (suits.size === 0) return 3;
  return suits.size === 1 ? [...suits][0] : -1;
}

export function findYakuman(ctx: YakuContext): Yakuman[] {
  const { input, interp, allIds, rules } = ctx;
  const list: Yakuman[] = [];
  const add = (name: string, times = 1) => list.push({ name, times: rules.doubleYakuman ? times : 1 });

  if (input.tenhou) add('天和');
  if (input.chiihou) add('地和');

  if (interp.form === 'kokushi') {
    if (interp.wait === 'kokushi13') add('国士無双十三面', 2);
    else add('国士無双');
  }
  if (allIds.every(isHonor)) add('字一色');

  if (interp.form === 'standard') {
    const { groups, pair } = interp;
    const sets = groups.filter(isSet);
    const concealedSets = sets.filter((g) => !g.open);

    if (concealedSets.length === 4) {
      if (interp.wait === 'tanki') add('四暗刻単騎', 2);
      else add('四暗刻');
    }
    if (sets.filter((g) => isDragon(g.tile)).length === 3) add('大三元');
    if (allIds.every((id) => GREEN.has(id))) add('緑一色');
    if (allIds.every(isTerminal)) add('清老頭');
    if (groups.filter((g) => g.kind === 'kantsu').length === 4) add('四槓子');

    const windSets = sets.filter((g) => isWind(g.tile)).length;
    if (windSets === 4) add('大四喜', 2);
    else if (windSets === 3 && isWind(pair)) add('小四喜');

    if (ctx.noMelds) {
      const suit = singleSuit(allIds);
      if (suit >= 0 && suit <= 2) {
        const c = ctx.handCounts.slice(suit * 9, suit * 9 + 9);
        const base = [3, 1, 1, 1, 1, 1, 1, 1, 3];
        if (c.every((n, i) => n >= base[i])) {
          const before = [...c];
          before[ctx.winId - suit * 9]--;
          if (before.every((n, i) => n === base[i])) add('純正九蓮宝燈', 2);
          else add('九蓮宝燈');
        }
      }
    }
  }

  if (!rules.doubleYakuman && list.length > 1) return [list[0]];
  return list;
}

export function findYaku(ctx: YakuContext): Yaku[] {
  const { input, rules, interp, allIds, menzen } = ctx;
  const list: Yaku[] = [];
  const add = (name: string, han: number) => list.push({ name, han });
  /** 鳴くと1翻下がる役 */
  const addKui = (name: string, han: number) => add(name, menzen ? han : han - 1);

  if (input.doubleRiichi) add('ダブル立直', 2);
  else if (input.riichi) add('立直', 1);
  if (input.ippatsu) add('一発', 1);
  if (menzen && input.tsumo) add('門前清自摸和', 1);
  if (input.haitei) add('海底摸月', 1);
  if (input.houtei) add('河底撈魚', 1);
  if (input.rinshan) add('嶺上開花', 1);
  if (input.chankan) add('槍槓', 1);

  if (allIds.every((id) => !isYaochu(id)) && (menzen || rules.kuitan)) add('断幺九', 1);

  const suit = singleSuit(allIds);
  const hasHonor = allIds.some(isHonor);
  if (suit >= 0 && suit <= 2) {
    if (hasHonor) addKui('混一色', 3);
    else addKui('清一色', 6);
  }
  // 字牌だけ・老頭牌だけの手は役満で先に判定済み。ここに来るのは字牌と老頭牌が混ざった手
  if (allIds.every(isYaochu) && hasHonor && allIds.some(isTerminal)) add('混老頭', 2);

  if (interp.form === 'chiitoitsu') {
    add('七対子', 2);
    return list;
  }
  if (interp.form !== 'standard') return list;

  const { groups, pair, wait } = interp;
  const sets = groups.filter(isSet);
  const runs = groups.filter((g) => g.kind === 'shuntsu');

  // 役牌
  for (const g of sets) {
    if (isDragon(g.tile)) add(`役牌 ${DRAGON_NAMES[g.tile - 31]}`, 1);
    if (g.tile === 27 + input.roundWind) add(`場風 ${WIND_NAMES[input.roundWind]}`, 1);
    if (g.tile === 27 + input.seatWind) add(`自風 ${WIND_NAMES[input.seatWind]}`, 1);
  }

  if (menzen && runs.length === 4 && wait === 'ryanmen' && !isValuePair(pair, input)) add('平和', 1);

  if (menzen) {
    const byTile = new Map<TileId, number>();
    for (const g of runs) byTile.set(g.tile, (byTile.get(g.tile) ?? 0) + 1);
    const peiko = [...byTile.values()].reduce((sum, n) => sum + Math.floor(n / 2), 0);
    if (peiko === 2) add('二盃口', 3);
    else if (peiko === 1) add('一盃口', 1);
  }

  const runNumbers = (s: number) => new Set(runs.filter((g) => suitOf(g.tile) === s).map((g) => g.tile % 9));
  const [rm, rp, rs] = [runNumbers(0), runNumbers(1), runNumbers(2)];
  if ([...rm].some((n) => rp.has(n) && rs.has(n))) addKui('三色同順', 2);

  if ([0, 1, 2].some((s) => [0, 3, 6].every((n) => runNumbers(s).has(n)))) addKui('一気通貫', 2);

  if (runs.length > 0 && groups.every(groupHasYaochu) && isYaochu(pair)) {
    if (hasHonor) addKui('混全帯幺九', 2);
    else addKui('純全帯幺九', 3);
  }

  if (sets.length === 4) add('対々和', 2);
  if (sets.filter((g) => !g.open).length === 3) add('三暗刻', 2);

  const setNumbers = (s: number) => new Set(sets.filter((g) => suitOf(g.tile) === s).map((g) => g.tile % 9));
  const [sm, sp, ss] = [setNumbers(0), setNumbers(1), setNumbers(2)];
  if ([...sm].some((n) => sp.has(n) && ss.has(n))) add('三色同刻', 2);

  if (groups.filter((g) => g.kind === 'kantsu').length === 3) add('三槓子', 2);
  if (sets.filter((g) => isDragon(g.tile)).length === 2 && isDragon(pair)) add('小三元', 2);

  return list;
}

/** 符が付く雀頭（役牌・場風・自風） */
export function isValuePair(pair: TileId, input: HandInput): boolean {
  return isDragon(pair) || pair === 27 + input.roundWind || pair === 27 + input.seatWind;
}
