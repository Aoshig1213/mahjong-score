# mahjong-score — 麻雀の点数計算アプリ（スマホ向け Web アプリ）

自分で麻雀を打つときに使う、点数計算と点棒管理のアプリ。2026-10-27 に立ち上げ。

```
mahjong-score\
  docs\
    requirements.md   要件定義（決まったこと・まだ決めていないこと）
  src\engine\         点数計算のプログラム（画面とは切り離してある）
    tiles.ts            牌の表し方（"1m" "0p" "7z" など）
    hand.ts             手牌を面子・雀頭に分ける（考えられる分け方と待ちを全部出す）
    yaku.ts             役と役満の判定
    fu.ts               符の計算
    points.ts           翻・符から点数、支払い（本場込み）
    calculate.ts        入力の確認 → 全部の分け方で計算 → 一番高いものを返す
    calculate.test.ts   テスト
  src\ui\             画面
    calcState.ts        点数計算の画面の状態（牌をタップしたときの動きなど。テストあり）
    Calculator.tsx      点数計算の画面
    Tile.tsx            牌の見た目
    TilePalette.tsx     牌の一覧（タップして入力する）
    ResultView.tsx      結果（点数・役・符の内訳）
    RulesPanel.tsx      ルールの設定（ブラウザに保存）
  src\App.tsx         画面の一番外側
```

## 動かし方

```
npm install
npm run dev        開発用サーバー（http://localhost:5173/。同じWi-Fiのスマホからは表示される Network のアドレスで開ける）
npm test           テスト
npm run typecheck  型チェック
npm run build      公開用のファイルを dist\ に作る
```

## 今の段階

1. 点数計算のプログラム … できた（2026-10-27）
2. 手牌の入力画面と結果の表示 … できた（2026-10-27）。対局の管理はまだなく、場風・自風・本場は手で選ぶ
3. 局の進行と持ち点の管理 … 次
4. 成績の記録
5. 写真の読み取り（後の版）
