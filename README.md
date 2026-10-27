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
  src\game\           対局の進行と持ち点の精算（画面とは切り離してある）
    game.ts             和了・流局・途中流局の精算、連荘、終局、順位とウマ
    game.test.ts        テスト
  src\records\        成績の記録
    records.ts          記録の形・人ごとの集計・書き出しと読み込み（テストあり）
    store.ts            保存先（成績は IndexedDB、メンバーは localStorage）
  src\ui\             画面
    records\            成績の画面（成績・履歴・メンバー・データ）
    game\               対局の画面（設定・卓・和了の入力・流局の入力・保存）
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
2. 手牌の入力画面と結果の表示 … できた（2026-10-27）
3. 局の進行と持ち点の管理 … できた（2026-10-27）。途中の対局はブラウザに保存し、閉じても続きから再開できる
4. 成績の記録 … できた（2026-10-27）
5. 公開（スマホのホーム画面に追加できる形にする） … GitHub Pages（https://aoshig1213.github.io/mahjong-score/）
6. 写真の読み取り（後の版）

## 公開

- `main` に push すると、GitHub Actions（`.github\workflows\deploy.yml`）がテスト → ビルド → GitHub Pages に公開する。テストが落ちたら公開しない
- `public\` の中身はそのまま公開される
  - `manifest.webmanifest` … ホーム画面に追加したときの名前・アイコン
  - `sw.js` … 通信がなくても開けるようにする（公開したものだけで動く。開発用サーバーでは動かさない）
  - アイコンの PNG … `node scripts\make-icons.mjs` で描き直せる
- 成績などのデータはスマホのブラウザの中だけにあり、GitHub には送られない

## データの置き場所の注意

成績・メンバー・途中の対局は、開いたブラウザの中に、開いたアドレスごとに保存される。
開発用サーバー（http://192.168.x.x:5180/ など）で使った成績は、公開したあとのアドレスには引き継がれない。
移すときは、成績の画面の「データ」で書き出して、新しいアドレスの方で読み込む。
