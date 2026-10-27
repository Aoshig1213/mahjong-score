import type { Game } from '../../game/game';

// 途中の対局はブラウザに保存しておき、閉じても続きから再開できるようにする。
// 成績の記録（4）はここではなく別に保存する。

const GAME_KEY = 'mahjong-score.game';
const PLAYERS_KEY = 'mahjong-score.lastPlayers';

export interface SavedGame {
  game: Game;
  /** 1局戻すための、前の局の状態 */
  past: Game[];
}

function read<T>(key: string): T | null {
  try {
    const text = localStorage.getItem(key);
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 保存できなくても、開いている間は使える
  }
}

export const loadGame = () => read<SavedGame>(GAME_KEY);
export const saveGame = (saved: SavedGame | null) => write(GAME_KEY, saved);
export const loadLastPlayers = () => read<string[]>(PLAYERS_KEY);
export const saveLastPlayers = (players: string[]) => write(PLAYERS_KEY, players);
