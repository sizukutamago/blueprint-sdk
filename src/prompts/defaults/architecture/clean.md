# Clean Architecture パターン

config.yaml の `architecture.pattern: clean` 選択時に適用。

## レイヤー定義

```
src/
  domain/         ← エンティティ、値オブジェクト、ドメインサービス
  usecase/        ← ユースケース（アプリケーションサービス）
  infra/          ← Repository 実装、外部 API クライアント、DB アクセス
  interface/      ← ルート定義、コントローラー、ミドルウェア
```

## 依存方向ルール

```
interface → usecase → domain
infra     → usecase → domain
              ↑
          (依存性逆転)
```

- **domain**: 他のレイヤーに依存しない。純粋なビジネスロジック。
- **usecase**: domain のみに依存。infra の interface（Repository 等）を domain 層で定義。
- **infra**: usecase の interface を実装。外部ライブラリへの依存はここに閉じ込める。
- **interface**: usecase を呼び出す。フレームワーク固有のコードはここに閉じ込める。

**禁止**: domain → infra、domain → interface、usecase → infra（直接）

## ディレクトリ構造

```
src/
  domain/{entity}/
    types.ts                 # エンティティ型、値オブジェクト型
    {entity}.repository.ts   # Repository interface（依存性逆転）
    {entity}.service.ts      # ドメインサービス（オプション）

  usecase/{entity}/
    {action}-{entity}.usecase.ts   # ユースケースクラス/関数

  infra/{entity}/
    {entity}.repository.impl.ts    # Repository 実装
    {entity}.schema.ts             # バリデーションスキーマ（Zod 等）

  interface/{entity}/
    {entity}.route.ts              # ルート定義
    {entity}.handler.ts            # リクエストハンドラ（オプション、route に統合可）

  shared/
    errors.ts                      # 共通エラー型
    result.ts                      # Result 型（オプション）
```

## Contract タイプとレイヤーのマッピング

| Contract type | 主なレイヤー | 生成ファイル |
|--------------|------------|------------|
| api | interface + usecase + domain | route, usecase, types, repository |
| external | infra | API クライアント、リトライロジック |
| file | interface + usecase | パーサー、バリデーション、バルク処理 |
