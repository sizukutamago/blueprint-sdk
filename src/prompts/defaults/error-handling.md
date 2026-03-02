# エラーハンドリング規約

## 基本方針

- **ドメインエラー**: カスタムエラークラスで表現。HTTP ステータスとは分離。
- **境界でのみ変換**: ドメインエラー → HTTP レスポンスの変換は interface 層で行う。
- **早期リターン**: ネストを避け、エラー条件を先にチェック。

## エラー型

```typescript
// shared/errors.ts

// 基底エラークラス
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

// ドメイン固有エラー
export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super("NOT_FOUND", `${entity} not found: ${id}`, 404)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message, 400)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message, 409)
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super("EXTERNAL_SERVICE_ERROR", `${service}: ${message}`, 502)
  }
}
```

## エラーハンドラ（interface 層）

```typescript
// interface/error-handler.ts
// フレームワークに応じて実装（Hono, Express 等）

// AppError → HTTP レスポンスの変換
// 未知のエラー → 500 Internal Server Error（詳細はログへ、レスポンスには出さない）
```

## ルール

| ルール | 説明 |
|--------|------|
| 例外を握りつぶさない | catch したら再 throw するかログに記録 |
| 外部 API エラーはラップ | 元のエラーを cause に保持して ExternalServiceError に変換 |
| バリデーションエラーは明示的 | Zod の parse エラーをそのまま投げず、ValidationError に変換 |
| ログレベル | 4xx → warn、5xx → error |
