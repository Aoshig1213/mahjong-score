// 牌の面の絵柄を SVG で描く。画面（Tile.tsx）とアイコンを描くスクリプトの両方で使う。
// 座標は横60×縦80（牌の面だけ。縁や厚みは CSS で付ける）。

// 本物の牌に寄せた、少し沈んだ藍・緑・朱
const BLUE = '#1a3f85';
const GREEN = '#0e6a3a';
const RED = '#b8222a';
const INK = '#151515';
const IVORY = '#f8f3e4';

/** 縁取りに使う、同じ色の濃い版 */
const DARK: Record<string, string> = {
  [BLUE]: '#0f2756',
  [GREEN]: '#084524',
  [RED]: '#7d1218',
  [INK]: '#000000',
};

/**
 * 彫って色を入れたように見せる。彫りの上の縁に影、下の縁に光を付ける。
 * 同じ id の定義が牌ごとに入るが、中身が同じなのでどれが使われても見た目は変わらない
 */
const ENGRAVE_DEFS =
  '<defs><filter id="tile-engrave" x="-5%" y="-5%" width="110%" height="110%">' +
  '<feOffset in="SourceAlpha" dy="0.7" result="down"/>' +
  '<feFlood flood-color="#ffffff" flood-opacity="0.95"/>' +
  '<feComposite in2="down" operator="in" result="light"/>' +
  '<feComposite in="SourceAlpha" in2="down" operator="out" result="topEdge"/>' +
  '<feFlood flood-color="#000000" flood-opacity="0.45"/>' +
  '<feComposite in2="topEdge" operator="in" result="shade"/>' +
  '<feMerge><feMergeNode in="light"/><feMergeNode in="SourceGraphic"/><feMergeNode in="shade"/></feMerge>' +
  '</filter></defs>';

const engraved = (body: string) => `${ENGRAVE_DEFS}<g filter="url(#tile-engrave)">${body}</g>`;

export const KANJI_FONT = "'Yu Mincho','YuMincho','Hiragino Mincho ProN','Noto Serif JP','Noto Serif CJK JP','MS Mincho',serif";

const KANJI_NUMBERS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const HONORS = ['', '東', '南', '西', '北', '白', '發', '中'];

type Dot = [x: number, y: number, r: number, color: string];
type Stick = [x: number, y: number, length: number, color: string];

const f = (n: number) => Number(n.toFixed(2));

/** 円の周りに小さな玉を並べる */
function beads(x: number, y: number, radius: number, count: number, size: number, color: string): string {
  let s = '';
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count;
    s += `<circle cx="${f(x + Math.cos(a) * radius)}" cy="${f(y + Math.sin(a) * radius)}" r="${f(size)}" fill="${color}"/>`;
  }
  return s;
}

