import { describe, expect, it } from 'vitest';
import { calculate } from '../engine/calculate';
import { parseTiles } from '../engine/tiles';
import { INITIAL_STATE, enabledFlags, reducer, remaining, toInput, type Action, type CalcState } from './calcState';

const run = (actions: Action[], from: CalcState = INITIAL_STATE) => actions.reduce(reducer, from);
const taps = (text: string): Action[] => parseTiles(text).map((tile) => ({ type: 'tap', tile }));

describe('牌の入力', () => {
  it('13枚そろうと、次の1枚が和了牌になる', () => {
    const s = run(taps('234567m234p678s5p5p'));
    expect(s.hand).toHaveLength(13);
    expect(s.win).toBe('5p');
    expect(toInput(s)?.hand).toHaveLength(14);
  });

  it('ポンを入れると手牌の枠が3枚減る', () => {
    const s = run([{ type: 'setTarget', target: 'pon' }, { type: 'tap', tile: '7z' }, ...taps('234m567p678s1s1s')]);
    expect(s.melds).toEqual([{ type: 'pon', tiles: ['7z', '7z', '7z'] }]);
    expect(s.hand).toHaveLength(10);
    expect(s.win).toBe('1s');
    const outcome = calculate(toInput(s)!);
    expect(outcome.ok && outcome.result.payment.total).toBe(1000);
  });

  it('チーは3枚選ぶ。続いていなければ入らない', () => {
    const ok = run([{ type: 'setTarget', target: 'chi' }, ...taps('4m2m3m')]);
    expect(ok.melds).toEqual([{ type: 'chi', tiles: ['2m', '3m', '4m'] }]);
    const ng = run([{ type: 'setTarget', target: 'chi' }, ...taps('2m3m5m')]);
    expect(ng.melds).toEqual([]);
    expect(ng.message).toBe('チーは同じ色の続いた3枚です');
  });

  it('同じ牌は4枚まで、赤5は1枚まで', () => {
    const s = run(taps('1111m0m'));
    expect(remaining(s, '1m')).toBe(0);
    expect(remaining(s, '0m')).toBe(0);
    expect(remaining(s, '5m')).toBe(3);
    expect(run(taps('1m'), s).hand).toHaveLength(5);
  });

  it('赤5をポンすると1枚だけ赤になる', () => {
    const s = run([{ type: 'setTarget', target: 'pon' }, { type: 'tap', tile: '0p' }]);
    expect(s.melds[0].tiles).toEqual(['0p', '5p', '5p']);
  });

  it('手牌が多いと鳴きを入れられない', () => {
    const s = run([...taps('1234567891234m'), { type: 'setTarget', target: 'pon' }, { type: 'tap', tile: '7z' }]);
    expect(s.melds).toEqual([]);
    expect(s.message).toMatch('手牌が多すぎて');
  });
});

describe('状況役', () => {
  it('鳴くと立直を選べない。ロンでは海底を選べない', () => {
    const s = run([{ type: 'setTarget', target: 'pon' }, { type: 'tap', tile: '7z' }]);
    expect(enabledFlags(s).riichi).toBe(false);
    expect(enabledFlags(s).haitei).toBe(false);
    expect(enabledFlags(s).houtei).toBe(true);
  });

  it('選べない役は計算に渡さない（ツモに切り替えたあとの河底など）', () => {
    const s = run([
      ...taps('234567m234p678s5p5p'),
      { type: 'toggleFlag', flag: 'houtei' },
      { type: 'set', patch: { tsumo: true } },
    ]);
    expect(toInput(s)?.houtei).toBe(false);
  });

  it('立直とダブル立直は片方だけ', () => {
    const s = run([
      { type: 'toggleFlag', flag: 'riichi' },
      { type: 'toggleFlag', flag: 'doubleRiichi' },
    ]);
    expect(s.flags.riichi).toBe(false);
    expect(s.flags.doubleRiichi).toBe(true);
  });

  it('全部消しても、場風・自風・本場は残す', () => {
    const s = run([{ type: 'set', patch: { seatWind: 0, honba: 2 } }, ...taps('123m'), { type: 'clear' }]);
    expect([s.hand, s.seatWind, s.honba]).toEqual([[], 0, 2]);
  });
});
