import { useEffect, useState } from 'react';
import { roundLabel } from '../../game/game';
import {
  computeStats,
  mergeImport,
  monthOf,
  months,
  nameOf,
  newId,
  parseImport,
  type ExportData,
  type GameRecord,
  type Member,
} from '../../records/records';
import { deleteGame, listGames, putGames } from '../../records/store';
import { describe } from '../game/GameTable';

type Tab = 'stats' | 'history' | 'members' | 'data';

const TABS: { tab: Tab; label: string }[] = [
  { tab: 'stats', label: '成績' },
  { tab: 'history', label: '履歴' },
  { tab: 'members', label: 'メンバー' },
  { tab: 'data', label: 'データ' },
];

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const scoreText = (n: number) => (n > 0 ? `+${n}` : String(n));
const scoreClass = (n: number) => (n > 0 ? 'plus' : n < 0 ? 'minus' : '');

interface Props {
  members: Member[];
  onMembersChange: (members: Member[]) => void;
}

export function RecordsView({ members, onMembersChange }: Props) {
  const [tab, setTab] = useState<Tab>('stats');
  const [games, setGames] = useState<GameRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = () =>
    listGames()
      .then(setGames)
      .catch(() => setError('成績を読み込めませんでした。ブラウザの設定で保存が止められていないか確かめてください'));
  useEffect(() => {
    reload();
  }, []);

  return (
    <div className="screen">
      <div className="targets" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.tab}
            type="button"
            role="tab"
            aria-selected={tab === t.tab}
            className={tab === t.tab ? 'active' : ''}
            onClick={() => setTab(t.tab)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {error && <p className="message">{error}</p>}
      {games === null && !error && <p className="hint">読み込み中…</p>}
      {games && tab === 'stats' && <StatsTab games={games} members={members} />}
      {games && tab === 'history' && (
        <HistoryTab
          games={games}
          members={members}
          onDelete={async (id) => {
            await deleteGame(id);
            await reload();
          }}
        />
      )}
      {tab === 'members' && <MembersTab members={members} games={games ?? []} onChange={onMembersChange} />}
      {games && tab === 'data' && (
        <DataTab
          games={games}
          members={members}
          onImport={async (data) => {
            const merged = mergeImport({ members, games }, data);
            await putGames(merged.newGames);
            onMembersChange(merged.members);
            await reload();
            return merged.newGames.length;
          }}
        />
      )}
    </div>
  );
}

function StatsTab({ games, members }: { games: GameRecord[]; members: Member[] }) {
  const [period, setPeriod] = useState('all');
  const filtered = period === 'all' ? games : games.filter((g) => monthOf(g) === period);
  const stats = computeStats(filtered, members);

  return (
    <>
      <label className="rules-row card">
        <span>期間</span>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="all">すべて</option>
          {months(games).map((m) => (
            <option key={m} value={m}>
              {m.replace('-', '年')}月
            </option>
          ))}
        </select>
      </label>
      {stats.length === 0 && <p className="hint">まだ成績がありません。対局が終わったら「成績に保存」を押してください</p>}
      {stats.map((s) => (
        <details key={s.id} className="card stat-card">
          <summary>
            <span className="stat-name">{s.name}</span>
            <span className="stat-games">{s.games}戦</span>
            <span className="stat-rank">平均 {s.avgRank.toFixed(2)}位</span>
            <span className={`stat-score ${scoreClass(s.totalScore)}`}>{scoreText(s.totalScore)}</span>
          </summary>
          <dl className="stat-detail">
            <dt>順位</dt>
            <dd>{s.rankCounts.map((n, i) => `${i + 1}位 ${n}回`).join('・')}</dd>
            <dt>トップ率・ラス率</dt>
            <dd>
              {pct(s.topRate)}・{pct(s.lastRate)}
            </dd>
            <dt>和了率</dt>
            <dd>
              {pct(s.winRate)}（{s.wins}/{s.hands}局）
            </dd>
            <dt>放銃率</dt>
            <dd>
              {pct(s.dealInRate)}（{s.dealIns}/{s.hands}局）
            </dd>
            <dt>平均打点</dt>
            <dd>{s.wins > 0 ? `${s.avgWinPoints.toLocaleString()}点` : '—'}</dd>
          </dl>
        </details>
      ))}
    </>
  );
}

