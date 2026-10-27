import { useState } from 'react';
import { ABORT_REASONS, settle, type Game, type HandEvent } from '../../game/game';
import { DeltaTable, PlayerPicker, toggle } from './parts';
import { FlowHeader } from './WinFlow';

interface Props {
  game: Game;
  /** 途中流局なら true */
  abort: boolean;
  onApply: (event: HandEvent) => void;
  onCancel: () => void;
}

export function DrawFlow({ game, abort, onApply, onCancel }: Props) {
  const [tenpai, setTenpai] = useState<number[]>([]);
  const [nagashi, setNagashi] = useState<number[]>([]);
  const [riichi, setRiichi] = useState<number[]>([]);
  const [reason, setReason] = useState<string>(ABORT_REASONS[0]);

  // 立直した人はテンパイしている
  const tenpaiAll = [...new Set([...tenpai, ...riichi])];
  const event: HandEvent = abort
    ? { kind: 'abort', reason, riichi }
    : { kind: 'draw', tenpai: tenpaiAll, nagashi, riichi };
  const { deltas, dealerStays } = settle(game, event);

  return (
    <div className="screen">
      <FlowHeader title={abort ? '途中流局' : '流局'} onBack={onCancel} />
      {abort ? (
        <section className="card">
          <h2>種類</h2>
          <div className="flags">
            {ABORT_REASONS.map((r) => (
              <button key={r} type="button" className={reason === r ? 'chip active' : 'chip'} onClick={() => setReason(r)}>
                {r}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="card">
          <h2>テンパイした人</h2>
          <PlayerPicker game={game} selected={tenpaiAll} disabled={riichi} onToggle={(p) => setTenpai(toggle(tenpai, p))} />
        </section>
      )}
      <section className="card">
        <h2>この局で立直した人</h2>
        <PlayerPicker game={game} selected={riichi} onToggle={(p) => setRiichi(toggle(riichi, p))} />
      </section>
      {!abort && (
        <section className="card">
          <h2>流し満貫</h2>
          <PlayerPicker game={game} selected={nagashi} onToggle={(p) => setNagashi(toggle(nagashi, p))} />
          <p className="hint">流し満貫があるときは、テンパイ料のやり取りはしません</p>
        </section>
      )}
      <section className="card">
        <h2>点数の増減</h2>
        <DeltaTable game={game} deltas={deltas} />
        <p className="hint">{dealerStays ? '親が続けます（連荘）' : '親が次の人に移ります'}。本場が1本増えます</p>
      </section>
      <div className="actions">
        <button type="button" className="button primary" onClick={() => onApply(event)}>
          確定
        </button>
      </div>
    </div>
  );
}
