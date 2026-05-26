# Phase 1 Data Model: ローカルWebツール群ダッシュボード基盤

**Feature**: [001-tools-dashboard](./spec.md)
**Date**: 2026-05-26
**Status**: Complete

## 概要

本フィーチャーで扱う「データ」は以下 2 種類のみ:

1. **Tool** — ダッシュボードに掲載される 1 ツールのメタ情報 (静的、コード宣言)
2. **DbHealth** — DB ヘルスチェック結果 (動的、SSR の都度算出される一時値)

PostgreSQL に永続化するエンティティは本フィーチャーでは **存在しない**。テーブル定義は行わない。今後のツール (markdown→PDF / 時刻変換 / JSON フォーマッタ等) が必要に応じて自分のテーブルを別フィーチャーで追加する想定。

---

## エンティティ 1: `Tool`

ダッシュボード一覧に並ぶ 1 エントリの定義。`lib/tools/types.ts` で型を定義し、`lib/tools/registry.ts` で配列として宣言する。

### フィールド

| フィールド名 | 型 | 必須 | 説明 |
|--------------|----|------|------|
| `id`          | `string` | ✅ | 不変の一意識別子。`slug` と同値でもよいが、将来名前変更が起きても識別を保つために別フィールドとして保持する (例: `markdown-to-pdf`) |
| `slug`        | `string` | ✅ | URL パスに使う英数小文字 + ハイフン。`/tools/<slug>` でアクセスされる (例: `markdown-pdf`) |
| `name`        | `string` | ✅ | ダッシュボード一覧で表示する日本語名 (例: `Markdown → PDF`) |
| `description` | `string` | ✅ | カードに表示する短い説明 (1〜2 行程度) |
| `category`    | `string \| undefined` | 任意 | 任意のカテゴリラベル (例: `text`, `time`)。一覧のグループ表示で使う将来余地 |
| `order`       | `number \| undefined` | 任意 | 表示順。未指定なら `name` の昇順で並べる |
| `status`      | `"available" \| "coming-soon"` | ✅ | `coming-soon` の場合は一覧でも「未実装」を視覚的に区別し、`/tools/<slug>` ではプレースホルダを返す |

### バリデーションルール (Edge Cases / User Story 3 受け入れ基準 #2)

`registry.ts` 内のガード関数 `assertValidTools()` がアプリ起動時 (= モジュールロード時) に走り、以下を検証する。違反するエントリは **除外** され、その旨を `console.warn` で残す。ダッシュボード全体は壊さない。

- `id`, `slug`, `name`, `description` のいずれかが空文字 / 未定義 → 除外
- `slug` が `^[a-z0-9-]+$` にマッチしない → 除外
- 同一 `slug` または同一 `id` が複数登場 → **最初の 1 件のみ採用し、残りを除外** (warn)
- `status` が許容値以外 → 除外
- `order` が `number` 以外 → `undefined` として扱う (除外ではなく許容)

### 並び順ルール

- `order` が指定されているエントリを昇順 → 続けて未指定のエントリを `name` の昇順で並べる
- 安定ソートにより、同 `order` 内では宣言順を保つ

### 状態遷移

- `Tool.status` は宣言時に決まり、ランタイムでは遷移しない (静的データ)
- 「未実装 → 実装済み」への移行は、PR で `status` を `coming-soon` から `available` に書き換える運用

### 例 (registry.ts のイメージ)

```typescript
// lib/tools/registry.ts
import type { Tool } from "./types";

const RAW_TOOLS: Tool[] = [
  {
    id: "markdown-pdf",
    slug: "markdown-pdf",
    name: "Markdown → PDF",
    description: "日本語と mermaid を含む Markdown を PDF に書き出す",
    category: "text",
    status: "coming-soon",
  },
  {
    id: "time-convert",
    slug: "time-convert",
    name: "時刻変換",
    description: "Unixtime ⇄ ISO 8601 など各種時刻表記の相互変換",
    category: "time",
    status: "coming-soon",
  },
  {
    id: "json-format",
    slug: "json-format",
    name: "JSON フォーマッタ",
    description: "JSON の整形・最小化・キー並び替え",
    category: "text",
    status: "coming-soon",
  },
];

export const tools = assertValidTools(RAW_TOOLS);
```

> **重要**: 上記 3 件は spec の「後続予定のツール」を **カタログ準備として** 載せる例。本フィーチャーでは「ツール本体は実装しない」ため、3 件とも `status: "coming-soon"` で登録され、クリックすると未実装プレースホルダに遷移する。本当に「初期 0 件」にしたい場合は配列を空にして空状態 (User Story 1 受け入れ基準 #2) を確認する。

---

## エンティティ 2: `DbHealth`

DB ヘルスチェックの一時的な結果。永続化されず、SSR の都度 `lib/db/health.ts` が算出して `app/page.tsx` に渡す。

### フィールド

| フィールド名 | 型 | 説明 |
|--------------|----|------|
| `status`  | `"ok" \| "unreachable"` | `SELECT 1` が成功すれば `ok`、例外なら `unreachable` |
| `latency` | `number` (ms) | クエリ往復時間 (`ok` 時のみ; `unreachable` 時は `undefined`) |
| `error`   | `string \| undefined` | `unreachable` 時の短い理由 (例: `connection refused`)。スタックトレースは UI に出さない (サーバログのみ) |

### 関連 (FR-009 への対応)

- `app/page.tsx` (Server Component) は `getDbHealth()` を `await` し、結果をダッシュボードヘッダ下の小さなインジケータ領域に渡す
- `status === "unreachable"` でもページのレンダリングは継続。利用者には "DB は接続できません。後続ツールのうち DB を使うものは正常に動作しない可能性があります" 程度のメッセージを表示
- サーバ側ではエラー詳細を `console.error` で残す (憲法 V: 失敗は黙って飲み込まない)

---

## 関係図

```text
            (静的・コード宣言)              (動的・SSR 毎)
  Tool[]  ◀──────  registry.ts          DbHealth  ◀── health.ts (SELECT 1)
     │                                       │
     └─────────────────┬─────────────────────┘
                       │
                  app/page.tsx (Server Component, SSR)
                       │
                       ▼
            ダッシュボードトップの HTML
```

カタログ (`Tool[]`) と DB ヘルス状態は互いに独立。DB が落ちていてもツール一覧は描画される (FR-009)。
