import { describe, expect, it } from 'vitest';
import { calculate, parseTiles, DEFAULT_RULES, type HandInput, type Meld, type Rules, type ScoreResult } from './index';

/** 特に書かなければ 東場・南家（子）・ロン */
function calc(hand: string, winTile: string, opts: Partial<HandInput> = {}, rules: Rules = DEFAULT_RULES) {
  return calculate(
    { hand: parseTiles(hand), winTile, tsumo: false, roundWind: 0, seatWind: 1, ...opts },
    rules,
  );
}

function ok(outcome: ReturnType<typeof calc>): ScoreResult {
  if (!outcome.ok) throw new Error(outcome.error);
  return outcome.result;
}

const meld = (type: Meld['type'], tiles: string): Meld => ({ type, tiles: parseTiles(tiles) });
const names = (r: ScoreResult) => r.yaku.map((y) => y.name);

describe('平和・断幺九', () => {
  it('子のロン 2翻30符 = 2000点', () => {
    const r = ok(calc('234567m234p678s55p', '4m'));
    expect(names(r)).toEqual(['断幺九', '平和']);
    expect([r.han, r.fu]).toEqual([2, 30]);
    expect(r.payment).toEqual({ kind: 'ron', amount: 2000, total: 2000 });
  });

  it('子のツモ 3翻20符 = 700・1300', () => {
    const r = ok(calc('234567m234p678s55p', '4m', { tsumo: true }));
    expect(names(r)).toContain('門前清自摸和');
    expect([r.han, r.fu]).toEqual([3, 20]);
    expect(r.payment).toEqual({ kind: 'tsumo', dealer: 1300, nonDealer: 700, total: 2700 });
  });

  it('親の立直ロン 4翻30符 = 11600点、切り上げ満貫ありなら 12000点', () => {
    const opts = { seatWind: 0 as const, riichi: true, dora: ['1m'] };
    const r = ok(calc('234567m234p678s55p', '4m', opts));
    expect([r.han, r.fu, r.dora]).toEqual([4, 30, 1]);
    expect(r.payment.total).toBe(11600);

    const kiriage = ok(calc('234567m234p678s55p', '4m', opts, { ...DEFAULT_RULES, kiriageMangan: true }));
    expect(kiriage.limit).toBe('mangan');
    expect(kiriage.payment.total).toBe(12000);
  });

  it('本場はロンで1本場300点、ツモで1人100点', () => {
    expect(ok(calc('234567m234p678s55p', '4m', { honba: 2 })).payment.total).toBe(2600);
    expect(ok(calc('234567m234p678s55p', '4m', { tsumo: true, honba: 1 })).payment).toEqual({
      kind: 'tsumo',
      dealer: 1400,
      nonDealer: 800,
      total: 3000,
    });
  });
});

describe('符', () => {
  it('暗刻の么九牌8符・嵌張2符・門前ロン10符で40符', () => {
    const r = ok(calc('111345m456p789s22p', '4m', { riichi: true }));
    expect(r.wait).toBe('kanchan');
    expect(r.fuItems).toEqual([
      { label: '副底', fu: 20 },
      { label: '門前ロン', fu: 10 },
      { label: '暗刻（1萬）', fu: 8 },
      { label: '嵌張待ち', fu: 2 },
    ]);
    expect([r.han, r.fu]).toEqual([1, 40]);
    expect(r.payment.total).toBe(1300);
  });

  it('鳴いて符が付かない形は30符', () => {
    const r = ok(calc('567p678s234s55p', '7p', { melds: [meld('chi', '234m')] }));
    expect(names(r)).toEqual(['断幺九']);
    expect([r.han, r.fu]).toEqual([1, 30]);
    expect(r.payment.total).toBe(1000);
  });

  it('連風牌の雀頭は初期設定で2符、設定で4符', () => {
    const opts = { seatWind: 0 as const, riichi: true };
    const pair = (r: ScoreResult) => r.fuItems.find((i) => i.label.startsWith('雀頭'));
    expect(pair(ok(calc('123m456p789s567s11z', '7s', opts)))?.fu).toBe(2);
    const four = ok(calc('123m456p789s567s11z', '7s', opts, { ...DEFAULT_RULES, doubleWindPairFu: 4 }));
    expect(pair(four)?.fu).toBe(4);
  });

  it('七対子は25符', () => {
    const r = ok(calc('1122m3344p5566s77z', '7z'));
    expect(names(r)).toEqual(['七対子']);
    expect([r.han, r.fu]).toEqual([2, 25]);
    expect(r.payment.total).toBe(1600);
  });
});