function HistoryTab({
  games,
  members,
  onDelete,
}: {
  games: GameRecord[];
  members: Member[];
  onDelete: (id: string) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState<string | null>(null);
  if (games.length === 0) return <p className="hint">まだ対局の記録がありません</p>;

  return (
    <>
      {games.map((g) => {
        const name = (seat: number) => nameOf(g.playerIds[seat], members, games);
        const names = g.settings.players.map((_, seat) => name(seat));
        return (
          <details key={g.id} className="card stat-card">
            <summary className="history-summary">
              <span className="history-round">
                {new Date(g.finishedAt).toLocaleString('ja-JP', { dateStyle: 'medium', timeStyle: 'short' })}・
                {g.settings.length === 'east' ? '東風戦' : '東南戦'}
              </span>
              <span className="history-ranks">
                {g.ranking.map((r) => (
                  <span key={r.player}>
                    {r.rank}位 {name(r.player)} <span className={scoreClass(r.score)}>{scoreText(r.score)}</span>
                  </span>
                ))}
              </span>
            </summary>
            <table className="final-table">
              <tbody>
                {g.ranking.map((r) => (
                  <tr key={r.player}>
                    <td>{r.rank}位</td>
                    <td>{name(r.player)}</td>
                    <td>{r.points.toLocaleString()}</td>
                    <td className={scoreClass(r.score)}>{scoreText(r.score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ol className="history">
              {g.hands.map((h, i) => (
                <li key={i}>
                  <span className="history-round">{roundLabel(h.round)}</span>
                  <span>{describe(h, names)}</span>
                </li>
              ))}
            </ol>
            <div className="actions">
              {deleting === g.id ? (
                <>
                  <span className="hint">この対局の記録を消しますか？</span>
                  <button type="button" className="button" onClick={() => setDeleting(null)}>
                    いいえ
                  </button>
                  <button type="button" className="button danger" onClick={() => onDelete(g.id).then(() => setDeleting(null))}>
                    消す
                  </button>
                </>
              ) : (
                <button type="button" className="link" onClick={() => setDeleting(g.id)}>
                  この記録を消す
                </button>
              )}
            </div>
          </details>
        );
      })}
    </>
  );
}

function MembersTab({ members, games, onChange }: { members: Member[]; games: GameRecord[]; onChange: (m: Member[]) => void }) {
  const [newName, setNewName] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const trimmed = newName.trim();
  const exists = members.some((m) => m.name === trimmed);

  return (
    <section className="card">
      {members.length === 0 && <p className="hint">まだメンバーがいません。対局の設定で名前を入れても登録されます</p>}
      {members.map((m) => {
        const played = games.filter((g) => g.playerIds.includes(m.id)).length;
        return (
          <div key={m.id} className="name-row">
            <input
              type="text"
              defaultValue={m.name}
              maxLength={10}
              aria-label="名前"
              onBlur={(e) => {
                const name = e.target.value.trim();
                if (!name || members.some((x) => x.id !== m.id && x.name === name)) {
                  e.target.value = m.name;
                  return;
                }
                if (name !== m.name) onChange(members.map((x) => (x.id === m.id ? { ...x, name } : x)));
              }}
            />
            <span className="hint">{played}戦</span>
            {deleting === m.id ? (
              <button type="button" className="button danger" onClick={() => onChange(members.filter((x) => x.id !== m.id))}>
                消す
              </button>
            ) : (
              <button type="button" className="link" onClick={() => setDeleting(m.id)}>
                削除
              </button>
            )}
          </div>
        );
      })}
      <div className="name-row">
        <input type="text" value={newName} placeholder="新しいメンバーの名前" maxLength={10} onChange={(e) => setNewName(e.target.value)} />
        <button
          type="button"
          className="button"
          disabled={!trimmed || exists}
          onClick={() => {
            onChange([...members, { id: newId(), name: trimmed }]);
            setNewName('');
          }}
        >
          追加
        </button>
      </div>
      <p className="hint">名前は入力欄を離れたときに変わります。メンバーを消しても、過去の成績は残ります</p>
    </section>
  );
}

function DataTab({
  games,
  members,
  onImport,
}: {
  games: GameRecord[];
  members: Member[];
  onImport: (data: ExportData) => Promise<number>;
}) {
  const [message, setMessage] = useState<string | null>(null);

  const exportFile = () => {
    const data: ExportData = { app: 'mahjong-score', version: 1, exportedAt: new Date().toISOString(), members, games };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mahjong-score-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="card">
      <h2>書き出し</h2>
      <p className="hint">メンバーと成績（{games.length}戦）を1つのファイルにします。機種変更のときや、控えとして使います</p>
      <div className="actions">
        <button type="button" className="button primary" onClick={exportFile}>
          ファイルに書き出す
        </button>
      </div>
      <h2 className="section-gap">読み込み</h2>
      <p className="hint">書き出したファイルを読み込んで、今の成績に足します。同じ対局は2回入りません</p>
      <input
        type="file"
        accept="application/json,.json"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          try {
            const added = await onImport(parseImport(await file.text()));
            setMessage(`${added}戦を読み込みました`);
          } catch (err) {
            setMessage(err instanceof SyntaxError ? 'ファイルを読めませんでした' : (err as Error).message);
          }
        }}
      />
      {message && <p className="message">{message}</p>}
    </section>
  );
}
