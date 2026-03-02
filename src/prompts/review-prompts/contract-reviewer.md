# Contract Review Swarm プロンプト

パイプライン Stage 1 後の Contract Review Gate で使用するレビュープロンプト。
3 エージェントが並列でレビューし、findings を返す。

## 共通入力

各エージェントに以下を渡す:
- Contract YAML ファイルパスリスト（`.blueprint/contracts/**/*.contract.yaml`）
- `core/contract-schema.md` の内容（スキーマ参照）
- `core/review-criteria.md` の内容（P0/P1/P2 定義、Gate 判定基準、Severity ガバナンスルール）

## 共通出力フォーマット

```yaml
reviewer: "{エージェント名}"
gate: "contract"
findings:
  - severity: P0 | P1 | P2
    target: "CON-xxx"
    field: "path.to.field"
    message: "問題の説明"
    suggestion: "修正提案"
summary:
  p0: 0
  p1: 0
  p2: 0
```

> **Note**: REVISE サイクルで severity を変更する場合は `core/review-criteria.md` の Severity ガバナンスルールに従い、`disposition` + `disposition_reason` + `original_severity` を記録すること。

---

## Agent 1: Schema Validator

### 役割

Contract YAML の構造的正当性を検証する。パース不可や必須フィールド欠落は後続ステージを破壊するため、厳密にチェックする。

### チェック手順

```
1. 各 Contract YAML を読み込み、YAML としてパース可能か確認
   → パース不可: P0

2. 共通メタデータの存在チェック:
   - id: 必須、CON-* プレフィックス → 欠落/形式違反: P0
   - type: 必須、api | external | file | internal → 欠落/不正値: P0
   - subtype: type が internal の場合必須、service | repository → 欠落/不正値: P0
   - version: 必須、SemVer 形式 (X.Y.Z) → 欠落/形式違反: P1
   - status: 必須、draft | active | deprecated → 欠落/不正値: P1
   - owner: 必須、@handle 形式 → 欠落: P2
   - updated_at: 必須、YYYY-MM-DD 形式 → 欠落: P2

3. links 構造チェック:
   - implements, depends_on, decided_by, impacts が配列であること
   → 配列でない/型不正: P1

4. タイプ別必須フィールド:

   api:
   - method: 必須 (GET|POST|PUT|PATCH|DELETE) → 欠落: P0
   - path: 必須 → 欠落: P0
   - input: 必須（query/params/body のいずれか） → 欠落: P0
   - output: 必須（success + errors） → 欠落: P0
   - business_rules: 必須（配列） → 欠落: P1

   external:
   - provider: 必須 → 欠落: P0
   - endpoint: 必須 → 欠落: P0
   - request: 必須 → 欠落: P0
   - response: 必須（success + errors） → 欠落: P0
   - constraints: 必須（配列） → 欠落: P1

   file:
   - direction: 必須 (import|export) → 欠落: P0
   - format: 必須 → 欠落: P0
   - columns: 必須（配列） → 欠落: P0
   - processing_rules: 必須（配列） → 欠落: P1
   - result: 必須 → 欠落: P0

   internal:
   - subtype: 必須 (service|repository) → 欠落: P0
   - description: 必須 → 欠落: P1
   - input: 必須（メソッド定義） → 欠落: P0
   - rules: 必須（配列） → 欠落: P1
   - subtype: service の場合:
     - state または side_effects のいずれか → 両方欠落: P2
   - subtype: repository の場合:
     - storage → 欠落: P2

5. id が Contract ファイル内で一貫しているか確認
   - ファイル名と id の対応: {name}.contract.yaml ↔ CON-{name}
   → 不一致: P2
```

---

## Agent 2: Completeness Checker

### 役割

Contract の情報が十分に記載されているか（完全性）を検証する。

### チェック手順

```
1. links.implements チェック:
   - 空配列 [] → P1（要件との紐付けが未設定）
   - FR-xxx 形式でない要素 → P2

2. links.depends_on 参照先チェック:
   - 参照先 CON-xxx が .blueprint/contracts/ に実在するか
   → 実在しない: P1
   - 循環参照がないか → 検出: P1

3. links.decided_by チェック:
   - DEC-xxx が .blueprint/decisions/ に実在するか
   → 実在しない: P2（決定ログ連携は推奨）

4. links.impacts チェック:
   - 参照先 CON-xxx が .blueprint/contracts/ に実在するか
   → 実在しない: P2

5. 入力フィールドの制約定義チェック:

   api — input.body / input.query / input.params の各フィールド:
   - type が定義されているか → 未定義: P1
   - required の定義があるか → 未定義: P2

   external — request の各フィールド:
   - type が定義されているか → 未定義: P1

   file — columns の各要素:
   - name と type が定義されているか → 未定義: P1

   internal — input の各メソッド:
   - params の各パラメータに type が定義されているか → 未定義: P1
   - returns が定義されているか → 未定義: P1

6. ビジネスルール/制約の ID 付与チェック:

   api — business_rules:
   - 各ルールに id (BR-xxx) があるか → 未付与: P1
   - description が空でないか → 空: P2

   external — constraints:
   - 各制約に id (EC-xxx) があるか → 未付与: P1

   file — processing_rules:
   - 各ルールに id (PR-xxx) があるか → 未付与: P1

   internal — rules:
   - 各ルールに id (R-xxx) があるか → 未付与: P1
   - description が空でないか → 空: P2

7. errors セクション:
   - api: errors に status と code が定義されているか → 未定義: P1
   - external: response.errors に type が定義されているか → 未定義: P1
```

---

## Agent 3: Testability Auditor

### 役割

Contract から TDD テストが機械的に導出できるか（テスト可能性）を検証する。
`test-from-contract.md` のテスト導出パターンに照らして、導出不可能なフィールドを検出する。

### チェック手順

```
1. 各入力フィールドのテスト導出可能性チェック:

   テスト導出に必要な制約（いずれか 1 つ以上が必要）:
   - required: true/false → 空値テスト導出可能
   - min/max → 境界値テスト導出可能
   - min_items/max_items → 配列長テスト導出可能
   - pattern → 正規表現テスト導出可能
   - enum → 有効値/無効値テスト導出可能
   - default → デフォルト値テスト導出可能
   - max_length → 文字数境界テスト導出可能

   → いずれの制約もないフィールド: P1（テスト導出不可）

2. 曖昧表現チェック:
   - description に「適切に」「など」「必要に応じて」「可能であれば」等の曖昧表現
   → 検出: P2
   - business_rules の description に具体的な条件/値がない
   → 検出: P1

3. business_rules / rules のテスト可能性:
   - api: 各 BR-xxx に正常系と異常系の判定基準が明確か → 不明確: P1
   - internal: 各 R-xxx に正常系と異常系の判定基準が明確か → 不明確: P1
   - internal (repository): CRUD メソッドの戻り値が明確か → 不明確: P1

4. state_transition のテスト可能性（api のみ）:
   - initial_state が定義されているか → 未定義: P1
   - transitions に from/to/trigger が定義されているか → 不完全: P1
   - 禁止遷移が明示されているか → 未定義: P2

5. errors のテスト可能性:
   - 各エラーに condition（発生条件）が明記されているか
   → 未定義: P1（テストの前提条件が不明）

6. 制約間の干渉可能性チェック:
   - 同一オブジェクト内で min/max が重なる場合に境界値テストが成立するか
   - required: true のフィールドで min: 0 が設定されていないか
   → 干渉検出: P2（テスト生成時の注意事項として記録）
```
