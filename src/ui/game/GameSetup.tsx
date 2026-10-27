import { useState } from 'react';
import { WIND_NAMES } from '../../engine/tiles';
import type { Rules } from '../../engine/types';
import type { GameSettings } from '../../game/game';
import { loadLastPlayers } from './storage';

const UMA_OPTIONS: { label: string; value: [number, number] }[] = [
  { label: 'なし', value: [0, 0] },
  { label: '5-10', value: [5, 10] },
  { label: '10-20', value: [10, 20] },
  { label: '10-30', value: [10, 30] },
  { label: '20-30', value: [20, 30] },
];

const POINTS = [25000, 30000];

interface Props {
  rules: Rules;
  onStart: (settings: GameSettings) => void;
  onCancel: () => void;
}

export function GameSetup({ rules, onStart, onCancel }: Props) {
  const [players, setPlayers] = useState<string[]>(() => loadLastPlayers() ?? ['', '', '', '']);
  const [length, setLength] = useState<GameSettings['length']>('south');
  const [startPoints, setStartPoints] = useState(25000);
  const [returnPoints, setReturnPoints] = useState(25000);
  const [uma, setUma] = useState('10-20');
  const [tobi, setTobi] = useState(true);

  const names = players.map((n, i) => n.trim() || `${WIND_NAMES[i]}家`);
  const duplicated = new Set(names).size < 4;

  const start = () =>
    onStart({
      players: names,
      length,
      startPoints,
      returnPoints: Math.max(returnPoints, startPoints),
      uma: UMA_OPTIONS.find((o) => o.label === uma)!.value,
      tobi,
      rules,
    });

  return (
    <div className="screen">
      <section className="card">
        <h2>席（起家から順に）</h2>
        {players.map((name, i) => (
          <label key={i} className="name-row">
            <span className="chip-wind">{WIND_NAMES[i]}</span>
            <input
              type="text"
              value={name}
              placeholder={`${WIND_NAMES[i]}家`}
              maxLength={10}
              onChange={(e) => setPlayers(players.map((n, j) => (j === i ? e.target.value : n)))}
            />
          </label>
        ))}
        {duplicated && <p className="message">同じ名前の人がいます</p>}
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
        <button type="button" className="button primary" disabled={duplicated} onClick={start}>
          対局を始める
        </button>
      </div>
    </div>
  );
}
