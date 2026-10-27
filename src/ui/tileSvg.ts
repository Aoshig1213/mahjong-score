// 牌の面の絵柄を SVG で描く。画面（Tile.tsx）とアイコンを描くスクリプトの両方で使う。
// 座標は横60×縦80（牌の面だけ。縁や厚みは CSS で付ける）。

const BLUE = '#1d4f9c';
const GREEN = '#1c7a43';
const RED = '#c4302b';
const INK = '#1b1b1b';
const IVORY = '#fbf7ec';

export const KANJI_FONT = "'Yu Mincho','YuMincho','Hiragino Mincho ProN','Noto Serif JP','Noto Serif CJK JP','MS Mincho',serif";

const KANJI_NUMBERS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const HONORS = ['', '東', '南', '西', '北', '白', '發', '中'];

type Dot = [x: number, y: number, r: number, color: string];
type Stick = [x: number, y: number, length: number, color: string];

/** 筒子の丸。外の輪・内の輪・真ん中の点 */
function circle([x, y, r, c]: Dot): string {
  return (
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>` +
    `<circle cx="${x}" cy="${y}" r="${r * 0.74}" fill="${IVORY}"/>` +
    `<circle cx="${x}" cy="${y}" r="${r * 0.56}" fill="${c}"/>` +
    `<circle cx="${x}" cy="${y}" r="${r * 0.2}" fill="${IVORY}"/>`
  );
}

/** 索子の竹。節を3か所 */
function stick([x, y, len, c]: Stick): string {
  const top = y - len / 2;
  const w = 7.6;
  return (
    `<rect x="${x - w / 2}" y="${top}" width="${w}" height="${len}" rx="${w / 2}" fill="${c}"/>` +
    `<rect x="${x - 0.9}" y="${top + 2.5}" width="1.8" height="${len - 5}" rx="0.9" fill="${IVORY}" opacity="0.45"/>` +
    [top + 1.6, y, top + len - 1.6]
      .map((ny) => `<rect x="${x - w / 2 - 0.6}" y="${ny - 0.9}" width="${w + 1.2}" height="1.8" rx="0.9" fill="${c}"/>`)
      .join('') +
    `<rect x="${x - w / 2}" y="${y - 0.4}" width="${w}" height="0.8" fill="${IVORY}" opacity="0.8"/>`
  );
}

const PIN: Record<number, Dot[]> = {
  2: [
    [30, 22, 13, GREEN],
    [30, 58, 13, BLUE],
  ],
  3: [
    [14, 15, 10, BLUE],
    [30, 40, 10, RED],
    [46, 65, 10, GREEN],
  ],
  4: [
    [17, 22, 11, BLUE],
    [43, 22, 11, GREEN],
    [17, 58, 11, GREEN],
    [43, 58, 11, BLUE],
  ],
  5: [
    [15, 16, 9.5, BLUE],
    [45, 16, 9.5, GREEN],
    [30, 40, 9.5, RED],
    [15, 64, 9.5, GREEN],
    [45, 64, 9.5, BLUE],
  ],
  6: [
    [17, 14, 9, GREEN],
    [43, 14, 9, GREEN],
    [17, 42, 9, RED],
    [43, 42, 9, RED],
    [17, 66, 9, RED],
    [43, 66, 9, RED],
  ],
  7: [
    [12, 11, 7, GREEN],
    [30, 19, 7, GREEN],
    [48, 27, 7, GREEN],
    [18, 48, 8.5, RED],
    [42, 48, 8.5, RED],
    [18, 68, 8.5, RED],
    [42, 68, 8.5, RED],
  ],
  8: [
    [17, 11, 8.5, BLUE],
    [43, 11, 8.5, BLUE],
    [17, 30.5, 8.5, BLUE],
    [43, 30.5, 8.5, BLUE],
    [17, 50, 8.5, BLUE],
    [43, 50, 8.5, BLUE],
    [17, 69.5, 8.5, BLUE],
    [43, 69.5, 8.5, BLUE],
  ],
  9: [
    [12, 15, 8.5, BLUE],
    [30, 15, 8.5, BLUE],
    [48, 15, 8.5, BLUE],
    [12, 40, 8.5, RED],
    [30, 40, 8.5, RED],
    [48, 40, 8.5, RED],
    [12, 65, 8.5, GREEN],
    [30, 65, 8.5, GREEN],
    [48, 65, 8.5, GREEN],
  ],
};

const SOU: Record<number, Stick[]> = {
  2: [
    [30, 22, 28, GREEN],
    [30, 58, 28, BLUE],
  ],
  3: [
    [30, 22, 28, GREEN],
    [18, 58, 28, BLUE],
    [42, 58, 28, BLUE],
  ],
  4: [
    [18, 22, 28, GREEN],
    [42, 22, 28, BLUE],
    [18, 58, 28, BLUE],
    [42, 58, 28, GREEN],
  ],
  5: [
    [14, 22, 28, GREEN],
    [46, 22, 28, BLUE],
    [30, 40, 28, RED],
    [14, 58, 28, BLUE],
    [46, 58, 28, GREEN],
  ],
  6: [
    [14, 22, 28, GREEN],
    [30, 22, 28, GREEN],
    [46, 22, 28, GREEN],
    [14, 58, 28, BLUE],
    [30, 58, 28, BLUE],
    [46, 58, 28, BLUE],
  ],
  7: [
    [30, 13, 20, RED],
    [14, 40, 20, GREEN],
    [30, 40, 20, GREEN],
    [46, 40, 20, GREEN],
    [14, 66, 20, BLUE],
    [30, 66, 20, BLUE],
    [46, 66, 20, BLUE],
  ],
  8: [
    [10, 22, 28, GREEN],
    [23.3, 22, 28, GREEN],
    [36.7, 22, 28, GREEN],
    [50, 22, 28, GREEN],
    [10, 58, 28, BLUE],
    [23.3, 58, 28, BLUE],
    [36.7, 58, 28, BLUE],
    [50, 58, 28, BLUE],
  ],
  9: [
    [14, 14, 21, GREEN],
    [30, 14, 21, RED],
    [46, 14, 21, BLUE],
    [14, 40, 21, GREEN],
    [30, 40, 21, RED],
    [46, 40, 21, BLUE],
    [14, 66, 21, GREEN],
    [30, 66, 21, RED],
    [46, 66, 21, BLUE],
  ],
};

/** 一索の鳥 */
const BIRD =
  `<path d="M30 70 C18 70 13 60 15 50 C17 40 24 34 30 33 C36 34 43 40 45 50 C47 60 42 70 30 70Z" fill="${GREEN}"/>` +
  `<path d="M30 68 C23 66 20 58 22 50 C25 56 28 60 30 68Z" fill="${BLUE}"/>` +
  `<path d="M30 68 C37 66 40 58 38 50 C35 56 32 60 30 68Z" fill="${BLUE}"/>` +
  `<path d="M22 72 L30 64 L38 72 L34 77 L30 72 L26 77Z" fill="${RED}"/>` +
  `<path d="M30 34 C27 30 26 24 28 19 L32 19 C34 24 33 30 30 34Z" fill="${GREEN}"/>` +
  `<circle cx="30" cy="15" r="7" fill="${GREEN}"/>` +
  `<circle cx="32" cy="13.5" r="1.8" fill="${IVORY}"/>` +
  `<path d="M36 14 L44 16 L36 18Z" fill="${RED}"/>` +
  `<path d="M26 9 C24 5 27 3 29 6 C30 3 33 4 32 8Z" fill="${RED}"/>`;

function text(ch: string, y: number, size: number, color: string): string {
  return `<text x="30" y="${y}" font-size="${size}" font-family="${KANJI_FONT}" font-weight="700" fill="${color}" text-anchor="middle">${ch}</text>`;
}

/** 牌の面の SVG（<svg> の中身）。tile は "1m" "0p" "7z" などの書き方 */
export function tileFaceSvg(tile: string): string {
  const red = tile[0] === '0';
  const num = red ? 5 : Number(tile[0]);
  const recolor = (c: string) => (red ? RED : c);
  switch (tile[1]) {
    case 'm':
      return text(KANJI_NUMBERS[num], 33, 30, red ? RED : INK) + text('萬', 71, 31, RED);
    case 'p':
      if (num === 1) {
        return (
          circle([30, 40, 25, BLUE]) +
          `<circle cx="30" cy="40" r="11" fill="${RED}"/>` +
          `<circle cx="30" cy="40" r="5" fill="${IVORY}"/>` +
          `<circle cx="30" cy="40" r="2.2" fill="${GREEN}"/>`
        );
      }
      return PIN[num].map(([x, y, r, c]) => circle([x, y, r, recolor(c)])).join('');
    case 's':
      if (num === 1) return BIRD;
      return SOU[num].map(([x, y, l, c]) => stick([x, y, l, recolor(c)])).join('');
    default:
      if (num === 5) {
        return `<rect x="13" y="16" width="34" height="48" rx="2.5" fill="none" stroke="${BLUE}" stroke-width="3"/>`;
      }
      return text(HONORS[num], 56, 44, num === 6 ? GREEN : num === 7 ? RED : INK);
  }
}
