# API仕様

## 外部API

現時点では外部APIなし。

## ローカルストレージ

### `ikapachinkoDeviceId`

- 型: 文字列
- 内容: 初回アクセス時にクライアント側で生成する端末識別ID
- 用途: パスワードなしで同じブラウザ内の収集データを識別する

### `ikapachinkoPrizeCollection`

- 型: JSONオブジェクト
- 内容: 端末ID、獲得済み景品スロットIDの一覧、更新日時
- 例:

```json
{
  "deviceId": "f4a2c0d9e8b11734",
  "collected": ["badge-1", "card-3"],
  "updatedAt": "2026-06-11T07:45:00.000Z"
}
```

旧形式のJSON配列も読み込み可能。

## 景品定義

`index.html` 内の `PRIZE_ASSETS` と `PRIZE_SLOTS` で管理する。

- `PRIZE_ASSETS`: GLBファイルのID、表示名、パス。
- `PRIZE_SLOTS`: バッジ10枠、カード10枠のスロット定義。
