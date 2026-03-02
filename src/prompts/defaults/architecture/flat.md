# Flat パターン

config.yaml の `architecture.pattern: flat` 選択時に適用。

## 概要

レイヤー分割を行わないフラットな構成。小規模プロジェクトやプロトタイプ向け。

## ディレクトリ構造

```
src/
├── index.ts               # エントリーポイント
├── {feature-name}.ts      # 機能ごとに 1 ファイル
├── {feature-name}.test.ts # テスト（同階層）
├── types.ts               # 型定義
└── utils.ts               # ユーティリティ
```

## 依存方向ルール

- 制約なし（レイヤー分割がないため）
- ただし循環 import は禁止

## Contract タイプ → 配置

| Contract タイプ | 配置先 |
|----------------|--------|
| api | `src/{contract-name}.ts` |
| external | `src/{provider-name}.ts` |
| file | `src/{feature-name}.ts` |

## 使用場面

- 10 ファイル以下の小規模プロジェクト
- プロトタイプ / PoC
- 単一ドメインの CLI ツール
- 規模拡大時は `layered` または `clean` への移行を検討
