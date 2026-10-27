// 成績の記録と集計。画面と保存先からは切り離してある。

import { ranking, type Game, type GameSettings, type HandRecord } from '../game/game';

export interface Member {
  id: string;
  name: string;
}

export interface GameRecord {
  id: string;
  /** 終局した日時（ISO 形式） */
  finishedAt: string;
  settings: GameSettings;
  /** 席順（起家から）のメンバーID */
  playerIds: string[];
  ranking: ReturnType<typeof ranking>;
  hands: HandRecord[];
}

export interface PlayerStats {
  id: string;
  name: string;
  games: number;
  /** 1位〜4位の回数 */
  rankCounts: number[];
  avgRank: number;
  topRate: number;
  lastRate: number;
  totalScore: number;
  hands: number;
  wins: number;
  dealIns: number;
  winRate: number;
  dealInRate: number;
  /** 和了したときの平均の点数（本場込み） */
  avgWinPoints: number;
}

/** http の画面（スマホから開発用サーバーを開くときなど）でも使える ID */
export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildRecord(game: Game, now = new Date()): GameRecord {
  return {
    id: newId(),
    finishedAt: now.toISOString(),
    settings: game.settings,
    playerIds: game.settings.playerIds ?? game.settings.players,
    ranking: ranking(game),
    hands: game.records,
  };
}

/** 「2026-10」の形。日本時間など、端末の時刻で区切る */
export function monthOf(record: GameRecord): string {
  const d = new Date(record.finishedAt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function months(records: GameRecord[]): string[] {
  return [...new Set(records.map(monthOf))].sort().reverse();
}

/** メンバーの名前。消したメンバーなら、記録に残っている名前 */
export function nameOf(id: string, members: Member[], records: GameRecord[]): string {
  const member = members.find((m) => m.id === id);
  if (member) return member.name;
  for (const r of records) {
    const seat = r.playerIds.indexOf(id);
    if (seat >= 0) return r.settings.players[seat];
  }
  return id;
}

const rate = (n: number, d: number) => (d === 0 ? 0 : n / d);

/** 人ごとの成績。合計スコアの高い順 */
export function computeStats(records: GameRecord[], members: Member[]): PlayerStats[] {
  const byId = new Map<string, PlayerStats>();
  const get = (id: string) => {
    let s = byId.get(id);
    if (!s) {
      s = {
        id,
        name: nameOf(id, members, records),
        games: 0,
        rankCounts: [0, 0, 0, 0],
        avgRank: 0,
        topRate: 0,
        lastRate: 0,
        totalScore: 0,
        hands: 0,
        wins: 0,
        dealIns: 0,
        winRate: 0,
        dealInRate: 0,
        avgWinPoints: 0,
      };
      byId.set(id, s);
    }
    return s;
  };

  const winPoints = new Map<string, number>();
  for (const record of records) {
    record.playerIds.forEach((id, seat) => {
      const s = get(id);
      const r = record.ranking.find((x) => x.player === seat)!;
      s.games++;
      s.rankCounts[r.rank - 1]++;
      s.totalScore += r.score;
      s.hands += record.hands.length;
      for (const hand of record.hands) {
        const e = hand.event;
        if (e.kind !== 'win') continue;
        const win = e.winners.find((w) => w.player === seat);
        if (win) {
          s.wins++;
          winPoints.set(id, (winPoints.get(id) ?? 0) + win.result.payment.total);
        }
        if (!e.tsumo && e.loser === seat) s.dealIns++;
      }
    });
  }

  for (const s of byId.values()) {
    s.totalScore = Math.round(s.totalScore * 10) / 10;
    s.avgRank = rate(s.rankCounts.reduce((sum, n, i) => sum + n * (i + 1), 0), s.games);
    s.topRate = rate(s.rankCounts[0], s.games);
    s.lastRate = rate(s.rankCounts[3], s.games);
    s.winRate = rate(s.wins, s.hands);
    s.dealInRate = rate(s.dealIns, s.hands);
    s.avgWinPoints = Math.round(rate(winPoints.get(s.id) ?? 0, s.wins));
  }
  return [...byId.values()].sort((a, b) => b.totalScore - a.totalScore);
}

/** 書き出すファイルの中身 */
export interface ExportData {
  app: 'mahjong-score';
  version: 1;
  exportedAt: string;
  members: Member[];
  games: GameRecord[];
}

export function parseImport(text: string): ExportData {
  const data = JSON.parse(text) as ExportData;
  if (data?.app !== 'mahjong-score' || data.version !== 1 || !Array.isArray(data.members) || !Array.isArray(data.games)) {
    throw new Error('このアプリで書き出したファイルではありません');
  }
  return data;
}

/** 読み込んだデータを今のデータに足す。同じIDのものは今のものを残す */
export function mergeImport(
  current: { members: Member[]; games: GameRecord[] },
  data: ExportData,
): { members: Member[]; newGames: GameRecord[] } {
  const memberIds = new Set(current.members.map((m) => m.id));
  const gameIds = new Set(current.games.map((g) => g.id));
  return {
    members: [...current.members, ...data.members.filter((m) => !memberIds.has(m.id))],
    newGames: data.games.filter((g) => !gameIds.has(g.id)),
  };
}
