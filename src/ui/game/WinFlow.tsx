import { useState } from 'react';
import { WIND_NAMES } from '../../engine/tiles';
import type { ScoreResult } from '../../engine/types';
import { byNearness, seatWind, settle, type Game, type HandEvent } from '../../game/game';
import { Calculator } from '../Calculator';
import { gradeText, paymentText } from '../ResultView';
import { DeltaTable, PlayerPicker, toggle } from './parts';

/** 責任払いがある役満 */
const PAO_YAKUMAN = ['大三元', '大四喜'];

type Step = { kind: 'who' } | { kind: 'hand'; index: number } | { kind: 'confirm' };

interface Props {
  game: Game;
  onApply: (event: HandEvent) => void;
  onCancel: () => void;
}

export function WinFlow({ game, onApply, onCancel }: Props) {
  const [step, setStep] = useState<Step>({ kind: 'who' });
  const [tsumo, setTsumo] = useState(false);
  const [winners, setWinners] = useState<number[]>([]);
  const [loser, setLoser] = useState<number | null>(null);
  const [riichi, setRiichi] = useState<number[]>([]);
  const [results, setResults] = useState<Record<number, ScoreResult>>({});
  const [pao, setPao] = useState<Record<number, number | undefined>>({});

  const names = game.settings.players;
  const { round } = game;
  // 本場と供託は、ロンなら放銃者に一番近い人が取る
  const ordered = tsumo || loser === null ? winners : byNearness(loser, winners);
  const ready = tsumo ? winners.length === 1 : winners.length >= 1 && loser !== null && !winners.includes(loser);

  const event: HandEvent = {
    kind: 'win',
    tsumo,
    loser: tsumo ? undefined : (loser ?? undefined),
    winners: ordered.filter((p) => results[p]).map((p) => ({ player: p, result: results[p], pao: pao[p] })),
    riichi,
  };

  if (step.kind === 'who') {
    return (
      <div className="screen">
        <FlowHeader title="和了" onBack={onCancel} />
        <section className="card">
          <h2>ロン・ツモ</h2>
          <div className="segmented">
            {[false, true].map((t) => (
              <button
                key={String(t)}
                type="button"
                className={tsumo === t ? 'active' : ''}
                onClick={() => {
                  setTsumo(t);
                  setWinners(t ? winners.slice(0, 1) : winners);
                }}
              >
                {t ? 'ツモ' : 'ロン'}
              </button>
            ))}
          </div>
        </section>
        <section className="card">
          <h2>和了した人{!tsumo && '（ダブロン・トリプルロンは複数選ぶ）'}</h2>
          <PlayerPicker
            game={game}
            selected={winners}
            disabled={tsumo || loser === null ? [] : [loser]}
            onToggle={(p) => setWinners(tsumo ? [p] : toggle(winners, p))}
          />
        </section>
        {!tsumo && (
          <section className="card">
            <h2>放銃した人</h2>
            <PlayerPicker game={game} selected={loser === null ? [] : [loser]} disabled={winners} onToggle={(p) => setLoser(p)} />
          </section>
        )}
        <section className="card">
          <h2>この局で立直した人</h2>
          <PlayerPicker game={game} selected={riichi} onToggle={(p) => setRiichi(toggle(riichi, p))} />
          <p className="hint">立直した人は1,000点を払い、和了した人が供託と一緒に受け取ります</p>
        </section>
        <div className="actions">
          <button type="button" className="button primary" disabled={!ready} onClick={() => setStep({ kind: 'hand', index: 0 })}>
            手牌の入力へ
          </button>
        </div>
      </div>
    );
  }

  if (step.kind === 'hand') {
    const p = ordered[step.index];
    const taker = step.index === 0;
    return (
      <div className="screen">
        <FlowHeader
          title={`${names[p]}の手牌${ordered.length > 1 ? `（${step.index + 1}/${ordered.length}）` : ''}`}
          onBack={() => setStep(step.index === 0 ? { kind: 'who' } : { kind: 'hand', index: step.index - 1 })}
        />
        <Calculator
          key={p}
          rules={game.settings.rules}
          context={{
            roundWind: round.wind,
            seatWind: seatWind(p, round),
            honba: taker ? round.honba : 0,
            tsumo,
            riichi: riichi.includes(p),
          }}
          onDone={(result) => {
            setResults({ ...results, [p]: result });
            setStep(step.index + 1 < ordered.length ? { kind: 'hand', index: step.index + 1 } : { kind: 'confirm' });
          }}
        />
      </div>
    );
  }

  const { deltas } = settle(game, event);
  return (
    <div className="screen">
      <FlowHeader title="確認" onBack={() => setStep({ kind: 'hand', index: ordered.length - 1 })} />
      {event.winners.map(({ player, result }) => {
        const canPao = result.yakuman.some((y) => PAO_YAKUMAN.includes(y.name));
        return (
          <section className="card" key={player}>
            <h2>
              <span className="chip-wind">{WIND_NAMES[seatWind(player, round)]}</span>
              {names[player]} {paymentText(result.payment)}
            </h2>
            <p className="summary-line">
              {gradeText(result)}：{[...result.yakuman.map((y) => y.name), ...result.yaku.map((y) => y.name)].join('・')}
            </p>
            {canPao && (
              <label className="rules-row">
                <span>責任払い（パオ）</span>
                <select
                  value={pao[player] ?? ''}
                  onChange={(e) => setPao({ ...pao, [player]: e.target.value === '' ? undefined : Number(e.target.value) })}
                >
                  <option value="">なし</option>
                  {names.map((n, q) =>
                    q === player ? null : (
                      <option key={q} value={q}>
                        {n}
                      </option>
                    ),
                  )}
                </select>
              </label>
            )}
          </section>
        );
      })}
      <section className="card">
        <h2>点数の増減</h2>
        <DeltaTable game={game} deltas={deltas} />
        {round.kyotaku + riichi.length > 0 && (
          <p className="hint">
            供託 {round.kyotaku + riichi.length}本（{((round.kyotaku + riichi.length) * 1000).toLocaleString()}点）は
            {names[ordered[0]]}が受け取ります（卓の精算に合わせて点数に入れています）
          </p>
        )}
      </section>
      <div className="actions">
        <button type="button" className="button primary" onClick={() => onApply(event)}>
          確定
        </button>
      </div>
    </div>
  );
}

export function FlowHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flow-header">
      <button type="button" className="link" onClick={onBack}>
        ‹ 戻る
      </button>
      <h2>{title}</h2>
    </div>
  );
}
