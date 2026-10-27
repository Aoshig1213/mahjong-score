// 牌の面の絵柄を SVG で描く。画面（Tile.tsx）とアイコンを描くスクリプトの両方で使う。
// 座標は横60×縦80（牌の面だけ。縁や厚みは CSS で付ける）。
// 昔ながらの牌の描き方に寄せている：萬子・字牌は筆文字、筒子は紺の丸に花、索子は線で描いた竹。

const NAVY = '#1b2263';
const GREEN = '#0f5a2c';
const RED = '#a01c22';
const INK = '#111111';
const IVORY = '#fbf8ef';

/** 筆文字（public/fonts/brush.ttf。使う文字だけを入れてある）。無いときは明朝 */
export const KANJI_FONT =
  "'MahjongBrush','Yuji Boku','Yu Mincho','YuMincho','Hiragino Mincho ProN','Noto Serif JP','MS Mincho',serif";

const KANJI_NUMBERS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const HONORS = ['', '東', '南', '西', '北', '白', '發', '中'];

const f = (n: number) => Number(n.toFixed(2));

/**
 * 彫って色を入れたように見せる。彫りの上の縁に影、下の縁に光を付ける。
 * 同じ id の定義が牌ごとに入るが、中身が同じなのでどれが使われても見た目は変わらない
 */
const ENGRAVE_DEFS =
  '<defs><filter id="tile-engrave" x="-5%" y="-5%" width="110%" height="110%">' +
  '<feOffset in="SourceAlpha" dy="0.6" result="down"/>' +
  '<feFlood flood-color="#ffffff" flood-opacity="0.9"/>' +
  '<feComposite in2="down" operator="in" result="light"/>' +
  '<feComposite in="SourceAlpha" in2="down" operator="out" result="topEdge"/>' +
  '<feFlood flood-color="#000000" flood-opacity="0.35"/>' +
  '<feComposite in2="topEdge" operator="in" result="shade"/>' +
  '<feMerge><feMergeNode in="light"/><feMergeNode in="SourceGraphic"/><feMergeNode in="shade"/></feMerge>' +
  '</filter></defs>';

const engraved = (body: string) => `${ENGRAVE_DEFS}<g filter="url(#tile-engrave)">${body}</g>`;

/** 中心から放射状に並べる */
function around(count: number, fn: (deg: number) => string): string {
  return Array.from({ length: count }, (_, i) => fn((360 * i) / count)).join('');
}

// ---- 筒子 ----

type Dot = [x: number, y: number, r: number, color?: string];

