import type { TileCode } from './tiles';

/** 0=東 1=南 2=西 3=北 */
export type Wind = 0 | 1 | 2 | 3;

/** 加槓は明槓として扱う */
export type MeldType = 'chi' | 'pon' | 'minkan' | 'ankan';

export interface Meld {
  type: MeldType;
  /** チー・ポンは3枚、槓は4枚 */
  tiles: TileCode[];
}

export interface HandInput {
  /** 鳴いていない牌。和了牌を含む（鳴きがなければ14枚） */
  hand: TileCode[];
  winTile: TileCode;
  melds?: Meld[];
  tsumo: boolean;
  roundWind: Wind;
  /** 東家（親）なら 0 */
  seatWind: Wind;
  /** ドラ表示牌（槓ドラも含める） */
  dora?: TileCode[];
  /** 裏ドラ表示牌。立直していなければ数えない */
  uraDora?: TileCode[];
  honba?: number;
  riichi?: boolean;
  doubleRiichi?: boolean;
  ippatsu?: boolean;
  /** 海底摸月（最後の牌でツモ） */
  haitei?: boolean;
  /** 河底撈魚（最後の捨て牌でロン） */
  houtei?: boolean;
  rinshan?: boolean;
  chankan?: boolean;
  tenhou?: boolean;
  chiihou?: boolean;
}

export interface Rules {
  /** 喰いタン */
  kuitan: boolean;
  /** ダブル役満と役満の複合。false なら役満は何が重なっても1倍 */
  doubleYakuman: boolean;
  /** 切り上げ満貫（30符4翻・60符3翻を満貫にする） */
  kiriageMangan: boolean;
  /** 数え役満（13翻以上）。false なら三倍満で止める */
  kazoeYakuman: boolean;
  /** 連風牌の雀頭の符 */
  doubleWindPairFu: 2 | 4;
}

export const DEFAULT_RULES: Rules = {
  kuitan: true,
  doubleYakuman: true,
  kiriageMangan: false,
  kazoeYakuman: true,
  doubleWindPairFu: 2,
};

export interface Yaku {
  name: string;
  han: number;
}

export interface Yakuman {
  name: string;
  /** ダブル役満なら 2 */
  times: number;
}

export interface FuItem {
  label: string;
  fu: number;
}

export type Wait = 'ryanmen' | 'kanchan' | 'penchan' | 'shanpon' | 'tanki' | 'kokushi13';

export type Limit = 'mangan' | 'haneman' | 'baiman' | 'sanbaiman' | 'kazoe' | 'yakuman';

/** 支払い（本場を含む。供託は含めない） */
export type Payment =
  | { kind: 'ron'; amount: number; total: number }
  /** 親のツモ。子3人が同じ点数を払う */
  | { kind: 'tsumo-dealer'; each: number; total: number }
  /** 子のツモ。親と子で払う点数が違う */
  | { kind: 'tsumo'; dealer: number; nonDealer: number; total: number };

export interface ScoreResult {
  /** 役（ドラを除く）。役満のときは空 */
  yaku: Yaku[];
  yakuman: Yakuman[];
  dora: number;
  akaDora: number;
  uraDora: number;
  /** ドラを含む翻数。役満のときは 0 */
  han: number;
  /** 役満のときは 0 */
  fu: number;
  fuItems: FuItem[];
  wait: Wait | null;
  limit: Limit | null;
  /** 基本点（子のロンならこの4倍が点数） */
  basePoints: number;
  payment: Payment;
}

export type CalcOutcome = { ok: true; result: ScoreResult } | { ok: false; error: string };
