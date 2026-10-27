import { tileId, type TileCode } from '../engine/tiles';
import type { HandInput, Meld, Wind } from '../engine/types';

/** 牌をタップしたときに入る先 */
export type Target = 'hand' | 'win' | 'chi' | 'pon' | 'minkan' | 'ankan' | 'dora' | 'uraDora';

export type Flag =
  | 'riichi'
  | 'doubleRiichi'
  | 'ippatsu'
  | 'haitei'
  | 'houtei'
  | 'rinshan'
  | 'chankan'
  | 'tenhou'
  | 'chiihou';

export const FLAG_NAMES: Record<Flag, string> = {
  riichi: '立直',
  doubleRiichi: 'ダブル立直',
  ippatsu: '一発',
  haitei: '海底摸月',
  houtei: '河底撈魚',
  rinshan: '嶺上開花',
  chankan: '槍槓',
  tenhou: '天和',
  chiihou: '地和',
};

export interface CalcState {
  /** 鳴いていない牌（和了牌を除く） */
  hand: TileCode[];
  win: TileCode | null;
  melds: Meld[];
  /** チーで選んでいる途中の牌 */
  pendingChi: TileCode[];
  dora: TileCode[];
  uraDora: TileCode[];
  target: Target;
  tsumo: boolean;
  roundWind: Wind;
  seatWind: Wind;
  honba: number;
  flags: Record<Flag, boolean>;
  /** 直前の操作ができなかった理由 */
  message: string | null;
}

const NO_FLAGS: Record<Flag, boolean> = {
  riichi: false,
  doubleRiichi: false,
  ippatsu: false,
  haitei: false,
  houtei: false,
  rinshan: false,
  chankan: false,
  tenhou: false,
  chiihou: false,
};

export const INITIAL_STATE: CalcState = {
  hand: [],
  win: null,
  melds: [],
  pendingChi: [],
  dora: [],
  uraDora: [],
  target: 'hand',
  tsumo: false,
  roundWind: 0,
  seatWind: 1,
  honba: 0,
  flags: NO_FLAGS,
  message: null,
};

export type Action =
  | { type: 'tap'; tile: TileCode }
  | { type: 'removeHand'; index: number }
  | { type: 'removeWin' }
  | { type: 'removeMeld'; index: number }
  | { type: 'removeDora'; kind: 'dora' | 'uraDora'; index: number }
  | { type: 'setTarget'; target: Target }
  | { type: 'set'; patch: Partial<Pick<CalcState, 'tsumo' | 'roundWind' | 'seatWind' | 'honba'>> }
  | { type: 'toggleFlag'; flag: Flag }
  | { type: 'clear' };

const MAX_INDICATORS = 5;

/** 鳴きの数から、和了牌を除いた手牌の枚数 */
export function handCapacity(melds: Meld[]): number {
  return 13 - melds.length * 3;
}

function allTiles(state: CalcState): TileCode[] {
  return [
    ...state.hand,
    ...(state.win ? [state.win] : []),
    ...state.melds.flatMap((m) => m.tiles),
    ...state.pendingChi,
    ...state.dora,
    ...state.uraDora,
  ];
}

/** あと何枚その牌を使えるか（同じ牌は4枚まで、赤5は1枚まで） */
export function remaining(state: CalcState, tile: TileCode): number {
  const tiles = allTiles(state);
  const id = tileId(tile);
  const sameId = 4 - tiles.filter((t) => tileId(t) === id).length;
  if (tile[0] !== '0') return sameId;
  return Math.min(sameId, tiles.includes(tile) ? 0 : 1);
}

export function sortTiles(tiles: TileCode[]): TileCode[] {
  const key = (t: TileCode) => tileId(t) * 2 + (t[0] === '0' ? 1 : 0);
  return [...tiles].sort((a, b) => key(a) - key(b));
}

/** ポン・槓の牌。赤5をタップしたら1枚だけ赤にする */
function setTiles(tile: TileCode, n: number): TileCode[] {
  const normal = tile[0] === '0' ? `5${tile[1]}` : tile;
  return [tile, ...new Array<TileCode>(n - 1).fill(normal)];
}

function isSequence(tiles: TileCode[]): boolean {
  const ids = tiles.map(tileId).sort((a, b) => a - b);
  return ids[0] < 27 && Math.floor(ids[0] / 9) === Math.floor(ids[2] / 9) && ids[1] === ids[0] + 1 && ids[2] === ids[0] + 2;
}

function addMeld(state: CalcState, meld: Meld): CalcState {
  const melds = [...state.melds, meld];
  if (melds.length > 4) return { ...state, pendingChi: [], message: '鳴きは4つまでです' };
  if (state.hand.length > handCapacity(melds)) {
    return { ...state, pendingChi: [], message: '手牌が多すぎて鳴きを入れられません。先に手牌を減らしてください' };
  }
  return { ...state, melds, pendingChi: [], target: 'hand', message: null };
}