/** 筒子の丸。二重の輪の中に、6枚の花びらの花 */
function pin([x, y, r, c = NAVY]: Dot): string {
  const petal = (deg: number) =>
    `<ellipse cx="${x}" cy="${f(y - r * 0.33)}" rx="${f(r * 0.15)}" ry="${f(r * 0.24)}" fill="${IVORY}" transform="rotate(${deg} ${x} ${y})"/>`;
  return (
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>` +
    `<circle cx="${x}" cy="${y}" r="${f(r * 0.82)}" fill="${IVORY}"/>` +
    `<circle cx="${x}" cy="${y}" r="${f(r * 0.7)}" fill="${c}"/>` +
    around(6, petal) +
    `<circle cx="${x}" cy="${y}" r="${f(r * 0.13)}" fill="${IVORY}"/>`
  );
}

/** 一筒。外輪・細かい放射の輪・花 */
const ONE_PIN =
  `<circle cx="30" cy="40" r="26" fill="${NAVY}"/>` +
  `<circle cx="30" cy="40" r="23.2" fill="${IVORY}"/>` +
  `<circle cx="30" cy="40" r="21.4" fill="${NAVY}"/>` +
  around(
    28,
    (deg) => `<rect x="29.4" y="21.6" width="1.2" height="6.4" rx="0.6" fill="${IVORY}" transform="rotate(${f(deg)} 30 40)"/>`,
  ) +
  `<circle cx="30" cy="40" r="11.4" fill="${IVORY}"/>` +
  `<circle cx="30" cy="40" r="10" fill="${RED}"/>` +
  around(6, (deg) => `<ellipse cx="30" cy="35.2" rx="1.9" ry="3" fill="${IVORY}" transform="rotate(${deg} 30 40)"/>`) +
  `<circle cx="30" cy="40" r="1.6" fill="${IVORY}"/>`;

const PIN: Record<number, Dot[]> = {
  2: [
    [30, 21, 12.5],
    [30, 59, 12.5],
  ],
  3: [
    [14, 15, 10.5],
    [30, 40, 10.5, RED],
    [46, 65, 10.5],
  ],
  4: [
    [17, 21, 11.5],
    [43, 21, 11.5],
    [17, 59, 11.5],
    [43, 59, 11.5],
  ],
  5: [
    [15, 15, 10],
    [45, 15, 10],
    [30, 40, 10, RED],
    [15, 65, 10],
    [45, 65, 10],
  ],
  6: [
    [18, 13, 9],
    [42, 13, 9],
    [18, 44, 9, RED],
    [42, 44, 9, RED],
    [18, 67, 9, RED],
    [42, 67, 9, RED],
  ],
  7: [
    [12, 10, 7.5],
    [30, 18, 7.5],
    [48, 26, 7.5],
    [18, 47, 8.8, RED],
    [42, 47, 8.8, RED],
    [18, 68, 8.8, RED],
    [42, 68, 8.8, RED],
  ],
  8: [
    [18, 10.5, 8.8],
    [42, 10.5, 8.8],
    [18, 30.2, 8.8],
    [42, 30.2, 8.8],
    [18, 49.8, 8.8],
    [42, 49.8, 8.8],
    [18, 69.5, 8.8],
    [42, 69.5, 8.8],
  ],
  9: [
    [11.5, 14, 8.8],
    [30, 14, 8.8],
    [48.5, 14, 8.8],
    [11.5, 40, 8.8, RED],
    [30, 40, 8.8, RED],
    [48.5, 40, 8.8, RED],
    [11.5, 66, 8.8],
    [30, 66, 8.8],
    [48.5, 66, 8.8],
  ],
};

// ---- 索子 ----

/** 竹1本の置き場所。angle は傾き（八索の斜めの竹） */
type Stick = [x: number, y: number, length: number, color?: string, angle?: number];

/** 線で描いた竹。白抜きの茎に、上・真ん中・下の節 */
function bamboo([x, y, len, c = GREEN, angle = 0]: Stick): string {
  const w = 6.2;
  const top = y - len / 2;
  const bottom = y + len / 2;
  const knot = (ny: number) =>
    `<rect x="${f(x - w / 2 - 0.9)}" y="${f(ny - 1.3)}" width="${f(w + 1.8)}" height="2.6" rx="1.3" fill="${c}"/>`;
  const body =
    `<rect x="${f(x - w / 2)}" y="${f(top)}" width="${w}" height="${len}" rx="2" fill="${IVORY}" stroke="${c}" stroke-width="1.7"/>` +
    // 節と節の間のふくらみ
    [top + len * 0.27, y + len * 0.23]
      .map((my) => `<rect x="${f(x - 1)}" y="${f(my - len * 0.11)}" width="2" height="${f(len * 0.22)}" rx="1" fill="${c}"/>`)
      .join('') +
    knot(top + 0.6) +
    knot(y) +
    knot(bottom - 0.6);
  return angle ? `<g transform="rotate(${angle} ${x} ${y})">${body}</g>` : body;
}

const SOU: Record<number, Stick[]> = {
  2: [
    [30, 21, 32],
    [30, 59, 32],
  ],
  3: [
    [30, 21, 32],
    [17, 59, 32],
    [43, 59, 32],
  ],
  4: [
    [17, 21, 32],
    [43, 21, 32],
    [17, 59, 32],
    [43, 59, 32],
  ],
  5: [
    [13, 21, 32],
    [47, 21, 32],
    [30, 40, 32, RED],
    [13, 59, 32],
    [47, 59, 32],
  ],
  6: [
    [13, 21, 32],
    [30, 21, 32],
    [47, 21, 32],
    [13, 59, 32],
    [30, 59, 32],
    [47, 59, 32],
  ],
  7: [
    [30, 12, 22, RED],
    [13, 40, 22],
    [30, 40, 22],
    [47, 40, 22],
    [13, 67, 22],
    [30, 67, 22],
    [47, 67, 22],
  ],
  // 上は「∧」、下は「∨」の形
  8: [
    [9, 21, 32],
    [51, 21, 32],
    [23.5, 21, 30, GREEN, 24],
    [36.5, 21, 30, GREEN, -24],
    [9, 59, 32],
    [51, 59, 32],
    [23.5, 59, 30, GREEN, -24],
    [36.5, 59, 30, GREEN, 24],
  ],
  9: [
    [13, 13, 22],
    [30, 13, 22, RED],
    [47, 13, 22],
    [13, 40, 22],
    [30, 40, 22, RED],
    [47, 40, 22],
    [13, 67, 22],
    [30, 67, 22, RED],
    [47, 67, 22],
  ],
};

/** 一索の鳥（孔雀）。線描きの胴と、扇に広げた尾羽 */
const BIRD =
  // 尾羽：上に扇形に広げた羽と、羽の目玉
  [-50, -33, -16, 0, 16, 33]
    .map(
      (d) =>
        `<g transform="rotate(${d} 26 52)">` +
        `<path d="M26 52 L26 13" stroke="${GREEN}" stroke-width="1.1"/>` +
        `<ellipse cx="26" cy="13" rx="4" ry="5.2" fill="${GREEN}"/>` +
        `<ellipse cx="26" cy="13.6" rx="2.1" ry="2.9" fill="${IVORY}"/>` +
        `<circle cx="26" cy="13.9" r="1.25" fill="${NAVY}"/>` +
        `</g>`,
    )
    .join('') +
  // 胴
  `<path d="M22 66 C16 58 18 46 28 43 C34 41 40 45 40 51 C40 59 34 65 22 66Z" fill="${IVORY}" stroke="${GREEN}" stroke-width="1.6"/>` +
  `<path d="M24 60 C28 58 31 54 33 49 M26 63 C31 61 35 57 37 52" stroke="${GREEN}" stroke-width="1" fill="none"/>` +
  // 首と頭
  `<path d="M36 46 C38 40 40 36 42 33" stroke="${NAVY}" stroke-width="3" fill="none" stroke-linecap="round"/>` +
  `<circle cx="43" cy="31.5" r="3.2" fill="${NAVY}"/>` +
  `<circle cx="44" cy="31" r="0.9" fill="${IVORY}"/>` +
  `<path d="M46 31 L50.5 32.2 L46 33.2Z" fill="${RED}"/>` +
  `<path d="M42 28.5 L41 25 M43.5 28.3 L44 24.6" stroke="${RED}" stroke-width="1" stroke-linecap="round"/>` +
  // 脚
  `<path d="M26 66 L25 73 M31 65 L32 73 M23 73 L27 73 M30 73 L34 73" stroke="${RED}" stroke-width="1.2" stroke-linecap="round"/>`;

// ---- 文字 ----

function text(ch: string, y: number, size: number, color: string): string {
  // 筆の太さを出すため、同じ色で少し縁取る
  return `<text x="30" y="${y}" font-size="${size}" font-family="${KANJI_FONT}" fill="${color}" stroke="${color}" stroke-width="0.9" stroke-linejoin="round" text-anchor="middle">${ch}</text>`;
}

/** 牌の面の SVG（<svg> の中身）。tile は "1m" "0p" "7z" などの書き方 */
export function tileFaceSvg(tile: string): string {
  return engraved(faceBody(tile));
}

function faceBody(tile: string): string {
  const red = tile[0] === '0';
  const num = red ? 5 : Number(tile[0]);
  // 赤5は全部赤で描く
  const recolor = (c?: string) => (red ? RED : c);
  switch (tile[1]) {
    case 'm':
      return text(KANJI_NUMBERS[num], 34, 34, red ? RED : INK) + text('萬', 74, 38, RED);
    case 'p':
      if (num === 1) return ONE_PIN;
      return PIN[num].map(([x, y, r, c]) => pin([x, y, r, recolor(c)])).join('');
    case 's':
      if (num === 1) return BIRD;
      return SOU[num].map(([x, y, l, c, a]) => bamboo([x, y, l, recolor(c), a])).join('');
    default:
      if (num === 5) {
        // 白は二重の枠
        return (
          `<rect x="11" y="13" width="38" height="54" rx="3" fill="none" stroke="${NAVY}" stroke-width="2.6"/>` +
          `<rect x="15.5" y="17.5" width="29" height="45" rx="1.5" fill="none" stroke="${NAVY}" stroke-width="1"/>`
        );
      }
      return text(HONORS[num], 59, 50, num === 6 ? GREEN : num === 7 ? RED : INK);
  }
}
