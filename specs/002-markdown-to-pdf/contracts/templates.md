# Contract: PDF デザインテンプレート

**Feature**: [002-markdown-to-pdf](../spec.md)
**Date**: 2026-05-26
**Implementation file**: `lib/markdown-pdf/templates.ts` + `lib/markdown-pdf/templates/<id>.css`

本書は「PDF デザインテンプレートを追加・修正する開発者」と「テンプレを利用するレンダパイプライン」の間の契約を定める。

---

## 1. 触るファイル

新しいテンプレを追加するとき、または既存テンプレを修正するときに触れるのは以下のみ:

1. `lib/markdown-pdf/templates.ts` — `TEMPLATES` 配列に 1 件追加 (もしくは既存定義を編集)
2. `lib/markdown-pdf/templates/<id>.css` — そのテンプレ専用の CSS

これ以外のファイル (`page.tsx`, `api/render/route.ts`, テスト等) は **触らないこと** (憲法 IV: Surgical Changes)。

---

## 2. テンプレ定義の型

```typescript
// lib/markdown-pdf/types.ts
import type { CSSString } from "./css";

export type PdfTemplateId = "standard" | "business" | "technical";
// ↑ 新規テンプレを増やすときは PdfTemplateId に追加し、本ファイルの差分は最小化する

export interface PdfTemplate {
  id: PdfTemplateId;
  name: string;          // UI 表示名 (日本語)
  description: string;   // 1〜2行の用途説明
  mermaidTheme: "default" | "neutral" | "forest" | "dark";
  css: CSSString;        // 文字列としての CSS (import で読み込む)
}
```

`CSSString` は型エイリアス `type CSSString = string` (将来テンプレ動的化への布石は持たない / YAGNI)。

---

## 3. 既定テンプレ (本フィーチャー初期リリース)

| id | name (UI 表示) | description | mermaidTheme | 用途 |
|----|---------------|--------------|--------------|------|
| `standard` | 標準 | 汎用ドキュメント | `default` | 一般的なドキュメント、READMEの清書、議事録など |
| `business` | ビジネス文書 | 社内報告書・配布物向け | `neutral` | 表紙感のある見出し、明朝/ゴシック混在 |
| `technical` | 技術文書 | 開発者向け仕様書 | `forest` | 全文ゴシック、コードブロック幅を活かす、見出しに色 |

UI 表示順は **配列宣言順** とする。`standard` を先頭に置き、初回ロード時の既定値 (`getDefaultTemplate()`) としても扱う。

---

## 4. CSS スコープ規約

テンプレ CSS は以下のセレクタ規約に従う。

### 4.1 ルートクラス

すべてのテンプレ用セレクタは `.markdown-pdf-root` 配下にスコープすること。プレビュー領域・PDF 用 HTML のいずれも、Markdown レンダ HTML を `<div class="markdown-pdf-root">...</div>` で包む。

```css
/* OK */
.markdown-pdf-root { ... }
.markdown-pdf-root h1 { ... }
.markdown-pdf-root pre code { ... }

/* NG: ページ全体に漏れるセレクタ */
body { font-family: ...; }     /* 親 (ダッシュボード) のスタイルを破壊する */
h1 { color: red; }              /* 同上 */
```

### 4.2 CSS 変数 (共通)

各テンプレは以下の CSS 変数を `.markdown-pdf-root` に上書きで定義することで、最小差分で見た目を切り替えられる:

```css
.markdown-pdf-root {
  --mdpdf-page-margin: 25mm;       /* @page margin の値と一致させる */
  --mdpdf-font-base: -apple-system, "Hiragino Sans", "Yu Gothic UI",
                     "Noto Sans JP", sans-serif;
  --mdpdf-font-heading: var(--mdpdf-font-base);
  --mdpdf-font-mono: "JetBrains Mono", "SFMono-Regular", "Menlo",
                     "Consolas", monospace;
  --mdpdf-color-text: #1a1a1a;
  --mdpdf-color-heading: #1a1a1a;
  --mdpdf-color-accent: #2563eb;
  --mdpdf-color-rule: #d1d5db;
  --mdpdf-color-code-bg: #f3f4f6;
}
```

