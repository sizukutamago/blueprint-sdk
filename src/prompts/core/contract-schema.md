# Contract YAML Schema

Contract は I/O 境界（API、外部連携、ファイル）の機械可読な仕様。
テスト自動生成の入力として使われる。

## 共通メタデータ（全タイプ必須）

```yaml
id: CON-{name}                    # 一意識別子
type: api | external | file | internal  # I/O タイプ
subtype: service | repository     # internal の場合のみ（必須）
version: "1.0.0"                  # SemVer
status: draft | active | deprecated
owner: "@handle"                  # 責任者
updated_at: "YYYY-MM-DD"          # 最終更新日

links:
  implements: [FR-xxx]            # どの要件を実装するか
  depends_on: [CON-xxx]           # 依存先 Contract
  decided_by: [DEC-xxx]           # 関連する設計判断
  impacts: [CON-xxx]              # 影響を与える先
```

## タイプ別スキーマ

### api — 自社が公開する API

自社サービスが外部に公開するエンドポイントの仕様。

```yaml
# API 定義
method: GET | POST | PUT | PATCH | DELETE
path: "/api/..."

input:
  content_type: application/json
  body:
    {field_name}:
      type: string | integer | number | boolean | array | object
      required: true | false
      min: N                    # 数値の最小値
      max: N                    # 数値の最大値
      min_items: N              # 配列の最小要素数
      pattern: "regex"          # 文字列のパターン
      enum: [a, b, c]           # 許容値
      # object の場合
      properties:
        {sub_field}: { type: ..., ... }
      # array の場合
      items:
        {sub_field}: { type: ..., ... }

output:
  success:
    status: 201                 # HTTP ステータスコード
    body:
      {field_name}: { type: ..., format: ..., description: "..." }
  errors:
    - status: 400
      code: error_code
      description: "エラーの説明"
      body: { ... }             # オプション: エラー固有のボディ

business_rules:
  - id: BR-{NNN}
    rule: "ルールの説明"

# オプション
state_transition:
  entity: {entity_name}
  initial: {initial_state}
  transitions:
    {state}: [{next_state}, ...]
```

**テスト導出ポイント**:
- `required: true` → 空値テスト
- `min`/`max` → 境界値テスト (N-1, N, N+1)
- `pattern` → マッチ/不一致テスト
- `enum` → 無効値テスト + 全有効値テスト
- `business_rules` → 各ルール ID ごとに正常系 + 異常系
- `state_transition` → 初期状態、許可遷移、拒否遷移
- `errors` → 各エラーコードのレスポンス形式

### external — 外部 API を呼ぶ側

他社サービスの API を呼び出す仕様。

```yaml
# 外部 API 情報
provider: "サービス名"
api_version: "バージョン"        # オプション
docs_url: "ドキュメント URL"     # オプション

endpoint:
  method: POST
  url: "https://..."

# 自分が送るリクエスト
request:
  auth: "Bearer xxx"             # 認証方式
  body:
    {field_name}:
      type: string | integer | ...
      required: true | false
      value: "fixed_value"       # 固定値の場合
      description: "説明"

# 相手が返すレスポンス
response:
  success:
    status: 200
    body:
      {field_name}: { type: ..., pattern: "...", enum: [...] }
  errors:
    - type: error_type
      description: "エラーの説明"
      handling: "対処方法"

# 自分側の制約
constraints:
  - id: EC-{NNN}
    rule: "制約の説明"
```

**テスト導出ポイント**:
- `request.body` のフィールド → リクエスト構築の検証
- `response.errors` → 各エラータイプのハンドリング検証
- `constraints` → 冪等性、タイムアウト、リトライ等の制約検証

### file — ファイル連携

CSV/バッチ等のファイルベース I/O の仕様。

