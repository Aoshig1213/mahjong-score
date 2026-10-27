// ホーム画面用のアイコン（PNG）を描いて public\ に書き出す。
// 絵柄: 緑の卓の上に、中・一筒・一索の3枚を扇形に並べる。牌の絵柄は public\tiles\ の画像と同じ。
//   node scripts/make-icons.mjs

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { tileFileName } from '../src/ui/tileImage.ts';

/** 牌の絵柄の画像を、SVG の中に埋め込める形にする */
function tileFace(code) {
  const svg = readFileSync(new URL(`../public/tiles/${tileFileName(code)}`, import.meta.url));
  return `data:image/svg+xml;base64,${svg.toString('base64')}`;
}

/** 牌1枚。中心 (cx, cy)、幅 w、傾き rot 度 */
function tile(code, cx, cy, w, rot) {
  const h = w * 1.36;
  const x = -w / 2;
  const y = -h / 2;
  const r = w * 0.12;
  return `
  <g transform="translate(${cx} ${cy}) rotate(${rot})">
    <rect x="${x + 6}" y="${y + h * 0.1}" width="${w}" height="${h}" rx="${r}" fill="#000" opacity="0.28" filter="url(#blur)"/>
    <rect x="${x}" y="${y + h * 0.075}" width="${w}" height="${h}" rx="${r}" fill="#0f6a42"/>
    <rect x="${x}" y="${y + h * 0.04}" width="${w}" height="${h}" rx="${r}" fill="#e6dcc0"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#face)" stroke="#d6caa8" stroke-width="2"/>
    <image x="${x + w * 0.04}" y="${y + h * 0.03}" width="${w * 0.92}" height="${h * 0.94}" preserveAspectRatio="xMidYMid meet" href="${tileFace(code)}"/>
  </g>`;
}

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="felt" cx="50%" cy="42%" r="70%">
      <stop offset="0" stop-color="#2f8a5a"/>
      <stop offset="1" stop-color="#0f3f28"/>
    </radialGradient>
    <linearGradient id="face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fffdf6"/>
      <stop offset="1" stop-color="#f3ecd8"/>
    </linearGradient>
    <filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8"/></filter>
  </defs>
  <rect width="512" height="512" fill="url(#felt)"/>
  <circle cx="256" cy="236" r="190" fill="none" stroke="#d9b45a" stroke-width="3" opacity="0.35"/>
  ${tile('1p', 168, 262, 132, -17)}
  ${tile('1s', 344, 262, 132, 17)}
  ${tile('7z', 256, 236, 150, 0)}
</svg>`;

function render(size) {
  return new Resvg(SVG, {
    fitTo: { mode: 'width', value: size },
  })
    .render()
    .asPng();
}

mkdirSync(new URL('../public/', import.meta.url), { recursive: true });
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(new URL(`../public/${name}`, import.meta.url), render(size));
  console.log(`public/${name}`);
}
