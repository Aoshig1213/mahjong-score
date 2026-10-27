import { useState } from 'react';
import { WIND_NAMES } from '../../engine/tiles';
import type { Rules } from '../../engine/types';
import type { GameSettings } from '../../game/game';
import { newId, type Member } from '../../records/records';
import { loadLastPlayers } from './storage';

const UMA_OPTIONS: { label: string; value: [number, number] }[] = [
  { label: 'なし', value: [0, 0] },
  { label: '5-10', value: [5, 10] },
  { label: '10-20', value: [10, 20] },
  { label: '10-30', value: [10, 30] },
  { label: '20-30', value: [20, 30] },
];

const POINTS = [25000, 30000];

/** 席に座る人。id が空なら、まだ登録していない人（name に入力中の名前） */
interface Seat {
  id: string;
  name: string;
}

interface Props {
  rules: Rules;
  members: Member[];
  onStart: (settings: GameSettings, members: Member[]) => void;
  onCancel: () => void;
}

/** 前回の4人を席に入れる。前回の記録が名前だけなら名前でメンバーを探す */
function initialSeats(members: Member[]): Seat[] {
  const last = loadLastPlayers() ?? [];
  return [0, 1, 2, 3].map((i) => {
    const m = members.find((x) => x.id === last[i]) ?? members.find((x) => x.name === last[i]);
    return m ? { id: m.id, name: m.name } : { id: '', name: '' };
  });
}

export function GameSetup({ rules, members, onStart, onCancel }: Props) {
  const [seats, setSeats] = useState<Seat[]>(() => initialSeats(members));
  const [length, setLength] = useState<GameSettings['length']>('south');
  const [startPoints, setStartPoints] = useState(25000);
  const [returnPoints, setReturnPoints] = useState(25000);
  const [uma, setUma] = useState('10-20');
  const [tobi, setTobi] = useState(true);

  const names = seats.map((s) => (s.id ? members.find((m) => m.id === s.id)!.name : s.name.trim()));
  const empty = names.some((n) => !n);
  const duplicated = new Set(names.filter(Boolean)).size < names.filter(Boolean).length;

  const setSeat = (i: number, seat: Seat) => setSeats(seats.map((s, j) => (j === i ? seat : s)));

  const start = () => {
    // 新しい名前はメンバーに登録する（同じ名前のメンバーがいればその人にする）
    const all = [...members];
    const ids = names.map((name) => {
      const found = all.find((m) => m.name === name);
      if (found) return found.id;
      const m = { id: newId(), name };
      all.push(m);
      return m.id;
    });
    onStart(
      {
        players: names,
        playerIds: ids,
        length,
        startPoints,
        returnPoints: Math.max(returnPoints, startPoints),
        uma: UMA_OPTIONS.find((o) => o.label === uma)!.value,
        tobi,
        rules,
      },
      all,
    );
  };

  return (
    <div className="screen">
      <section className="card">
        <h2>席（起家から順に）</h2>
        {seats.map((seat, i) => {
          const taken = seats.filter((_, j) => j !== i).map((s) => s.id);
          return (
            <div key={i} className="name-row">
              <span className="chip-wind">{WIND_NAMES[i]}</span>
              <select
                value={seat.id}
                aria-label={`${WIND_NAMES[i]}家`}
                onChange={(e) => setSeat(i, { id: e.target.value, name: '' })}
              >
                <option value="">新しい人</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id} disabled={taken.includes(m.id)}>
                    {m.name}
                  </option>
                ))}
              </select>
              {!seat.id && (
                <input
                  type="text"
                  value={seat.name}
                  placeholder="名前"
                  maxLength={10}
                  onChange={(e) => setSeat(i, { id: '', name: e.target.value })}
                />
              )}
            </div>
          );
        })}
        {duplicated && <p className="message">同じ人が2つの席にいます</p>}
        <p className="hint">新しい人は、対局を始めるとメンバーに登録されます</p>
      </section>

      <section className="card">
        <label className="rules-row">
          <span>長さ</span>
          <select value={length} onChange={(e) => setLength(e.target.value as GameSettings['length'])}>
            <option value="east">東風戦</option>
            <option value="south">東南戦</option>
          </select>
        </label>
        <label className="rules-row">
          <span>持ち点</span>
          <select value={startPoints} onChange={(e) => setStartPoints(Number(e.target.value))}>
            {POINTS.map((p) => (
              <option key={p} value={p}>
                {p.toLocaleString()}点
              </option>
            ))}
          </select>
        </label>
        <label className="rules-row">
          <span>返し</span>
          <select value={returnPoints} onChange={(e) => setReturnPoints(Number(e.target.value))}>
            {POINTS.map((p) => (
              <option key={p} value={p}>
                {p.toLocaleString()}点
              </option>
            ))}
          </select>
        </label>
        <label className="rules-row">
          <span>ウマ</span>
          <select value={uma} onChange={(e) => setUma(e.target.value)}>
            {UMA_OPTIONS.map((o) => (
              <option key={o.label} value={o.label}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="rules-row">
          <span>飛び（0点未満で終了）</span>
          <input type="checkbox" checked={tobi} onChange={(e) => setTobi(e.target.checked)} />
        </label>
        {returnPoints < startPoints && <p className="hint">返しが持ち点より少ないので、持ち点と同じにします</p>}
        <p className="hint">役のルール（喰いタンなど）はホームの「ルール」で変えられます</p>
      </section>

      <div className="actions">
        <button type="button" className="button" onClick={onCancel}>
          戻る
        </button>
        <button type="button" className="button primary" disabled={empty || duplicated} onClick={start}>
          対局を始める
        </button>
      </div>
    </div>
  );
}
