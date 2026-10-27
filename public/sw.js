// 通信がなくても開けるようにする。
// 画面（index.html）は通信できればいつも新しいものを取り、できなければ保存しておいたものを使う。
// JS・CSS・画像はファイル名に版が入っているので、一度取ったものを使い続ける。

// アイコンや manifest を変えたら版を上げる（古い保存が消えて、新しいものを取り直す）
const CACHE = 'mahjong-score-v5';
// 牌の絵柄（src/ui/tileImage.ts と同じファイル名）
const TILES = [
  ...['Man', 'Pin', 'Sou'].flatMap((s) => [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `${s}${n}`).concat(`${s}5-Dora`)),
  'Ton', 'Nan', 'Shaa', 'Pei', 'Haku', 'Hatsu', 'Chun',
].map((name) => `./tiles/${name}.svg`);
const SHELL = ['./', './manifest.webmanifest', './icon-192.png', './apple-touch-icon.png', ...TILES];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(SHELL.map((url) => new Request(url, { cache: 'no-cache' })));
      // 最初に開いたときの JS・CSS も保存しておく
      const html = await (await fetch('./', { cache: 'no-store' })).text();
      const assets = [...html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+)"/g)].map((m) => `./${m[1]}`);
      await cache.addAll(assets);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          // GitHub Pages は10分ほどブラウザに覚えさせるので、それを使わずにサーバーへ確かめる
          const res = await fetch(req.url, { cache: 'no-cache' });
          if (res.ok) await cache.put('./', res.clone());
          return res;
        } catch {
          return (await cache.match('./')) ?? Response.error();
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) await cache.put(req, res.clone());
      return res;
    })(),
  );
});
