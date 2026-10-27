// 成績はブラウザの IndexedDB、メンバーは localStorage に保存する。
// どちらもこの端末のこのブラウザの中だけにあるので、機種変更のときは書き出し・読み込みで移す。

import type { GameRecord, Member } from './records';

const DB_NAME = 'mahjong-score';
const STORE = 'games';
const MEMBERS_KEY = 'mahjong-score.members';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function listGames(): Promise<GameRecord[]> {
  const games = (await run<GameRecord[]>('readonly', (s) => s.getAll())) ?? [];
  return games.sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
}

export async function putGames(games: GameRecord[]): Promise<void> {
  await run('readwrite', (s) => {
    for (const g of games) s.put(g);
  });
}

export async function deleteGame(id: string): Promise<void> {
  await run('readwrite', (s) => s.delete(id));
}

export function loadMembers(): Member[] {
  try {
    return JSON.parse(localStorage.getItem(MEMBERS_KEY) ?? '[]') as Member[];
  } catch {
    return [];
  }
}

export function saveMembers(members: Member[]): void {
  try {
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
  } catch {
    // 保存できなくても、開いている間は使える
  }
}
