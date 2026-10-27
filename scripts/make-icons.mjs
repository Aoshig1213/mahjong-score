// ホーム画面用のアイコン（PNG）を描いて public\ に書き出す。
// 絵柄: 緑の卓の上に一筒の牌を1枚。外部の画像ツールを使わずに描く。
//   node scripts/make-icons.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';

const FELT = [31, 95, 63];
const TILE = [251, 248, 239];
const TILE_EDGE = [201, 194, 173];
const PIN = [31, 95, 168];
const RED = [184, 50, 42];

/** 角の丸い長方形の中か（中心 cx,cy、半幅 w、半高 h、角の半径 r） */
function inRoundRect(x, y, cx, cy, w, h, r) {
  const dx = Math.max(Math.abs(x - cx) - (w - r), 0);
  const dy = Math.max(Math.abs(y - cy) - (h - r), 0);
  return dx * dx + dy * dy <= r * r;
}

/** 0〜1 の座標で、その点の色 */
function colorAt(x, y) {
  const cx = 0.5;
  const cy = 0.5;
  const w = 0.24;
  const h = 0.32;
  if (!inRoundRect(x, y, cx, cy + 0.02, w, h, 0.05)) return FELT;
  // 牌の下の厚み
  if (!inRoundRect(x, y, cx, cy - 0.01, w, h - 0.01, 0.05)) return TILE_EDGE;
  const d = Math.hypot(x - cx, y - (cy - 0.01));
  if (d < 0.05) return RED;
  if (d < 0.09) return TILE;
  if (d < 0.17) return PIN;
  return TILE;
}

/** 4x4 で平均を取って、ふちをなめらかにする */
function render(size) {
  const ss = 4;
  const rows = [];
  for (let py = 0; py < size; py++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let px = 0; px < size; px++) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const c = colorAt((px + (sx + 0.5) / ss) / size, (py + (sy + 0.5) / ss) / size);
          for (let i = 0; i < 3; i++) sum[i] += c[i];
        }
      }
      for (let i = 0; i < 3; i++) row[1 + px * 3 + i] = Math.round(sum[i] / (ss * ss));
    }
    rows.push(row);
  }
  return Buffer.concat(rows);
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // ビット深度
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(render(size))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(new URL('../public/', import.meta.url), { recursive: true });
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(new URL(`../public/${name}`, import.meta.url), png(size));
  console.log(`public/${name}`);
}
