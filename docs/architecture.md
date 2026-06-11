# アーキテクチャ設計

## 構成

- `index.html`: ゲーム本体、UI、抽選、収集状態管理を含む単体HTMLアプリ。
- `assets/movie/gacha.mp4`: ガチャ演出動画。
- `assets/keihin/*.glb`: 景品3Dモデル。
- `localStorage`: 端末ID、景品収集状態、既存ハイスコアを保存。

## 景品収集フロー

1. スロット大当り処理 `bigWin()` が実行される。
2. 倍率10以上の場合、`playGachaMovie()` がガチャ動画を開始し、景品候補を予約する。
3. 動画フレームカウント終了または動画 `ended` イベントで `finishGachaMovie()` を呼ぶ。
4. `revealPrize()` が収集状態を更新し、左右ラックと3Dプレビューを表示する。

## 端末内保存

初回アクセス時に `ikapachinkoDeviceId` を発行し、景品収集状態を `ikapachinkoPrizeCollection` に保存する。ログインやパスワードは使わず、同じブラウザの `localStorage` が残っている限りリロード後に復元する。

## 景品データ

ブラウザ単体ではローカルフォルダを安全に列挙できないため、`PRIZE_ASSETS` に既知のGLBファイルを定義する。バッジ10枠、カード10枠はこの3Dデータを割り当てて構成する。
