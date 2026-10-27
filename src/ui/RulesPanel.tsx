import type { Rules } from '../engine/types';

const SWITCHES: { key: Exclude<keyof Rules, 'doubleWindPairFu'>; label: string }[] = [
  { key: 'kuitan', label: '喰いタン' },
  { key: 'doubleYakuman', label: 'ダブル役満・役満の複合' },
  { key: 'kiriageMangan', label: '切り上げ満貫' },
  { key: 'kazoeYakuman', label: '数え役満' },
];

export function RulesPanel({ rules, onChange }: { rules: Rules; onChange: (rules: Rules) => void }) {
  return (
    <details className="rules">
      <summary>ルール</summary>
      {SWITCHES.map(({ key, label }) => (
        <label key={key} className="rules-row">
          <span>{label}</span>
          <input type="checkbox" checked={rules[key]} onChange={(e) => onChange({ ...rules, [key]: e.target.checked })} />
        </label>
      ))}
      <label className="rules-row">
        <span>連風牌の雀頭</span>
        <select
          value={rules.doubleWindPairFu}
          onChange={(e) => onChange({ ...rules, doubleWindPairFu: Number(e.target.value) as 2 | 4 })}
        >
          <option value={2}>2符</option>
          <option value={4}>4符</option>
        </select>
      </label>
    </details>
  );
}
