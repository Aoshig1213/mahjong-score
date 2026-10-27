import { useState } from 'react';
import { WIND_NAMES } from '../../engine/tiles';
import { ranking, roundLabel, seatWind, type Game, type HandRecord } from '../../game/game';
import { paymentText } from '../ResultView';
import { signed } from './parts';

interface Props {
  game: Game;
  canUndo: boolean;
  onWin: () => void;
  onDraw: () => void;
  onAbort: () => void;
  onUndo: () => void;
  onEndByDealer: () => void;
  onContinueByDealer: () => void;
  onFixScores: (scores: number[]) => void;
  onSave: () => void;
  /** 保存している途中 */
  saving: boolean;
  onQuit: () => void;
}

export function describe(record: HandRecord, names: string[]): string {
  const e = record.event;
  if (e.kind === 'win') {
    const who = e.winners.map((w) => `${names[w.player]} ${paymentText(w.result.payment)}`).join('、');
    return e.tsumo ? `ツモ：${who}` : `ロン（${names[e.loser!]}が放銃）：${who}`;
  }
  if (e.kind === 'abort') return `途中流局（${e.reason}）`;
  if (e.nagashi.length > 0) return `流し満貫：${e.nagashi.map((p) => names[p]).join('、')}`;
  return e.tenpai.length === 0 ? '流局（全員ノーテン）' : `流局（テンパイ：${e.tenpai.map((p) => names[p]).join('、')}）`;
}

