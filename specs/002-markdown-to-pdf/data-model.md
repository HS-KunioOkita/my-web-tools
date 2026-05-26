# Phase 1: データモデル (Markdown → PDF 変換ツール)

**Feature**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)
**Date**: 2026-05-26

本フィーチャーは **永続化を行わない** (FR-012 / SC-007)。よって DB スキーマは追加しない。本書ではプロセスメモリ上の値 (リクエスト処理中だけ存在する) と、コード上の不変な構成データを「エンティティ」として整理する。

---

## 1. データの永続性レベル

| 種別 | 例 | 寿命 | 物理的所在 |
|------|----|------|------------|
| **コード上の不変データ** | `PdfTemplate` 配列 | プロセス起動中ずっと | `lib/markdown-pdf/templates/` (TypeScript ソース) |
| **リクエスト処理中の一時データ** | Markdown 文字列、生成 PDF バイト列 | Route Handler 関数の return まで | Node プロセスのヒープ |
| **ブラウザ側 UI 状態** | 入力中の Markdown、選択中テンプレ | タブを閉じるまで | クライアント React state |
| **永続化対象** | — | — | **なし (DB / FS いずれにも書かない)** |

---

## 2. エンティティ

### 2.1 `PdfTemplate` (コード上の不変データ)

PDF とプレビューの見た目を決める設定群。`lib/markdown-pdf/templates.ts` で 3 件の定数として宣言される。

```typescript
export type PdfTemplateId = "standard" | "business" | "technical";

export interface PdfTemplate {
  /** 一意識別子。URL/POSTボディ/UIで使う。 */
  id: PdfTemplateId;

  /** UI に出る表示名 (日本語可)。 */
  name: string;

  /** 1〜2行の用途説明。 */
  description: string;

  /** mermaid 初期化に渡すテーマ名。 */
  mermaidTheme: "default" | "neutral" | "forest" | "dark";

  /**
   * プレビュー領域 / PDF 用 HTML に挿入する CSS 文字列。
   * 通常の CSS 構文 (セレクタは `.markdown-pdf-root` 以下にスコープ)。
   */
  css: string;
}
```

#### 制約

- `id` は `"standard" | "business" | "technical"` のいずれか (将来 4 件目を追加する場合は型を拡張)
- `name`, `description`, `css` は空文字不可
- 配列内で `id` 重複禁止

#### 振る舞い

- `getTemplate(id: string): PdfTemplate` — 引数 id に一致するテンプレートを返す。未知の id は `console.warn` を出して `standard` にフォールバック (憲法 V: Observable)
- `listTemplates(): PdfTemplate[]` — UI 表示順 (`standard` → `business` → `technical`) で配列を返す

#### 関係

- **`MarkdownDocument` (2.2) と疎結合**: テンプレは Markdown 内容に依存しない。同じ Markdown でも違うテンプレで描画でき、その逆も成立する
- **`RenderRequest` (2.3) が `templateId` で参照する**

---

### 2.2 `MarkdownDocument` (リクエスト処理中の一時データ)

利用者が入力した Markdown 本文。**永続化されず**、リクエストハンドラのローカル変数として存在するだけ。

```typescript
export interface MarkdownDocument {
  /** Markdown 本文 (UTF-8 文字列)。 */
  source: string;

  /** ダウンロード時のファイル名ベース (拡張子なし、空可)。 */
  filenameBase: string;
}
```

#### 制約

- `source` は `string`、長さ 1 文字以上、UTF-8 で 1,048,576 バイト (1 MiB) 以下、かつ 50,000 文字以下 (Assumptions / SC-001 を達成するため)
- 上限超過の場合はリクエストを `400 Bad Request` で拒否する (FR-010 の延長: 不正入力で空 PDF を作らない)
- `filenameBase` は空文字または `[^/\\:*?"<>|\r\n]` を満たすこと (OS ファイル名で安全な範囲)。空の場合はサーバ側で `"document"` を補う

#### 状態遷移

`MarkdownDocument` は不変。受信 → バリデーション → レンダパイプライン投入 → return で破棄、の一方向。

---

### 2.3 `RenderRequest` (HTTP リクエストボディ)

