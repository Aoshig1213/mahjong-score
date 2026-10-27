import { LIMIT_NAMES } from '../engine/points';
import type { CalcOutcome, Payment, ScoreResult } from '../engine/types';

const YAKUMAN_TIMES = ['', '役満', 'ダブル役満', 'トリプル役満'];

export function paymentText(p: Payment): string {
  switch (p.kind) {
    case 'ron':
      return `${p.amount.toLocaleString()}点`;
    case 'tsumo-dealer':
      return `${p.each.toLocaleString()}点オール`;
    case 'tsumo':
      return `子 ${p.nonDealer.toLocaleString()}点・親 ${p.dealer.toLocaleString()}点`;
  }
}

/** 「3翻40符」「4翻40符 満貫」「ダブル役満」など */
export function gradeText(r: ScoreResult): string {
  if (r.limit === 'yakuman') {
    const times = r.yakuman.reduce((sum, y) => sum + y.times, 0);
    return YAKUMAN_TIMES[times] ?? `${times}倍役満`;
  }
  const hanFu = r.han < 5 ? `${r.han}翻${r.fu}符` : `${r.han}翻`;
  return r.limit ? `${hanFu} ${LIMIT_NAMES[r.limit]}` : hanFu;
}

export function ResultView({ outcome }: { outcome: CalcOutcome }) {
  if (!outcome.ok) {
    return (
      <section className="result result-error" id="result">
        <p>{outcome.error}</p>
      </section>
    );
  }
  const r = outcome.result;
  const times = r.yakuman.reduce((sum, y) => sum + y.times, 0);
  const stamp = r.limit === 'yakuman' ? (YAKUMAN_TIMES[times] ?? `${times}倍役満`) : r.limit ? LIMIT_NAMES[r.limit] : null;
  return (
    <section className="result" id="result">
      {stamp && <span className="stamp">{stamp}</span>}
      <p className="result-points">{paymentText(r.payment)}</p>
      <p className="result-grade">
        {gradeText(r)}
        {r.payment.kind !== 'ron' && <span className="result-total">（合計 {r.payment.total.toLocaleString()}点）</span>}
      </p>

      <h3>役</h3>
      <table className="result-table">
        <tbody>
          {r.yakuman.map((y) => (
            <tr key={y.name}>
              <td>{y.name}</td>
              <td>{y.times === 2 ? 'ダブル役満' : '役満'}</td>
            </tr>
          ))}
          {r.yaku.map((y) => (
            <tr key={y.name}>
              <td>{y.name}</td>
              <td>{y.han}翻</td>
            </tr>
          ))}
          {r.dora > 0 && (
            <tr>
              <td>ドラ</td>
              <td>{r.dora}翻</td>
            </tr>
          )}
          {r.akaDora > 0 && (
            <tr>
              <td>赤ドラ</td>
              <td>{r.akaDora}翻</td>
            </tr>
          )}
          {r.uraDora > 0 && (
            <tr>
              <td>裏ドラ</td>
              <td>{r.uraDora}翻</td>
            </tr>
          )}
        </tbody>
      </table>

      {r.fuItems.length > 0 && (
        <>
          <h3>符</h3>
          <table className="result-table">
            <tbody>
              {r.fuItems.map((f, i) => (
                <tr key={i}>
                  <td>{f.label}</td>
                  <td>{f.fu}符</td>
                </tr>
              ))}
              <tr className="result-sum">
                <td>合計（10符単位に切り上げ）</td>
                <td>{r.fu}符</td>
              </tr>
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
