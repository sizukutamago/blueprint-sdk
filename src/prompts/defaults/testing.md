# テスト規約

## 基本方針

- **TDD**: RED → GREEN → Refactor のサイクルに従う。
- **Level 1 / Level 2 構造**: `/test-from-contract` で生成されたテストを尊重する。
- **モックは最小限**: 外部依存（DB、外部 API）のみモック。内部ロジックはモックしない。

## テストファイル配置

```
tests/
  contracts/              ← /test-from-contract で自動生成
    {contract-id}/
      level1.test.ts      ← 構造検証（即 GREEN）
      level2.test.ts      ← 実装検証（RED → Implementer が GREEN にする）
  unit/                   ← 手動追加のユニットテスト（オプション）
  helpers/
    setup.ts              ← テスト共通セットアップ
    factories.ts          ← テストデータファクトリ
```

## モック戦略

| 依存先 | モック方法 | 例 |
|--------|----------|-----|
| DB | インメモリ実装 or テスト DB | Repository の in-memory 実装 |
| 外部 API | HTTP レベルでモック（MSW 等） | Stripe API のモック |
| ファイルシステム | テスト用一時ディレクトリ | tmp/ にファイル生成 |
| 時刻 | vi.useFakeTimers | 有効期限テスト |

### モック実装パターン

```typescript
// テスト用 Repository（Clean Architecture）
class InMemoryOrderRepository implements OrderRepository {
  private orders: Map<string, Order> = new Map()

  async save(order: Order): Promise<Order> {
    this.orders.set(order.id, order)
    return order
  }

  async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null
  }
}
```

## テストデータファクトリ

```typescript
// tests/helpers/factories.ts
export function buildOrder(overrides?: Partial<Order>): Order {
  return {
    id: "order-1",
    items: [{ productId: "prod-1", quantity: 1 }],
    totalAmount: 1000,
    status: "pending",
    ...overrides,
  }
}
```

## ルール

| ルール | 理由 |
|--------|------|
| Level 2 テストを変更しない | Contract が source of truth。テストが通らないなら実装を直す |
| 1 テストファイル = 1 Contract | 対応関係を明確に保つ |
| テスト間の依存禁止 | 各テストは独立実行可能であること |
| スナップショットテスト不使用 | 変更に脆い。アサーションを明示的に書く |
| external Contract は HTTP レベルでモック | 実装の内部構造に依存させない。MSW 等で HTTP リクエスト/レスポンスを差し替える |
| DB テストは Repository の in-memory 実装を優先 | テスト速度と CI 再現性のため。テスト DB 接続はオプション |
