// 牌の絵柄の画像（public/tiles/）。
// FluffyStuff/riichi-mahjong-tiles の Regular（パブリックドメイン・CC0）から、牌の面の絵柄だけを使っている。
// 牌の本体（縁・厚み・つや）は CSS で描く。

const SUITS: Record<string, string> = { m: 'Man', p: 'Pin', s: 'Sou' };
const HONORS = ['', 'Ton', 'Nan', 'Shaa', 'Pei', 'Haku', 'Hatsu', 'Chun'];

/** "1m" "0p" "7z" などの書き方から、public/tiles/ の中のファイル名を出す */
export function tileFileName(tile: string): string {
  if (tile[1] === 'z') return `${HONORS[Number(tile[0])]}.svg`;
  if (tile[0] === '0') return `${SUITS[tile[1]]}5-Dora.svg`;
  return `${SUITS[tile[1]]}${tile[0]}.svg`;
}

export const ALL_TILE_FILES = [
  ...['m', 'p', 's'].flatMap((s) => ['1', '2', '3', '4', '5', '0', '6', '7', '8', '9'].map((n) => tileFileName(n + s))),
  ...['1', '2', '3', '4', '5', '6', '7'].map((n) => tileFileName(`${n}z`)),
];