export function GameTable(props: Props) {
  const { game } = props;
  const [confirmQuit, setConfirmQuit] = useState(false);
  const names = game.settings.players;
  const { round, status } = game;
  const finished = status === 'finished';

  return (
    <div className="screen">
      {finished ? (
        <FinalResult game={game} onFixScores={props.onFixScores} />
      ) : (
        <TableView game={game} />
      )}

      {status === 'dealerMayEnd' && (
        <section className="card notice">
          <p>オーラスで親（{names[round.kyoku]}）がトップです。ここで終わりますか？</p>
          <div className="actions">
            <button type="button" className="button" onClick={props.onContinueByDealer}>
              続ける
            </button>
            <button type="button" className="button primary" onClick={props.onEndByDealer}>
              終わる
            </button>
          </div>
        </section>
      )}

      {status === 'playing' && (
        <div className="table-actions">
          <button type="button" className="button primary big" onClick={props.onWin}>
            和了
          </button>
          <button type="button" className="button big" onClick={props.onDraw}>
            流局
          </button>
          <button type="button" className="button" onClick={props.onAbort}>
            途中流局
          </button>
          <button type="button" className="button" disabled={!props.canUndo} onClick={props.onUndo}>
            1局戻す
          </button>
        </div>
      )}
      {finished && props.canUndo && (
        <div className="actions">
          <button type="button" className="button" onClick={props.onUndo}>
            最後の局を直す（1局戻す）
          </button>
        </div>
      )}

      {game.records.length > 0 && (
        <section className="card">
          <h2>これまでの局</h2>
          <ol className="history">
            {[...game.records].reverse().map((r, i) => (
              <li key={game.records.length - i}>
                <span className="history-round">{roundLabel(r.round)}</span>
                <span>{describe(r, names)}</span>
                <span className="history-deltas">
                  {r.deltas.map((d, p) => (d === 0 ? null : <span key={p} className={d > 0 ? 'plus' : 'minus'}>{`${names[p]} ${signed(d)}`}</span>))}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="actions">
        {finished && !confirmQuit ? (
          <>
            <button type="button" className="link" onClick={() => setConfirmQuit(true)}>
              保存しないで終わる
            </button>
            <button type="button" className="button primary" disabled={props.saving} onClick={props.onSave}>
              成績に保存
            </button>
          </>
        ) : confirmQuit ? (
          <>
            <span className="hint">{finished ? '成績に残さずに終わりますか？' : 'この対局を消してやめますか？'}</span>
            <button type="button" className="button" onClick={() => setConfirmQuit(false)}>
              いいえ
            </button>
            <button type="button" className="button danger" onClick={props.onQuit}>
              やめる
            </button>
          </>
        ) : (
          <button type="button" className="link" onClick={() => setConfirmQuit(true)}>
            対局をやめる
          </button>
        )}
      </div>
    </div>
  );
}

/** 起家を手前に、席順（反時計回り）に右・向かい・左と座らせる */
const SEAT_POSITIONS = ['bottom', 'right', 'top', 'left'] as const;

function TableView({ game }: { game: Game }) {
  const { round, scores } = game;
  const order = ranking(game);
  return (
    <section className="table-view" aria-label="卓">
      {game.settings.players.map((name, p) => {
        const dealer = p === round.kyoku;
        const rank = order.find((r) => r.player === p)!.rank;
        return (
          <div key={p} className={`seat seat-${SEAT_POSITIONS[p]}${dealer ? ' dealer' : ''}`}>
            <div className="seat-head">
              <span className="chip-wind">{WIND_NAMES[seatWind(p, round)]}</span>
              <span className="seat-name">{name}</span>
              {dealer && <span className="dealer-mark">親</span>}
            </div>
            <span className={scores[p] < 0 ? 'led minus' : 'led'}>{scores[p].toLocaleString()}</span>
            <span className="seat-rank">{rank}位</span>
          </div>
        );
      })}
      <div className="table-center">
        <span className="center-round">
          {WIND_NAMES[round.wind]}
          {round.kyoku + 1}局
        </span>
        <div className="sticks">
          <span className="stick-row" aria-label={`${round.honba}本場`}>
            <span className="stick stick-100" />
            <span className="stick-count">×{round.honba}</span>
          </span>
          <span className="stick-row" aria-label={`供託${round.kyotaku}本`}>
            <span className="stick stick-1000" />
            <span className="stick-count">×{round.kyotaku}</span>
          </span>
        </div>
      </div>
    </section>
  );
}

function FinalResult({ game, onFixScores }: { game: Game; onFixScores: (scores: number[]) => void }) {
  const names = game.settings.players;
  const [editing, setEditing] = useState<string[] | null>(null);

  if (editing) {
    const values = editing.map((v) => Number(v));
    const valid = values.every((v) => Number.isInteger(v) && v % 100 === 0);
    const sum = values.reduce((a, b) => a + b, 0);
    const expected = game.settings.startPoints * 4;
    return (
      <section className="card">
        <h2>卓の点数に合わせる</h2>
        {names.map((name, p) => (
          <label key={p} className="name-row">
            <span className="score-name">{name}</span>
            <input
              type="number"
              inputMode="numeric"
              step={100}
              value={editing[p]}
              onChange={(e) => setEditing(editing.map((v, i) => (i === p ? e.target.value : v)))}
            />
          </label>
        ))}
        {!valid && <p className="message">100点単位の数を入れてください</p>}
        {valid && sum !== expected && (
          <p className="message">
            合計が{sum.toLocaleString()}点です（{expected.toLocaleString()}点になるはずです）
          </p>
        )}
        <div className="actions">
          <button type="button" className="button" onClick={() => setEditing(null)}>
            やめる
          </button>
          <button
            type="button"
            className="button primary"
            disabled={!valid}
            onClick={() => {
              onFixScores(values);
              setEditing(null);
            }}
          >
            この点数にする
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="result">
      <h2 className="final-title">終局</h2>
      <table className="final-table">
        <thead>
          <tr>
            <th>順位</th>
            <th></th>
            <th>点数</th>
            <th>スコア</th>
          </tr>
        </thead>
        <tbody>
          {ranking(game).map((r) => (
            <tr key={r.player} className={`rank-${r.rank}`}>
              <td>{r.rank}位</td>
              <td>{names[r.player]}</td>
              <td>{r.points.toLocaleString()}</td>
              <td className={r.score > 0 ? 'plus' : r.score < 0 ? 'minus' : ''}>{r.score > 0 ? `+${r.score}` : r.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">
        スコア =（点数 − 返し{game.settings.returnPoints.toLocaleString()}）÷ 1000 ＋ ウマ {game.settings.uma.join('-')}
      </p>
      <button type="button" className="link" onClick={() => setEditing(game.scores.map(String))}>
        卓の点数と違うときは直す
      </button>
    </section>
  );
}