共通 CSS (`lib/markdown-pdf/templates/_base.css`) でこれら変数を使ったレイアウト/タイポグラフィを定義し、テンプレ別 CSS はこれら変数を「上書き宣言する」ことに専念する。

### 4.3 `@page` ルール

A4 縦・余白だけは `@page` で指定し、Playwright `page.pdf({format: "A4", printBackground: true})` と整合させる:

```css
@page {
  size: A4;
  margin: var(--mdpdf-page-margin);
}
```

これを共通 CSS に置き、テンプレ別 CSS で `--mdpdf-page-margin` の値だけ変える。

---

## 5. 必須サポート要素

各テンプレ CSS は、少なくとも以下の Markdown 要素に対し「読める / 印刷しても破綻しない」状態を保証すること。テンプレ追加時のセルフチェック項目:

- `h1`〜`h6` (階層が視覚的に判別可能)
- `p`, `strong`, `em`, `del`, `code`, `a`
- `ul`, `ol`, ネストリスト
- `blockquote`
- `pre code` (コードブロック、横スクロールではなく折り返し or オーバフロー処理)
- `table` (GFM 表組み、罫線あり)
- `hr`
- `img` (画像、最大幅 100%)
- `.mermaid > svg` (mermaid 描画後)
- mermaid エラー用プレースホルダ (例: `.markdown-pdf-mermaid-error`)

---

## 6. 解決 / フォールバック

```typescript
export function getTemplate(id: string): PdfTemplate;
export function listTemplates(): PdfTemplate[];
export function getDefaultTemplate(): PdfTemplate;
```

- `getTemplate("standard" | "business" | "technical")` — 一致するテンプレを返す
- `getTemplate(unknown id)` — `console.warn` で `unknown template id; falling back to "standard"` を出し、`standard` を返す (憲法 V: Observable)
- `listTemplates()` — 宣言順
- `getDefaultTemplate()` — `getTemplate("standard")` のシュガー

UI もサーバ Route Handler も、未知 id を受けたら同じフォールバックパスを通る。これにより「UI が壊れて未定義 id が送られた」状況でも 500 にならず復旧する。

---

## 7. 不正テンプレ定義の振る舞い (Edge Cases)

| ケース | 結果 |
|--------|------|
| `TEMPLATES` 配列に `id` 重複が混入 | 起動時に `assertValidTemplates()` が `throw` (型上は防げないため最後のセーフネット) |
| `name` / `description` / `css` のいずれかが空文字 | 起動時 throw (同上) |
| 配列が空 | 起動時 throw |

これらは **デプロイ前の起動時に必ず気づく構造**にすることで、運用中にテンプレが消えていたという事故を防ぐ (憲法 V)。

---

## 8. 新規テンプレ追加手順 (実例)

「カジュアル」テンプレを増やす場合:

```typescript
// 1. lib/markdown-pdf/types.ts
export type PdfTemplateId = "standard" | "business" | "technical" | "casual";

// 2. lib/markdown-pdf/templates/casual.css  (新規ファイル)
@import "./_base.css";
.markdown-pdf-root {
  --mdpdf-font-base: "Comic Sans MS", "Hiragino Maru Gothic ProN", cursive;
  --mdpdf-color-accent: #ec4899;
  --mdpdf-page-margin: 22mm;
}

// 3. lib/markdown-pdf/templates.ts (TEMPLATES に 1 行追加)
{
  id: "casual",
  name: "カジュアル",
  description: "ブログ風のやわらかい見た目",
  mermaidTheme: "default",
  css: casualCss,  // import casualCss from "./templates/casual.css?raw";
},
```

`?raw` インポートは Next.js の `import.meta.url` ベースで動作する。Webpack 設定に `asset/source` ローダを 1 行追加するか、Next.js 15 既定の Turbopack の挙動に従う。詳細は [research.md](../research.md) §R-4 と [quickstart.md](../quickstart.md) に記述する。

---

## 9. 後方互換性

- `PdfTemplateId` の値は API 契約に露出する (`POST /api/render` の `templateId`)
- **既存 id (`standard` / `business` / `technical`) を削除・改名するときは、本契約の差分とともに UI / API クライアントへの影響を必ず確認する**
- 表示名 (`name`) ・説明文 (`description`) ・CSS の見た目変更は後方互換性に影響しない