/** 筒子の丸。細い外輪・玉を並べた輪・真ん中の花 */
function circle([x, y, r, c]: Dot): string {
  return (
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>` +
    `<circle cx="${x}" cy="${y}" r="${f(r * 0.84)}" fill="${IVORY}"/>` +
    `<circle cx="${x}" cy="${y}" r="${f(r * 0.74)}" fill="${c}"/>` +
    beads(x, y, r * 0.56, r >= 10 ? 12 : 10, r * 0.085, IVORY) +
    `<circle cx="${x}" cy="${y}" r="${f(r * 0.38)}" fill="${IVORY}"/>` +
    `<circle cx="${x}" cy="${y}" r="${f(r * 0.29)}" fill="${c}"/>` +
    `<circle cx="${x}" cy="${y}" r="${f(r * 0.1)}" fill="${IVORY}"/>`
  );
}

/** 索子の竹。縁取りした茎・節のふくらみ・節の間の筋 */
function stick([x, y, len, c]: Stick): string {
  const top = y - len / 2;
  const bottom = y + len / 2;
  const w = 7.4;
  const dark = DARK[c] ?? c;
  const joints = [top + 1.2, y, bottom - 1.2];
  const ribs = [
    [top + 2.6, y - 1.4],
    [y + 1.4, bottom - 2.6],
  ];
  return (
    `<rect x="${f(x - w / 2)}" y="${f(top)}" width="${w}" height="${len}" rx="${f(w / 2.2)}" fill="${c}" stroke="${dark}" stroke-width="0.5"/>` +
    ribs.map(([a, b]) => `<line x1="${x}" y1="${f(a)}" x2="${x}" y2="${f(b)}" stroke="${IVORY}" stroke-width="1.3" stroke-linecap="round" opacity="0.85"/>`).join('') +
    joints
      .map(
        (ny) =>
          `<ellipse cx="${x}" cy="${f(ny)}" rx="${f(w / 2 + 0.9)}" ry="1.25" fill="${c}" stroke="${dark}" stroke-width="0.45"/>` +
          `<line x1="${f(x - w / 2 + 0.6)}" y1="${f(ny)}" x2="${f(x + w / 2 - 0.6)}" y2="${f(ny)}" stroke="${IVORY}" stroke-width="0.45" opacity="0.7"/>`,
      )
      .join('')
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
  `<path d="M30 70 C18 70 13 60 15 50 C17 40 24 34 30 33 C36 34 43 40 45 50 C47 60 42 70 30 70Z" fill="${GREEN}" stroke="${DARK[GREEN]}" stroke-width="0.6"/>` +
  `<path d="M24 46 C27 50 29 54 30 60 M36 46 C33 50 31 54 30 60 M30 40 L30 58" stroke="${IVORY}" stroke-width="0.9" fill="none" opacity="0.7"/>` +
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
  return engraved(faceBody(tile));
}

/** 一筒。外輪・玉の輪・花びらの輪・真ん中 */
const ONE_PIN =
  `<circle cx="30" cy="40" r="26" fill="${GREEN}"/>` +
  `<circle cx="30" cy="40" r="23.6" fill="${IVORY}"/>` +
  `<circle cx="30" cy="40" r="22" fill="${BLUE}"/>` +
  beads(30, 40, 18.6, 24, 1.5, IVORY) +
  `<circle cx="30" cy="40" r="15.2" fill="${IVORY}"/>` +
  Array.from({ length: 8 }, (_, i) => {
    const a = i * 45;
    return `<ellipse cx="30" cy="31.5" rx="3.6" ry="6.2" fill="${RED}" transform="rotate(${a} 30 40)"/>`;
  }).join('') +
  `<circle cx="30" cy="40" r="5.4" fill="${IVORY}"/>` +
  `<circle cx="30" cy="40" r="3.6" fill="${GREEN}"/>` +
  `<circle cx="30" cy="40" r="1.3" fill="${IVORY}"/>`;

function faceBody(tile: string): string {
  const red = tile[0] === '0';
  const num = red ? 5 : Number(tile[0]);
  const recolor = (c: string) => (red ? RED : c);
  switch (tile[1]) {
    case 'm':
      return text(KANJI_NUMBERS[num], 33, 31, red ? RED : INK) + text('萬', 72, 32, RED);
    case 'p':
      if (num === 1) return ONE_PIN;
      return PIN[num].map(([x, y, r, c]) => circle([x, y, r, recolor(c)])).join('');
    case 's':
      if (num === 1) return BIRD;
      return SOU[num].map(([x, y, l, c]) => stick([x, y, l, recolor(c)])).join('');
    default:
      if (num === 5) {
        // 白は二重の枠
        return (
          `<rect x="11" y="13" width="38" height="54" rx="3" fill="none" stroke="${BLUE}" stroke-width="2.6"/>` +
          `<rect x="15.5" y="17.5" width="29" height="45" rx="1.5" fill="none" stroke="${BLUE}" stroke-width="1"/>`
        );
      }
      return text(HONORS[num], 57, 46, num === 6 ? GREEN : num === 7 ? RED : INK);
  }
}