```yaml
# ファイル定義
direction: import | export
format: csv | tsv | json | xml
encoding: utf-8
delimiter: ","                   # CSV/TSV の場合
has_header: true | false
max_file_size: "10MB"            # オプション
max_rows: 10000                  # オプション

columns:
  - name: column_name
    type: string | integer | number | boolean
    required: true | false
    description: "説明"
    pattern: "regex"             # オプション
    min: N                       # オプション
    max: N                       # オプション
    max_length: N                # オプション
    enum: [a, b, c]              # オプション
    default: "value"             # オプション

processing_rules:
  - id: PR-{NNN}
    rule: "処理ルールの説明"

result:
  success:
    body:
      {field_name}: { type: ... }
  error:
    body:
      failed_rows:
        type: array
        items:
          row_number: { type: integer }
          column: { type: string }
          error: { type: string }

example: |                       # オプション: サンプルデータ
  header1,header2,...
  value1,value2,...
```

**テスト導出ポイント**:
- `columns` の `required`/`min`/`max`/`max_length`/`pattern`/`enum`/`default` → 各カラムの検証テスト
- `max_rows` → 上限テスト
- `has_header` → ヘッダー有無テスト
- `processing_rules` → 各ルール ID ごとに正常系 + 異常系
- `result.error` → エラーレスポンス形式

### internal — 内部サービス・リポジトリ

外部に公開しないモジュール間の I/O 境界。`subtype` で分類する。

#### 共通フィールド（全 subtype 必須）

```yaml
subtype: service | repository     # 必須
description: "モジュールの概要"

input:
  {method_name}:
    description: "メソッドの説明"
    params:
      {param_name}:
        type: string | number | boolean | object | array
        required: true | false
        description: "説明"
    returns:
      type: {return_type}
      description: "戻り値の説明"

rules:
  - id: R-{NNN}
    description: "ルールの説明"
```

#### subtype: service — ドメインサービス・ユーティリティ

振る舞いベースの内部ロジック。状態遷移や副作用を持つ場合がある。

```yaml
# service 固有フィールド（オプション）
state:
  manages: "管理する状態の説明"
  lifecycle: "start → running → stopped"  # 状態遷移（あれば）

side_effects:
  - "副作用の説明"                         # 外部への影響（あれば）
```

**テスト導出ポイント**:
- `input.{method}.params` の `required`/`type` → 引数バリデーションテスト
- `rules[]` → 各ルール ID ごとに正常系 + 異常系
- `state.lifecycle` → 状態遷移テスト（許可遷移 + 拒否遷移）
- `side_effects` → 副作用の発生/不発生テスト
- `returns` → 戻り値の型・構造テスト

#### subtype: repository — データ永続化

CRUD ベースのデータアクセス。ストレージへの読み書きの I/O 境界。

```yaml
# repository 固有フィールド（オプション）
storage:
  type: file | db | cache            # ストレージ種別
  path: "保存先パス or テーブル名"    # オプション
  format: json | csv | sql           # オプション

entity:
  name: "エンティティ名"
  schema:
    {field_name}:
      type: string | number | boolean | array | object
      description: "フィールドの説明"
```

**テスト導出ポイント**:
- `input.{method}` → 各 CRUD メソッドの正常系テスト（roundtrip）
- `input.{method}.returns: null` → 存在しないキー → null テスト
- `rules[]` → 各ルール ID ごとのテスト（アトミック書き込み、冪等削除等）
- `storage.type` → ストレージ固有のテスト（ファイル存在確認、DB 接続等）
- `entity.schema` → 保存/取得データの構造一致テスト

## implementation セクション（全タイプ共通、オプション）

実装に必要な内部設計情報を記録する。`/spec` 実行時にユーザーと対話して決定する。
テスト導出には使用しない（Implementer 専用の情報）。

```yaml
implementation:
  data_sources:
    - id: DS-{NNN}
      target: "BR-{NNN}"           # 対象の business_rule / processing_rule / constraint
      entity: "エンティティ名"      # 取得元のエンティティ（例: Product, User）
      field: "フィールド名"         # 取得するフィールド（例: stock, price）
      access: db | api | cache | config  # データアクセス方法
      notes: "補足情報"            # オプション（排他制御、結合条件等）

  flow:
    - step: N                      # ステップ番号（実行順序）
      action: "アクション名"        # 処理内容（validate_input, check_stock 等）
      rule: "BR-{NNN}"            # オプション: 対応する business_rule
      calls: "CON-xxx"            # オプション: 呼び出す Contract
      data_sources: [DS-{NNN}]    # オプション: 使用する data_source
  transaction: [N, N, ...]        # オプション: トランザクションで囲むステップ番号
```

