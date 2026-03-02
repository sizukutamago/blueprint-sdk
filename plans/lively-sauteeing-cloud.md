# パイプライン Resume/Recovery 機能の改善

## Context

前回の othello-online パイプライン実行で、Gate 失敗→修正→再実行を何度も繰り返した。
現在の resume 機能は以下の問題があり、復帰体験が悪い：

1. **サマリーなし**: 何がスキップされてどこから再開するのか見えない
2. **`in_progress` スタック**: プロセスクラッシュで stuck した状態を正しく処理しない（index 0 に戻る）
3. **完了済みが無言**: 全完了パイプラインの resume が何も言わずに終わる
4. **ステージ選択なし**: 失敗ゲートだけ再実行する方法がない（全部やり直し or 自動検出の二択）
5. **resume でもインタビュー再実行**: spec 生成済みなのに毎回ヒアリングし直す
6. **ハンドラー例外で状態が壊れる**: 予期しないエラーでステージが `in_progress` のまま放置

## 変更ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/engine.ts` | `getResumeInfo()` 追加、handler try-catch、`startFromStage` 対応 |
| `src/types.ts` | `PipelineOptions` に `startFromStage` 追加、`ResumeInfo` 型エクスポート |
| `src/cli.ts` | resume サマリー表示、インタビュースキップ、ステージ選択 UI |
| `src/index.ts` | `ResumeInfo` エクスポート追加 |
| `tests/integration/engine.test.ts` | 新規テスト追加（in_progress resume、handler error recovery、startFromStage） |

## 実装ステップ

### Step 1: `engine.ts` — `getResumeInfo` + `in_progress` 対応

`findResumePoint` (private) を `getResumeInfo` (public) に拡張。内部で `run()` も使う。

```typescript
export interface ResumeInfo {
  resumeIndex: number;
  completedStages: StageId[];
  failedStages: StageId[];       // status === "failed" のステージ
  stuckStages: StageId[];        // status === "in_progress" のステージ
  nextStage: StageId | null;     // null = 全完了
  isFullyCompleted: boolean;
}
```

ロジック:
1. まず `in_progress` のステージを後方から探す → 見つかればそこから再開
2. なければ従来通り最後の `completed/passed` の次から再開
3. `failedStages` と `stuckStages` を収集して返す

`run()` メソッドの `startIndex` 計算を更新:
```
force → 0
startFromStage → indexOf(startFromStage)
resume → getResumeInfo().resumeIndex
else → 0
```

### Step 2: `engine.ts` — handler 実行の try-catch

`await handler(state, options)` を try-catch で包み:
- ステージを `"failed"` に設定
- `final_status` を `"aborted"` に設定
- `saveState()` で永続化
- `PipelineError` 系はそのまま re-throw、それ以外は `PipelineError` でラップ

### Step 3: `types.ts` — `PipelineOptions` 拡張

```typescript
export interface PipelineOptions {
  // 既存フィールド...
  startFromStage?: StageId;  // 特定ステージから強制開始
}
```

### Step 4: `cli.ts` — resume フローの改善

`runInteractive` を以下のように分岐:

**resume かつ spec 完了済みの場合:**
```
1. loadState() で状態読み込み
2. getResumeInfo() でサマリー取得
3. 完了済み → メッセージ表示して return
4. 失敗ステージあり → ステージ選択 UI 表示:
   - "自動検出（失敗箇所から）"
   - "〇〇ゲートから再実行"（失敗したゲートごとに）
   - "最初からやり直す"
5. サマリーを p.note() で表示:
   ┌ 再開サマリー ─────────────────────┐
   │  Stage 1: 仕様書生成 ... ✓ 完了   │
   │  仕様レビューゲート ... ✓ パス     │
   │  Stage 2: テスト生成 ... ✓ 完了   │
   │  テストレビューゲート ... ✗ 失敗   │
   │  → テストレビューゲート から再開   │
   └────────────────────────────────────┘
6. インタビューをスキップ → パイプライン直行
```

**resume かつ spec 未完了の場合:**
通常のインタビューフローへ

**resume でない場合（最初から）:**
通常のインタビューフローへ

`taskDescription` は resume 時は undefined で OK（各ステージはディスク上の contracts/tests を読む）。

### Step 5: テスト追加

`tests/integration/engine.test.ts` に追加:
- `in_progress` のステージがある場合、そこから再開する
- handler が予期しない例外を投げた場合、ステージが `failed` + `final_status` が `aborted` になる
- `startFromStage` で指定ステージから開始する
- `getResumeInfo()` が正しい `ResumeInfo` を返す

### Step 6: エクスポート更新

`src/index.ts` に `ResumeInfo` 型を追加エクスポート。

## 実装順序

TDD に従い、各ステップで RED → GREEN → REFACTOR:

1. **engine テスト** → `getResumeInfo` 実装 (Step 1)
2. **engine テスト** → handler try-catch 実装 (Step 2)
3. **types 変更** (Step 3)
4. **engine テスト** → `startFromStage` 実装 (Step 1 の run 部分)
5. **cli 変更** (Step 4) — ユニットテストは既存パターンに従う
6. **エクスポート更新** (Step 6)

各ステップ後に `npm run typecheck && npm run lint && npm run test` を実行。

## 検証方法

1. `npm run test` で全 190+ テスト + 新規テストが通ること
2. `npm run typecheck` で型エラーなし
3. `npm run build` でビルド成功
4. othello-online で実際に `npx blueprint --resume` を試し、サマリー表示・ステージ選択が動作すること
