# DI（依存性注入）規約

## 基本方針

- **コンストラクタ注入**: DI コンテナは使わず、コンストラクタ引数で依存を渡す。
- **interface で抽象化**: 依存先は interface 型で受け取る（テスト時にモック差し替え可能）。
- **組み立ては 1 箇所**: エントリポイント（`main.ts` や `app.ts`）で全依存を組み立てる。

## パターン

### Clean Architecture の場合

```typescript
// domain/order/order.repository.ts（interface）
export interface OrderRepository {
  save(order: Order): Promise<Order>
  findById(id: string): Promise<Order | null>
}

// usecase/order/create-order.usecase.ts
export class CreateOrderUseCase {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly paymentService: PaymentService,
  ) {}

  async execute(input: CreateOrderInput): Promise<Order> {
    // ...
  }
}

// エントリポイントでの組み立て
// app.ts
const orderRepo = new OrderRepositoryDrizzle(db)
const paymentService = new StripePaymentService(stripeClient)
const createOrder = new CreateOrderUseCase(orderRepo, paymentService)
```

### Layered の場合

```typescript
// services/order.service.ts
export class OrderService {
  constructor(private readonly db: Database) {}

  async createOrder(input: CreateOrderInput): Promise<Order> {
    // DB アクセスもサービス内で直接行う
  }
}

// エントリポイントでの組み立て
const orderService = new OrderService(db)
```

## ルール

| ルール | 理由 |
|--------|------|
| DI コンテナ不使用 | プラグインが特定ライブラリに依存しない |
| コンストラクタ注入のみ | プロパティ注入やセッター注入は避ける |
| interface は domain 層に定義 | 依存性逆転の原則 |
| 組み立ては 1 ファイル | 依存グラフの把握が容易 |