**data_sources のフィールド**:

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `id` | はい | 一意識別子（DS-001 等） |
| `target` | はい | 対象ルール ID（BR-001, PR-001, EC-001） |
| `entity` | はい | 取得元エンティティ名 |
| `field` | はい | 取得フィールド名 |
| `access` | はい | `db`（DB直接）/ `api`（外部API）/ `cache`（キャッシュ）/ `config`（設定値） |
| `notes` | いいえ | 排他制御、結合条件、キャッシュ TTL 等の補足 |

**flow のフィールド**:

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `step` | はい | 実行順序の番号 |
| `action` | はい | 処理内容のラベル |
| `rule` | いいえ | 対応する business_rule / processing_rule ID |
| `calls` | いいえ | 呼び出す Contract ID（外部連携等） |
| `data_sources` | いいえ | このステップで使用する data_source ID リスト |
| `transaction` | いいえ | flow 直下に配置。トランザクション境界のステップ番号リスト |

**例（api タイプ: 注文作成）**:

```yaml
implementation:
  data_sources:
    - id: DS-001
      target: "BR-001"
      entity: "Product"
      field: "stock"
      access: db
      notes: "排他ロック必須（SELECT FOR UPDATE）"
    - id: DS-002
      target: "BR-002"
      entity: "Product"
      field: "price"
      access: db

  flow:
    - step: 1
      action: "validate_input"
    - step: 2
      action: "fetch_products"
      data_sources: [DS-001, DS-002]
    - step: 3
      action: "check_stock"
      rule: BR-001
    - step: 4
      action: "calculate_total"
      rule: BR-002
    - step: 5
      action: "create_payment"
      calls: CON-stripe-payment-intent
    - step: 6
      action: "save_order"
  transaction: [2, 3, 4, 5, 6]
```

**例（file タイプ: 商品一括インポート）**:

```yaml
implementation:
  data_sources:
    - id: DS-001
      target: "PR-001"
      entity: "Product"
      field: "sku"
      access: db
      notes: "重複チェック用（UNIQUE 制約）"

  flow:
    - step: 1
      action: "parse_file"
    - step: 2
      action: "validate_rows"
    - step: 3
      action: "check_duplicates"
      rule: PR-001
      data_sources: [DS-001]
    - step: 4
      action: "bulk_upsert"
  transaction: [3, 4]
```

## テスト導出パターン一覧

Contract のフィールドからテストを機械的に導出する:

| フィールド | 生成するテスト |
|-----------|--------------|
| `required: true` | 空値/未送信 → エラー |
| `min: N` | N-1 → エラー、N → OK（境界値） |
| `max: N` | N+1 → エラー、N → OK（境界値） |
| `max_length: N` | N+1 文字 → エラー、N 文字 → OK |
| `pattern: "^...$"` | 不一致値 → エラー、境界長 |
| `enum: [a, b, c]` | 無効値 → エラー、全有効値 → OK |
| `default: X` | 省略時 → X が適用される |
| `business_rules[]` | 各ルール ID ごとに正常系 + 異常系 |
| `constraints[]` | 各制約 ID ごとに検証 |
| `state_transition` | 初期状態、許可遷移、拒否遷移 |
| `errors[]` | 各エラーコードのレスポンス形式 |
| `rules[]` (internal) | 各ルール ID ごとに正常系 + 異常系 |
| `state.lifecycle` (internal/service) | 状態遷移テスト |
| `side_effects` (internal/service) | 副作用の発生/不発生テスト |
| `input.{method}.returns: null` (internal/repository) | 存在しないキー → null テスト |
| `storage` (internal/repository) | ストレージ固有テスト（roundtrip） |

> **制約干渉に注意**: テスト生成時、他の制約（例: `max: 99`）を超えない値を使う。
> 例: 在庫不足テストで `quantity: 99999` は `max: 99` に先に引っかかる → `quantity: 10`（有効範囲内）で低在庫商品を使う。