describe('役', () => {
  it('役牌（中）のポン 1翻30符 = 1000点', () => {
    const r = ok(calc('234m567p678s11s', '4m', { melds: [meld('pon', '777z')] }));
    expect(names(r)).toEqual(['役牌 中']);
    expect([r.han, r.fu]).toEqual([1, 30]);
  });

  it('喰いタンなしのルールでは鳴いた断幺九は役にならない', () => {
    const outcome = calc('567p678s234s55p', '7p', { melds: [meld('chi', '234m')] }, { ...DEFAULT_RULES, kuitan: false });
    expect(outcome).toEqual({ ok: false, error: '役がありません' });
  });

  it('二盃口は七対子より高い方を採る', () => {
    const r = ok(calc('112233m445566p77s', '4p'));
    expect(names(r)).toEqual(['平和', '二盃口']);
    expect(r.payment.total).toBe(7700);
  });

  it('三色同順 平和 断幺九', () => {
    const r = ok(calc('234678m234p234s55s', '8m'));
    expect(names(r)).toEqual(['断幺九', '平和', '三色同順']);
    expect(r.payment.total).toBe(7700);
  });

  it('鳴いた一気通貫は1翻', () => {
    const r = ok(calc('456789m234p55s', '9m', { melds: [meld('chi', '123m')] }));
    expect(r.yaku).toEqual([{ name: '一気通貫', han: 1 }]);
  });

  it('清一色 平和 で跳満', () => {
    const r = ok(calc('22234456677889m', '9m'));
    expect(names(r)).toContain('清一色');
    expect(r.limit).toBe('haneman');
    expect(r.payment.total).toBe(12000);
  });

  it('ロンで完成した刻子は明刻（四暗刻にならず、対々和・三暗刻）', () => {
    const r = ok(calc('111m333p555s77722z', '7z'));
    expect(r.yakuman).toEqual([]);
    expect(names(r)).toEqual(expect.arrayContaining(['役牌 中', '対々和', '三暗刻']));
    expect(r.payment.total).toBe(8000);
  });

  it('混全帯幺九 場風 = 3翻40符 5200点', () => {
    const r = ok(calc('123m789p78999s111z', '1m'));
    expect(names(r)).toEqual(['場風 東', '混全帯幺九']);
    expect([r.han, r.fu]).toEqual([3, 40]);
    expect(r.payment.total).toBe(5200);
  });

  it('鳴いた純全帯幺九は2翻', () => {
    const r = ok(calc('789s123s11m', '9s', { melds: [meld('chi', '123m'), meld('pon', '999p')] }));
    expect(r.yaku).toEqual([{ name: '純全帯幺九', han: 2 }]);
    expect(r.payment.total).toBe(2000);
  });

  it('鳴いた混一色 一気通貫 役牌 = 4翻30符 7700点', () => {
    const r = ok(calc('123456789p22z', '9p', { melds: [meld('pon', '555z')] }));
    expect(r.yaku).toEqual([
      { name: '混一色', han: 2 },
      { name: '役牌 白', han: 1 },
      { name: '一気通貫', han: 1 },
    ]);
    expect(r.payment.total).toBe(7700);
  });

  it('小三元', () => {
    const r = ok(calc('66677z123m456p', '6z', { melds: [meld('pon', '555z')] }));
    expect(names(r)).toEqual(['役牌 發', '役牌 白', '小三元']);
    expect([r.han, r.fu]).toEqual([4, 30]);
  });

  it('赤ドラ', () => {
    const r = ok(calc('234067m234p678s55p', '4m'));
    expect(r.akaDora).toBe(1);
    expect(r.payment.total).toBe(3900);
  });

  it('親のダブル立直・一発・ツモで跳満 6000オール', () => {
    const r = ok(calc('234567m234p678s55p', '4m', { seatWind: 0, tsumo: true, doubleRiichi: true, ippatsu: true }));
    expect(r.limit).toBe('haneman');
    expect(r.payment).toEqual({ kind: 'tsumo-dealer', each: 6000, total: 18000 });
  });

  it('嶺上開花（暗槓のあと）', () => {
    const r = ok(calc('234m567p678s55p', '4m', { tsumo: true, rinshan: true, melds: [meld('ankan', '9999s')] }));
    expect(names(r)).toEqual(expect.arrayContaining(['門前清自摸和', '嶺上開花']));
    expect(r.fuItems).toContainEqual({ label: '暗槓（9索）', fu: 32 });
  });
});