サーバ側 PDF 生成 API のリクエスト形。`MarkdownDocument` を含むラッパ。

```typescript
export interface RenderRequest {
  markdown: string;             // → MarkdownDocument.source
  templateId: PdfTemplateId;    // → PdfTemplate.id
  filename?: string;            // → MarkdownDocument.filenameBase (任意)
}
```

#### バリデーション (Route Handler 受信時)

| フィールド | チェック | 失敗時 |
|-----------|----------|--------|
| `markdown` | 型: string / 文字長 ≥ 1 / 文字長 ≤ 50,000 / バイト長 ≤ 1 MiB | `400 BAD_REQUEST_MARKDOWN` |
| `templateId` | `listTemplates()` の id 集合に含まれる | `400 BAD_REQUEST_TEMPLATE` |
| `filename` | undefined もしくは OS 安全文字のみ / 長さ ≤ 100 | `400 BAD_REQUEST_FILENAME` |

すべて成功した場合、`{document: MarkdownDocument, template: PdfTemplate}` に正規化してレンダ層に渡す。

---

### 2.4 `RenderArtifact` (リクエスト処理中の一時データ)

`page.pdf()` の戻り値。

```typescript
export interface RenderArtifact {
  pdf: Buffer;            // PDF バイナリ (メモリ上)
  generatedAt: Date;      // ログ用
  byteSize: number;       // ログ用 (= pdf.length)
}
```

- レスポンスストリームに書き出した後、関数スコープ外でガベージコレクションに任せる
- **どのコードパスでもファイルシステムに書かない**: `page.pdf()` は `path` オプションを渡さない呼び出しのみ許可する (Linter ルール対象としても良い)

---

### 2.5 `PreviewState` (クライアント React state)

ツールページ (`app/tools/markdown-pdf/page.tsx`) のローカル状態。サーバには送信されない。

```typescript
interface PreviewState {
  source: string;                 // textarea の値
  templateId: PdfTemplateId;      // 選択中のテンプレ
  renderedHtml: string;           // markdown-it が生成した HTML
  mermaidStatus: "idle" | "rendering" | "ready" | "error";
  inputError: null | {            // 上限超過などの即時フィードバック
    code: "TOO_LARGE" | "EMPTY";
    message: string;
  };
}
```

#### 振る舞い

- `source` の変化は 150ms のデバウンスを経て `renderedHtml` を再計算 (SC-001 の達成上、入力ごとの再描画頻度を抑える)
- `templateId` の変化は即時にプレビュー <style> を差し替え
- `mermaidStatus` は `mermaid.run()` のライフサイクルに紐づき、`ready` になるまでダウンロードボタンは活性化しない (FR-010 の補強: 図の途中描画状態で PDF 化させない)

---

## 3. ER 図 (簡易)

```text
+----------------+        +---------------------+
| PdfTemplate    |        | MarkdownDocument    |
| (3 件定数)     |        | (リクエスト一時)    |
+----------------+        +---------------------+
       ^                            ^
       |                            |
       |                            |
   templateId                   source/filename
       |                            |
       +---------- referenced ----------+
                       in
                  RenderRequest (HTTP body)
                       |
                       v
                  RenderArtifact (in-memory Buffer)
                       |
                       v
                  HTTP Response (application/pdf)
                       |
                       v
                  (関数終了で GC、永続化しない)
```

---

## 4. データの境界と非永続化保証

- **書かない場所**: PostgreSQL (`my-web-tools` の DB スキーマには本フィーチャー由来のテーブルを追加しない)、`lib/` 配下 (テンプレ CSS のみ)、`app/` 配下、`tmp/`、`uploads/`、リポジトリ作業ツリー
- **読まない場所**: 同上 (`MarkdownDocument` の `source` はリクエストボディからのみ取得する)
- **ログには本文を出さない**: 憲法 V (Observable) に従い、リクエスト境界で「Markdown 文字数」「テンプレ ID」「処理時間」「エラーがあればその種別」のみログする。本文の中身はログに含めない (機密漏洩リスクを最小化)

この境界は実装後 `find` / `grep` で検証可能であり、SC-007 (運用検査で残存が確認されないこと) を満たす根拠となる。
