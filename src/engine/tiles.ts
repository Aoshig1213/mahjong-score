// 牌の表し方
//   画面やテストでは "1m" のような文字で表す（m=萬子 p=筒子 s=索子 z=字牌、0=赤5）。
//   字牌は 1z〜7z = 東 南 西 北 白 發 中。
//   計算の中では 0〜33 の番号で扱う。0〜8=萬子、9〜17=筒子、18〜26=索子、27〜30=東南西北、31〜33=白發中。
//   赤5は番号では普通の5と同じになり、赤かどうかは文字の側で見分ける。

export type TileCode = string;
export type TileId = number;

const SUITS = ['m', 'p', 's', 'z'] as const;

export const WIND_NAMES = ['東', '南', '西', '北'] as const;
export const DRAGON_NAMES = ['白', '發', '中'] as const;

export function tileId(code: TileCode): TileId {
  const m = /^([0-9])([mpsz])$/.exec(code);
  if (!m) throw new Error(`牌の書き方が正しくありません: ${code}`);
  const num = m[1] === '0' ? 5 : Number(m[1]);
  const suit = SUITS.indexOf(m[2] as (typeof SUITS)[number]);
  if (num === 0 || (suit === 3 && (num > 7 || m[1] === '0'))) {
    throw new Error(`牌の書き方が正しくありません: ${code}`);
  }
  return suit * 9 + num - 1;
}

export function isRed(code: TileCode): boolean {
  return code[0] === '0';
}

export function isHonor(id: TileId): boolean {
  return id >= 27;
}

export function isTerminal(id: TileId): boolean {
  return id < 27 && (id % 9 === 0 || id % 9 === 8);
}

/** 么九牌（1・9・字牌） */
export function isYaochu(id: TileId): boolean {
  return isHonor(id) || isTerminal(id);
}

export function isDragon(id: TileId): boolean {
  return id >= 31;
}

export function isWind(id: TileId): boolean {
  return id >= 27 && id <= 30;
}

/** 0=萬子 1=筒子 2=索子 3=字牌 */
export function suitOf(id: TileId): number {
  return Math.floor(id / 9);
}

/** ドラ表示牌から、ドラになる牌を出す */
export function doraFromIndicator(id: TileId): TileId {
  if (id < 27) return suitOf(id) * 9 + ((id % 9) + 1) % 9;
  if (id <= 30) return 27 + ((id - 27 + 1) % 4);
  return 31 + ((id - 31 + 1) % 3);
}

export function tileName(id: TileId): string {
  if (id >= 31) return DRAGON_NAMES[id - 31];
  if (id >= 27) return WIND_NAMES[id - 27];
  return `${(id % 9) + 1}${['萬', '筒', '索'][suitOf(id)]}`;
}

/** "123m456p11z" のような書き方を牌の並びに分ける */
export function parseTiles(text: string): TileCode[] {
  const tiles: TileCode[] = [];
  let digits = '';
  for (const ch of text.replace(/\s/g, '')) {
    if (/[0-9]/.test(ch)) {
      digits += ch;
    } else if (/[mpsz]/.test(ch)) {
      if (!digits) throw new Error(`牌の書き方が正しくありません: ${text}`);
      for (const d of digits) tiles.push(d + ch);
      digits = '';
    } else {
      throw new Error(`牌の書き方が正しくありません: ${text}`);
    }
  }
  if (digits) throw new Error(`牌の書き方が正しくありません: ${text}`);
  tiles.forEach(tileId);
  return tiles;
}

export function countTiles(ids: TileId[]): number[] {
  const counts = new Array<number>(34).fill(0);
  for (const id of ids) counts[id]++;
  return counts;
}