describe('役満', () => {
  it('四暗刻のツモ', () => {
    const r = ok(calc('111m333p555s77722z', '7z', { tsumo: true }));
    expect(r.yakuman).toEqual([{ name: '四暗刻', times: 1 }]);
    expect(r.payment).toEqual({ kind: 'tsumo', dealer: 16000, nonDealer: 8000, total: 32000 });
  });

  it('四暗刻単騎はダブル役満。ダブル役満なしのルールなら1倍', () => {
    expect(ok(calc('111m333p555s77722z', '2z')).payment.total).toBe(64000);
    const single = ok(calc('111m333p555s77722z', '2z', {}, { ...DEFAULT_RULES, doubleYakuman: false }));
    expect(single.payment.total).toBe(32000);
  });

  it('国士無双と十三面', () => {
    expect(ok(calc('19m19p19s12345667z', '7z')).yakuman).toEqual([{ name: '国士無双', times: 1 }]);
    expect(ok(calc('19m19p19s12345677z', '7z')).yakuman).toEqual([{ name: '国士無双十三面', times: 2 }]);
  });

  it('九蓮宝燈と純正九蓮宝燈', () => {
    expect(ok(calc('11123455678999m', '2m')).yakuman).toEqual([{ name: '九蓮宝燈', times: 1 }]);
    expect(ok(calc('11123455678999m', '5m')).yakuman).toEqual([{ name: '純正九蓮宝燈', times: 2 }]);
  });

  it('字一色・四暗刻単騎・大三元の複合で4倍', () => {
    const r = ok(calc('555666777z111z22z', '2z'));
    expect(r.yakuman.map((y) => y.name)).toEqual(['字一色', '四暗刻単騎', '大三元']);
    expect(r.payment.total).toBe(32000 * 4);
  });

  it('13翻以上は数え役満。数え役満なしのルールなら三倍満', () => {
    const opts = { tsumo: true, riichi: true, dora: ['1m'], uraDora: ['1m'] };
    const r = ok(calc('22234456677889m', '9m', opts));
    expect(r.han).toBe(15);
    expect(r.limit).toBe('kazoe');
    expect(r.payment.total).toBe(32000);
    const capped = ok(calc('22234456677889m', '9m', opts, { ...DEFAULT_RULES, kazoeYakuman: false }));
    expect(capped.limit).toBe('sanbaiman');
  });
});

describe('入力ミス', () => {
  it('枚数が合わない', () => {
    expect(calc('234567m234p678s5p', '4m').ok).toBe(false);
  });

  it('和了の形になっていない', () => {
    expect(calc('13579m2468p13579s', '1m')).toEqual({ ok: false, error: '和了の形になっていません' });
  });

  it('鳴いているのに立直', () => {
    const outcome = calc('234m567p678s11s', '4m', { riichi: true, melds: [meld('pon', '777z')] });
    expect(outcome).toEqual({ ok: false, error: '鳴いていると立直はできません' });
  });

  it('立直していない裏ドラは数えない', () => {
    expect(ok(calc('234567m234p678s55p', '4m', { uraDora: ['1m'] })).uraDora).toBe(0);
  });
});
