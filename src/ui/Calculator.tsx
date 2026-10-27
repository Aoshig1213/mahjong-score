import { useMemo, useReducer } from 'react';
import { calculate } from '../engine/calculate';
import { WIND_NAMES, tileId } from '../engine/tiles';
import type { Meld, Rules, ScoreResult, Wind } from '../engine/types';
import {
  FLAG_NAMES,
  INITIAL_STATE,
  type CalcState,
  enabledFlags,
  handCapacity,
  reducer,
  remaining,
  toInput,
  type Flag,
  type Target,
} from './calcState';
import { ResultView, gradeText, paymentText } from './ResultView';
import { Tile } from './Tile';
import { TilePalette } from './TilePalette';

const TARGETS: { target: Target; label: string }[] = [
  { target: 'hand', label: '手牌' },
  { target: 'win', label: '和了牌' },
  { target: 'chi', label: 'チー' },
  { target: 'pon', label: 'ポン' },
  { target: 'minkan', label: '明槓' },
  { target: 'ankan', label: '暗槓' },
  { target: 'dora', label: 'ドラ表示' },
  { target: 'uraDora', label: '裏ドラ表示' },
];

const MELD_NAMES: Record<Meld['type'], string> = { chi: 'チー', pon: 'ポン', minkan: '明槓', ankan: '暗槓' };

const FLAGS: Flag[] = ['riichi', 'doubleRiichi', 'ippatsu', 'haitei', 'houtei', 'rinshan', 'chankan', 'tenhou', 'chiihou'];

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={o.value === value ? 'active' : ''}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const winds = (n: number) => WIND_NAMES.slice(0, n).map((label, i) => ({ value: i as Wind, label }));

/** 対局の中で使うときに、対局の状態から決まる値 */
export interface CalcContext {
  roundWind: Wind;
  seatWind: Wind;
  honba: number;
  tsumo: boolean;
  /** 局の入力で立直したと選んだか */
  riichi: boolean;
}

function initialState(context?: CalcContext): CalcState {
  if (!context) return INITIAL_STATE;
  const { riichi, ...rest } = context;
  return { ...INITIAL_STATE, ...rest, flags: { ...INITIAL_STATE.flags, riichi } };
}

interface Props {
  rules: Rules;
  context?: CalcContext;
  /** 渡すと「この点数で決定」を出す */
  onDone?: (result: ScoreResult) => void;
}

