# 命名規約

Implementer と Refactorer が従うファイル名・クラス名・変数名の規約。

## ファイル名

- **ケース**: kebab-case（例: `create-order.usecase.ts`）
- **サフィックス**: レイヤーと役割を示す

| 役割 | サフィックス | 例 |
|------|------------|-----|
| ルート定義 | `.route.ts` | `order.route.ts` |
| ハンドラ | `.handler.ts` | `order.handler.ts` |
| ユースケース | `.usecase.ts` | `create-order.usecase.ts` |
| サービス | `.service.ts` | `order.service.ts` |
| Repository interface | `.repository.ts` | `order.repository.ts` |
| Repository 実装 | `.repository.impl.ts` | `order.repository.impl.ts` |
| バリデーション | `.schema.ts` | `order.schema.ts` |
| 型定義 | `types.ts` | `types.ts` |
| テスト | `.test.ts` | `create-order.test.ts` |
| 設定 | `.config.ts` | `db.config.ts` |

## エクスポート名

### Clean Architecture

| 役割 | パターン | 例 |
|------|---------|-----|
| 型（Entity） | PascalCase | `Order`, `OrderItem` |
| ユースケース | {動詞}{名詞}UseCase | `CreateOrderUseCase` |
| Repository interface | {Entity}Repository | `OrderRepository` |
| Repository 実装 | {Entity}Repository{ORM} | `OrderRepositoryDrizzle` |
| バリデーション | {action}{Entity}Schema | `createOrderSchema` (camelCase) |
| ルート | {entity}Routes | `orderRoutes` (camelCase) |

### Layered

| 役割 | パターン | 例 |
|------|---------|-----|
| 型 | PascalCase | `Order`, `OrderItem` |
| サービス | {Entity}Service | `OrderService` |
| バリデーション | {action}{Entity}Schema | `createOrderSchema` |
| ルート | {entity}Routes | `orderRoutes` |

## 変数名

- **ケース**: camelCase
- **定数**: UPPER_SNAKE_CASE（例: `MAX_RETRY_COUNT`）
- **プライベート**: プレフィックスなし（TypeScript の `private` を使う）
- **ブール値**: `is` / `has` / `can` プレフィックス（例: `isValid`, `hasStock`）