function tap(state: CalcState, tile: TileCode): CalcState {
  const s = { ...state, message: null };
  const need = { pon: 3, minkan: 4, ankan: 4 } as const;
  if (s.target in need) {
    const n = need[s.target as keyof typeof need];
    const tiles = setTiles(tile, n);
    // 1枚ずつ足していったときに、どれも残りがあるか
    const fits = tiles.every((t, i) => remaining({ ...s, pendingChi: tiles.slice(0, i) }, t) >= 1);
    if (!fits) return { ...s, message: 'その牌はもう足りません' };
    return addMeld(s, { type: s.target as Meld['type'], tiles });
  }

  if (remaining(s, tile) < 1) return { ...s, message: 'その牌はもう4枚使っています' };

  switch (s.target) {
    case 'hand': {
      if (s.hand.length < handCapacity(s.melds)) {
        const hand = [...s.hand, tile];
        // 手牌がそろったら、次の1枚は和了牌として入れる
        const target = hand.length === handCapacity(s.melds) && !s.win ? 'win' : 'hand';
        return { ...s, hand, target };
      }
      if (!s.win) return { ...s, win: tile };
      return { ...s, message: '手牌はそろっています。直すときは牌をタップして消してください' };
    }
    case 'win':
      return { ...s, win: tile, target: 'hand' };
    case 'chi': {
      const pendingChi = [...s.pendingChi, tile];
      if (pendingChi.length < 3) return { ...s, pendingChi };
      if (!isSequence(pendingChi)) return { ...s, pendingChi: [], message: 'チーは同じ色の続いた3枚です' };
      return addMeld(s, { type: 'chi', tiles: sortTiles(pendingChi) });
    }
    case 'dora':
    case 'uraDora': {
      if (s[s.target].length >= MAX_INDICATORS) return { ...s, message: 'ドラ表示牌は5枚までです' };
      return { ...s, [s.target]: [...s[s.target], tile] };
    }
  }
  return s;
}

export function reducer(state: CalcState, action: Action): CalcState {
  switch (action.type) {
    case 'tap':
      return tap(state, action.tile);
    case 'removeHand':
      return { ...state, hand: state.hand.filter((_, i) => i !== action.index), target: 'hand', message: null };
    case 'removeWin':
      return { ...state, win: null, target: 'win', message: null };
    case 'removeMeld':
      return { ...state, melds: state.melds.filter((_, i) => i !== action.index), message: null };
    case 'removeDora':
      return { ...state, [action.kind]: state[action.kind].filter((_, i) => i !== action.index), message: null };
    case 'setTarget':
      return { ...state, target: action.target, pendingChi: [], message: null };
    case 'set':
      return { ...state, ...action.patch, message: null };
    case 'toggleFlag': {
      const flags = { ...state.flags, [action.flag]: !state.flags[action.flag] };
      if (action.flag === 'riichi' && flags.riichi) flags.doubleRiichi = false;
      if (action.flag === 'doubleRiichi' && flags.doubleRiichi) flags.riichi = false;
      return { ...state, flags, message: null };
    }
    case 'clear':
      return { ...INITIAL_STATE, roundWind: state.roundWind, seatWind: state.seatWind, honba: state.honba };
  }
}

/** いまの状態で選べる役 */
export function enabledFlags(state: CalcState): Record<Flag, boolean> {
  const open = state.melds.some((m) => m.type !== 'ankan');
  const riichi = state.flags.riichi || state.flags.doubleRiichi;
  const dealer = state.seatWind === 0;
  const noMelds = state.melds.length === 0;
  return {
    riichi: !open,
    doubleRiichi: !open,
    ippatsu: !open && riichi,
    haitei: state.tsumo,
    houtei: !state.tsumo,
    rinshan: state.tsumo && state.melds.some((m) => m.type === 'minkan' || m.type === 'ankan'),
    chankan: !state.tsumo,
    tenhou: state.tsumo && dealer && noMelds,
    chiihou: state.tsumo && !dealer && noMelds,
  };
}

/** 計算に渡す形にする。牌がそろっていなければ null */
export function toInput(state: CalcState): HandInput | null {
  if (!state.win || state.hand.length !== handCapacity(state.melds)) return null;
  const enabled = enabledFlags(state);
  const flag = (f: Flag) => state.flags[f] && enabled[f];
  return {
    hand: [...state.hand, state.win],
    winTile: state.win,
    melds: state.melds,
    tsumo: state.tsumo,
    roundWind: state.roundWind,
    seatWind: state.seatWind,
    honba: state.honba,
    dora: state.dora,
    uraDora: flag('riichi') || flag('doubleRiichi') ? state.uraDora : [],
    riichi: flag('riichi'),
    doubleRiichi: flag('doubleRiichi'),
    ippatsu: flag('ippatsu'),
    haitei: flag('haitei'),
    houtei: flag('houtei'),
    rinshan: flag('rinshan'),
    chankan: flag('chankan'),
    tenhou: flag('tenhou'),
    chiihou: flag('chiihou'),
  };
}