export function Calculator({ rules, context, onDone }: Props) {
  const [state, dispatch] = useReducer(reducer, context, initialState);
  const base = enabledFlags(state);
  // 対局の中では、立直したかどうかは局の入力で決めたものに合わせる
  const enabled =
    context && !context.riichi ? { ...base, riichi: false, doubleRiichi: false, ippatsu: false } : base;
  const riichi = enabled.riichi && (state.flags.riichi || state.flags.doubleRiichi);
  const capacity = handCapacity(state.melds);

  const input = toInput(state);
  const outcome = useMemo(() => (input ? calculate(input, rules) : null), [JSON.stringify(input), rules]);
  const missing = capacity - state.hand.length + (state.win ? 0 : 1);

  const sortedHand = state.hand
    .map((tile, index) => ({ tile, index }))
    .sort((a, b) => tileId(a.tile) - tileId(b.tile) || (a.tile[0] === '0' ? 1 : 0) - (b.tile[0] === '0' ? 1 : 0));

  const targets = TARGETS.filter((t) => t.target !== 'uraDora' || riichi);

  return (
    <div className="calculator">
      {context ? (
        <p className="context-line">
          場風 {WIND_NAMES[context.roundWind]}・自風 {WIND_NAMES[context.seatWind]}（{context.seatWind === 0 ? '親' : '子'}）・
          {context.tsumo ? 'ツモ' : 'ロン'}・{context.honba}本場
        </p>
      ) : (
      <section className="card">
        <div className="field">
          <span className="field-label">場風</span>
          <Segmented options={winds(2)} value={state.roundWind} onChange={(v) => dispatch({ type: 'set', patch: { roundWind: v } })} />
        </div>
        <div className="field">
          <span className="field-label">自風</span>
          <Segmented options={winds(4)} value={state.seatWind} onChange={(v) => dispatch({ type: 'set', patch: { seatWind: v } })} />
          <span className="field-note">{state.seatWind === 0 ? '親' : '子'}</span>
        </div>
        <div className="field">
          <span className="field-label">和了</span>
          <Segmented
            options={[
              { value: 'ron', label: 'ロン' },
              { value: 'tsumo', label: 'ツモ' },
            ]}
            value={state.tsumo ? 'tsumo' : 'ron'}
            onChange={(v) => dispatch({ type: 'set', patch: { tsumo: v === 'tsumo' } })}
          />
        </div>
        <div className="field">
          <span className="field-label">本場</span>
          <div className="stepper">
            <button type="button" aria-label="本場を減らす" onClick={() => dispatch({ type: 'set', patch: { honba: Math.max(0, state.honba - 1) } })}>
              −
            </button>
            <span>{state.honba}</span>
            <button type="button" aria-label="本場を増やす" onClick={() => dispatch({ type: 'set', patch: { honba: state.honba + 1 } })}>
              ＋
            </button>
          </div>
        </div>
      </section>
      )}

      <section className="card">
        <div className="card-head">
          <h2>
            手牌 <span className="count">{state.hand.length}/{capacity}</span>
          </h2>
          <button type="button" className="link" onClick={() => dispatch({ type: 'clear' })}>
            全部消す
          </button>
        </div>
        <div className="rack">
        <div className="hand">
          <div className="hand-tiles">
            {sortedHand.map(({ tile, index }) => (
              <Tile key={index} tile={tile} size="sm" onClick={() => dispatch({ type: 'removeHand', index })} />
            ))}
          </div>
          <div className="hand-win">
            {state.win ? (
              <Tile tile={state.win} size="sm" highlight onClick={() => dispatch({ type: 'removeWin' })} />
            ) : (
              <span className="tile-empty" />
            )}
            <span className="hand-win-label">和了牌</span>
          </div>
        </div>
        {state.melds.length > 0 && (
          <div className="melds">
            {state.melds.map((m, i) => (
              <button type="button" key={i} className="meld" onClick={() => dispatch({ type: 'removeMeld', index: i })}>
                <span className="meld-label">{MELD_NAMES[m.type]}</span>
                {m.tiles.map((t, j) => (
                  <Tile key={j} tile={t} size="sm" />
                ))}
              </button>
            ))}
          </div>
        )}
        </div>
        <div className="indicators">
          <span className="field-label">ドラ表示</span>
          {state.dora.map((t, i) => (
            <Tile key={i} tile={t} size="sm" onClick={() => dispatch({ type: 'removeDora', kind: 'dora', index: i })} />
          ))}
          {riichi && (
            <>
              <span className="field-label">裏ドラ表示</span>
              {state.uraDora.map((t, i) => (
                <Tile key={i} tile={t} size="sm" onClick={() => dispatch({ type: 'removeDora', kind: 'uraDora', index: i })} />
              ))}
            </>
          )}
        </div>
        <p className="hint">牌をタップすると消せます</p>
      </section>

      <section className="card input-card">
        <div className="targets" role="tablist">
          {targets.map((t) => (
            <button
              key={t.target}
              type="button"
              role="tab"
              aria-selected={state.target === t.target}
              className={state.target === t.target ? 'active' : ''}
              onClick={() => dispatch({ type: 'setTarget', target: t.target })}
            >
              {t.label}
            </button>
          ))}
        </div>
        {state.target === 'chi' && (
          <p className="hint">
            チーする3枚をタップ（{state.pendingChi.length}/3）
            {state.pendingChi.map((t, i) => (
              <Tile key={i} tile={t} size="sm" />
            ))}
          </p>
        )}
        {(state.target === 'pon' || state.target === 'minkan' || state.target === 'ankan') && (
          <p className="hint">{MELD_NAMES[state.target]}した牌を1枚タップ</p>
        )}
        {state.message && <p className="message">{state.message}</p>}
        <TilePalette onTap={(tile) => dispatch({ type: 'tap', tile })} remaining={(tile) => remaining(state, tile)} />
      </section>

      <section className="card">
        <h2>役（手牌からわからないもの）</h2>
        <div className="flags">
          {FLAGS.filter((f) => enabled[f]).map((f) => (
            <button
              key={f}
              type="button"
              className={state.flags[f] ? 'chip active' : 'chip'}
              aria-pressed={state.flags[f]}
              onClick={() => dispatch({ type: 'toggleFlag', flag: f })}
            >
              {FLAG_NAMES[f]}
            </button>
          ))}
        </div>
      </section>

      {outcome && <ResultView outcome={outcome} />}

      {onDone && outcome?.ok ? (
        <button type="button" className="bottom-bar bottom-action" onClick={() => onDone(outcome.result)}>
          <strong>{paymentText(outcome.result.payment)}</strong>
          <span>この点数で決定 ›</span>
        </button>
      ) : (
      <a className="bottom-bar" href="#result" aria-live="polite">
        {!outcome ? (
          <span>あと{missing}枚</span>
        ) : outcome.ok ? (
          <>
            <strong>{paymentText(outcome.result.payment)}</strong>
            <span>{gradeText(outcome.result)}</span>
          </>
        ) : (
          <span className="bottom-error">{outcome.error}</span>
        )}
      </a>
      )}
    </div>
  );
}
