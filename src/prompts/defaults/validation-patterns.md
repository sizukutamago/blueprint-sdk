# バリデーションスキーマ生成ルール

Contract YAML の入力フィールド制約をバリデーションスキーマに変換する際のルール。
Implementer がスキーマを生成し、Code Review Gate（Schema Compliance Checker）が検証に使用する。

> ライブラリ固有の API は AI が知っているため、ここでは**マッピングルール**のみ定義する。

## Contract 制約 → スキーマ変換ルール

| Contract 制約 | 変換先 | 欠落時 severity | 値不一致時 severity |
|---------------|--------|----------------|-------------------|
| `type: string` | 文字列バリデーション | P1 | P1 |
| `type: integer` | 整数バリデーション（`.int()` 相当） | P1 | P1 |
| `type: number` | 数値バリデーション | P1 | P1 |
| `type: boolean` | 真偽値バリデーション | P1 | P1 |
| `type: array` | 配列バリデーション（items の型も再帰適用） | P1 | P1 |
| `type: object` | オブジェクトバリデーション（properties を再帰適用） | P1 | P1 |
| `required: true` | 必須フィールド（`.optional()` 禁止） | P1 | — |
| `required: false` | オプショナルフィールド | — | — |
| `min` | 最小値制約（数値）/ 最小長（文字列）/ 最小要素数（配列） | P1 | **P0** |
| `max` | 最大値制約（数値）/ 最大長（文字列）/ 最大要素数（配列） | P1 | **P0** |
| `pattern` | 正規表現バリデーション | P1 | **P0** |
| `enum` | 列挙値リスト（値の過不足は P0） | P1 | **P0** |
| `default` | デフォルト値設定 | P2 | P1 |
| `value` (固定値) | ハードコード値 or 設定値 | P1 | **P0** |
| `format: email` | メール形式バリデーション | P1 | — |
| `format: uuid` | UUID 形式バリデーション | P1 | — |
| `format: date` | 日付形式バリデーション | P1 | — |
| `format: url` | URL 形式バリデーション | P1 | — |

## severity の基準

- **P0（値の不一致）**: Contract が `max: 99` と宣言しているのに実装が `max: 100` → ビジネスルール違反
- **P1（制約の欠落）**: Contract が `min: 1` と宣言しているのに実装に min チェックがない → バリデーション漏れ
- **P2（デフォルト値の欠落）**: 動作に影響するが、未設定でもエラーにはならない

## ネスト構造の扱い

```
Contract:
  input:
    body:
      items:
        type: array
        items:
          type: object
          properties:
            productId:
              type: string
              required: true
            quantity:
              type: integer
              min: 1
              max: 99
              required: true
```

→ ネストされた各フィールドにも同じルールを再帰的に適用する。
バリデーションスキーマも同じネスト構造で定義すること。

## Implementer の責務

1. Contract の input/request フィールドを走査
2. 上記ルール表に従いスキーマを生成
3. ファイル配置は `naming.md` に従う（`{entity}.schema.ts`）

## Code Review Gate の検証基準

Schema Compliance Checker（Agent 1）は上記ルール表をチェックリストとして使用する。
詳細な手順は `skills/orchestrator/references/review-prompts/code-reviewer.md` を参照。
