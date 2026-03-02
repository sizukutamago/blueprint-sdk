# Layered Architecture パターン

config.yaml の `architecture.pattern: layered` 選択時に適用。
Clean Architecture より軽量な 3 層構造。小〜中規模プロジェクト向け。

## レイヤー定義

```
src/
  models/         ← データ型、バリデーションスキーマ
  services/       ← ビジネスロジック、外部 API 連携
  routes/         ← ルート定義、リクエストハンドラ
```

## 依存方向ルール

```
routes → services → models
```

- **models**: 他のレイヤーに依存しない。型定義とスキーマ。
- **services**: models のみに依存。DB アクセスもここに含む。
- **routes**: services を呼び出す。フレームワーク固有コード。

**禁止**: models → services、models → routes

## ディレクトリ構造

```
src/
  models/
    {entity}.ts              # 型定義 + バリデーションスキーマ

  services/
    {entity}.service.ts      # ビジネスロジック + DB アクセス

  routes/
    {entity}.route.ts        # ルート定義 + ハンドラ

  shared/
    errors.ts                # 共通エラー型
    db.ts                    # DB 接続設定
```

## Contract タイプとレイヤーのマッピング

| Contract type | 主なレイヤー | 生成ファイル |
|--------------|------------|------------|
| api | routes + services + models | route, service, model |
| external | services | API クライアント（service 内に統合） |
| file | routes + services | パーサー（service 内）、アップロードルート |
