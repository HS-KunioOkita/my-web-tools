---

description: "Task list for 002-markdown-to-pdf"
---

# Tasks: Markdown → PDF 変換ツール

**Input**: Design documents from `/specs/002-markdown-to-pdf/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/render-api.md](./contracts/render-api.md), [contracts/templates.md](./contracts/templates.md), [quickstart.md](./quickstart.md)

**Tests**: 採用する (plan.md で Vitest unit 2 本 + Playwright E2E 1 本を明示)。各 User Story の挙動テストを含める。

**Organization**: タスクは User Story 単位でグループ化し、各ストーリーが独立に実装・検証できることを保証する。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可 (異なるファイル、未完了タスクへの依存なし)
- **[Story]**: 所属する User Story (US1 / US2 / US3 / US4)。Setup / Foundational / Polish は付与しない
- 各タスクの説明には対象ファイル (リポジトリルートからの相対パス) を明示

## Path Conventions

リポジトリルート直下のフラット構成 (plan.md "Structure Decision"):

- ソース: `app/tools/markdown-pdf/`, `lib/markdown-pdf/`, `lib/tools/registry.ts`
- テスト: `tests/unit/`, `tests/e2e/`
- 設定: `package.json` (依存追加)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 本フィーチャー固有の依存と Chromium ランタイムを揃える

- [X] T001 ランタイム依存を追加: `pnpm add markdown-it@^14 mermaid@^11 playwright@^1.60`、`pnpm add -D @types/markdown-it` → `package.json`, `pnpm-lock.yaml`
- [X] T002 Playwright Chromium バイナリの導入を確認 (devDeps の `@playwright/test` と共有): `pnpm exec playwright install chromium`。既存環境ならスキップ可、CI / 新規 clone では必須 → 副作用のみ (ファイル変更なし)

**Checkpoint**: `pnpm install` が成功し、`import { chromium } from "playwright"` が解決可能、`fc-list :lang=ja` が日本語フォントを返す (Linux のみ要確認、macOS/Windows は標準で OK)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 全 User Story が共有する Markdown→HTML パイプライン・Chromium 起動・テンプレ解決・ファイル名生成を整える

**⚠️ CRITICAL**: 以下が揃うまで User Story の実装は開始できない

- [X] T003 [P] `lib/markdown-pdf/types.ts` を作成 → `lib/markdown-pdf/types.ts`
- [X] T004 [P] `lib/markdown-pdf/templates/_base.ts` (CSS 文字列, `?raw` は不採用) → `lib/markdown-pdf/templates/_base.ts`
- [X] T005 [P] `lib/markdown-pdf/templates/standard.ts` (CSS 文字列, `?raw` は不採用) → `lib/markdown-pdf/templates/standard.ts`
- [X] T006 [P] `lib/markdown-pdf/markdown.ts` を作成 → `lib/markdown-pdf/markdown.ts`
- [X] T007 [P] `lib/markdown-pdf/filename.ts` を作成 (RFC 5987 + ASCII fallback) → `lib/markdown-pdf/filename.ts`
- [X] T008 [P] `lib/markdown-pdf/chromium.ts` を作成 (singleton + process exit cleanup) → `lib/markdown-pdf/chromium.ts`
- [X] T009 `lib/markdown-pdf/templates.ts` (TEMPLATES = [standard]、getTemplate / listTemplates / getDefaultTemplate / assertValidTemplates、`getBaseCss()` を追加) → `lib/markdown-pdf/templates.ts`
- [X] T010 `lib/markdown-pdf/html.ts` を作成 (mermaid 関連はサーバ側で page.addScriptTag するため HTML には含めず、最小化) → `lib/markdown-pdf/html.ts`
- [X] T011 [P] `lib/markdown-pdf/mermaid-bundle.ts` を作成 (`getMermaidBundlePath()` を返す。ESM ではなく UMD-like `mermaid.min.js` を addScriptTag で注入する設計に変更) → `lib/markdown-pdf/mermaid-bundle.ts`、`lib/markdown-pdf/mermaid-runner.ts` (runner script 本体)
- [X] T012 [P] `lib/markdown-pdf/validation.ts` を作成 → `lib/markdown-pdf/validation.ts`
- [X] T013 Next.js の `?raw` は試行せず CSS を TS の `export default` 文字列で持つ方針に変更 (`next.config.ts` は無改変)

**Checkpoint**: 単体では呼び出されないが、`lib/markdown-pdf/` 配下のモジュール群がすべて型エラーなくコンパイルでき、`renderMarkdown("# テスト")` がブラウザコンソールで HTML 文字列を返せる状態

---

## Phase 3: User Story 1 - Markdown をペーストしてプレビュー確認の上 PDF をダウンロードする (Priority: P1) 🎯 MVP

**Goal**: ツール画面で日本語を含む Markdown を textarea にペーストすると 1 秒以内にプレビューが描画され、「PDF をダウンロード」ボタンを押すと標準テンプレで PDF がダウンロードされる。日本語が文字化けせず、プレビューと PDF のレイアウトが視覚的に一致する。

**Independent Test**:

1. `pnpm dev` でアプリ起動
2. ブラウザで <http://localhost:3000/tools/markdown-pdf> を開く
3. 「# こんにちは\n\n世界の皆さん、お元気ですか？」をペースト
4. プレビューに同じ内容が描画されることを確認 (SC-001)
5. ダウンロードボタンを押し、`document.pdf` が保存されることを確認
6. PDF を開いて日本語が文字化けせず正しく表示されることを確認 (SC-002, SC-003)

### Tests for User Story 1 ⚠️

> 実装より先に書き、最初は FAIL することを確認してから T017〜T020 を進める

- [X] T014 [P] [US1] `tests/e2e/markdown-pdf.spec.ts` を作成 (シナリオ: (a) `/tools/markdown-pdf` を開き textarea に日本語 + 表 + コードブロックを含む Markdown をペーストするとプレビューに `<h1>`/`<p>`/`<table>`/`<pre>` が出現する [waitForSelector で確認], (b) ダウンロードボタンを `page.waitForEvent("download")` で監視しつつクリック、保存されたファイルが先頭 `%PDF-1.` で始まり 1KB 以上であること, (c) 入力欄を空にするとダウンロードボタンが `disabled` になること) → `tests/e2e/markdown-pdf.spec.ts`
- [X] T015 [P] [US1] `tests/unit/markdown-pipeline.test.ts` を作成 (3 ケース: (a) ```` ```mermaid ```` フェンスは `<div class="mermaid">` に変換される, (b) ```` ```python ```` 等の通常フェンスは `<pre><code class="language-python">` のまま, (c) `<script>` タグを含む Markdown は `html: false` 設定によりエスケープされて出力される) → `tests/unit/markdown-pipeline.test.ts`
- [X] T016 [P] [US1] `tests/unit/templates.test.ts` を作成 (3 ケース: (a) `getTemplate("standard")` が定義済みオブジェクトを返す, (b) `getTemplate("unknown")` が console.warn を出した上で standard を返す, (c) `assertValidTemplates([])` が throw する) → `tests/unit/templates.test.ts`

### Implementation for User Story 1

- [X] T017 [P] [US1] `app/tools/markdown-pdf/markdown-pdf.css` を作成 (ツール画面の UI シェル: 2 カラム grid [editor 左 / preview 右], モバイル幅では縦並び, テキストエリアと preview 領域の最小高さ, ダウンロードボタンの活性/非活性スタイル, アップロード zone のドラッグオーバ視覚効果。プレビュー領域内 `.markdown-pdf-root` の CSS は触らない [テンプレ CSS の責務]) → `app/tools/markdown-pdf/markdown-pdf.css`
- [X] T018 [US1] `app/tools/markdown-pdf/page.tsx` を **Client Component** として実装 (`"use client";`。state: `source`, `templateId`, `renderedHtml`, `mermaidStatus`, `inputError`。`source` 変更は 150ms デバウンスで `renderMarkdown` を呼び `renderedHtml` 更新 → プレビュー領域に `dangerouslySetInnerHTML` で挿入 → 直後に `mermaid.run({nodes: [...querySelectorAll(".markdown-pdf-root .mermaid")]})` を実行し `mermaidStatus` を `rendering` → `ready` に遷移。ダウンロードボタンは `source.length > 0 && mermaidStatus === "ready" && !inputError` のとき活性。クリック時に `fetch("/tools/markdown-pdf/api/render", {method: "POST", body: JSON.stringify({markdown: source, templateId, filename})})` → 成功時 `blob` を `URL.createObjectURL` → `<a download>` クリック → revoke。テンプレ初期値は `getDefaultTemplate().id`。テンプレ選択 UI は本タスクでは非表示 [US2 で追加]) → `app/tools/markdown-pdf/page.tsx`
- [X] T019 [US1] `app/tools/markdown-pdf/api/render/route.ts` を作成 (`POST` ハンドラのみ export。`parseRenderRequest(await request.json())` でバリデーション → エラーなら `400` + `{error, code}`。成功時: `buildHtmlDocument({bodyHtml: renderMarkdown(document.source), template, mermaidScript: getMermaidBundle()})` → `(await getBrowser()).newPage()` → `page.setContent(html, {waitUntil: "load"})` → `page.waitForFunction(() => document.body.dataset.mermaidReady === "true", {timeout: 10000})` (timeout 時は `MERMAID_TIMEOUT` で 500) → `page.pdf({format: "A4", printBackground: true})` → `page.close()` → `new Response(pdfBuffer, {status: 200, headers: {"Content-Type": "application/pdf", "Content-Disposition": buildContentDisposition(document.filenameBase || "document"), "Content-Length": ..., "Cache-Control": "no-store", "X-Render-Duration-Ms": String(durationMs)}})`。`GET`/`PUT` 等は `Response("...", {status: 405, headers: {Allow: "POST"}})`。Markdown 本文・PDF バッファをログに含めない。エラーは `code` を付けて構造化ログ) → `app/tools/markdown-pdf/api/render/route.ts`
- [X] T020 [US1] `lib/tools/registry.ts` の `markdown-pdf` エントリの `status` を `"coming-soon"` → `"available"` に変更 (他フィールドは触らない。ダッシュボードカードの「準備中」バッジが消えることを目視確認) → `lib/tools/registry.ts`

**Checkpoint**:

- `pnpm test:unit` の `markdown-pipeline.test.ts` と `templates.test.ts` がパス
- dev サーバ起動状態で `pnpm test:e2e tests/e2e/markdown-pdf.spec.ts` がパス
- quickstart.md §4 の User Story 1 シナリオを手動で通せる (日本語の文字化けなし)
- ここまでで MVP として独立に出荷可能 (テンプレは standard のみ、アップロードなし、mermaid なしの Markdown が PDF 化できる)

---

## Phase 4: User Story 2 - PDF デザインテンプレートを選んで出力スタイルを切り替える (Priority: P2)

**Goal**: テンプレ選択 UI でテンプレを切り替えると、プレビュー画面が即座に新スタイルで再描画され、その状態で生成した PDF も選択中テンプレに従う。最低 3 種類 (standard / business / technical) を提供する。

**Independent Test**:

1. US1 完了後の dev サーバで `/tools/markdown-pdf` を開く
2. 任意の Markdown を入力してプレビュー描画を確認
3. テンプレ選択 UI で "ビジネス文書" を選ぶ → プレビューが切り替わることを確認
4. ダウンロード → PDF を開いて見た目が切替後のものになっていることを確認 (SC-005)
5. "技術文書" "標準" も同様

### Implementation for User Story 2

- [X] T021 [P] [US2] `lib/markdown-pdf/templates/business.ts` を作成 (`@import "./_base.css";` + ビジネス文書向け上書き: 見出しゴシック / 本文明朝、`--mdpdf-page-margin: 30mm`、`--mdpdf-font-base: "Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP", serif`、`--mdpdf-font-heading: "Yu Gothic UI", "Hiragino Sans", "Noto Sans JP", sans-serif`、アクセント色 `#1f2937`) → `lib/markdown-pdf/templates/business.css`
- [X] T022 [P] [US2] `lib/markdown-pdf/templates/technical.ts` を作成 (`@import "./_base.css";` + 技術文書向け上書き: 全文ゴシック、`--mdpdf-page-margin: 20mm`、コードブロック幅広め、`h1`/`h2` に色 `--mdpdf-color-accent: #15803d`、`h1::before { content: counter(h1) ". "; }` 風の番号付け [簡易にする場合は省略可]) → `lib/markdown-pdf/templates/technical.css`
- [X] T023 [US2] `lib/markdown-pdf/templates.ts` の `TEMPLATES` 配列に `business` と `technical` を追加 (T021, T022 完了後。`mermaidTheme: "neutral"` (business), `"forest"` (technical)。`PdfTemplateId` 型はすでに 3 値ユニオンになっているはずなので型変更は不要) → `lib/markdown-pdf/templates.ts`
- [X] T024 [US2] `app/tools/markdown-pdf/page.tsx` にテンプレ選択 UI を追加 (`listTemplates()` から radio button もしくは `<select>` を生成。選択値変更で `templateId` state が更新され、プレビュー領域の `<style id="markdown-pdf-template">` の中身がそのテンプレの CSS に差し替わる + mermaid を `theme` 指定で再 `initialize()` + `mermaid.run()` 再実行。選択は API リクエストの `templateId` にも反映) → `app/tools/markdown-pdf/page.tsx`
- [X] T025 [US2] `tests/unit/templates.test.ts` に追加ケース (`getTemplate("business")` / `getTemplate("technical")` が定義済みオブジェクトを返し、`listTemplates()` が 3 件・宣言順で返す) → `tests/unit/templates.test.ts`

**Checkpoint**:

- `pnpm test:unit tests/unit/templates.test.ts` が 5 ケースすべてパス
- 手動で 3 テンプレを切り替えてプレビュー + PDF の見た目が変わることを確認
- US1 の E2E が引き続きパス (壊していないこと確認)

---

## Phase 5: User Story 3 - Markdown ファイルをアップロードしてプレビュー確認の上 PDF をダウンロードする (Priority: P2)

**Goal**: `.md` / `.markdown` ファイルをドラッグ&ドロップまたはファイル選択で読み込むと textarea に内容が反映され、ファイル名は PDF のダウンロード時ファイル名に流用される。拡張子不一致はエラーで拒否、本文サイズ超過もクライアントでチェック。

**Independent Test**:

1. 日本語と表を含む `sample.md` を用意
2. ツール画面のアップロード zone にドラッグ&ドロップ → textarea に内容が反映されプレビューが描画される
3. ダウンロード → `sample.pdf` (拡張子のみ置換) で保存される
4. `bad.txt` をアップロード → 「Markdown ファイルを選択してください」エラーが表示され textarea は変化しない

### Implementation for User Story 3

- [X] T026 [US3] `app/tools/markdown-pdf/page.tsx` にアップロード UI を追加 (drop zone + `<input type="file" accept=".md,.markdown,text/markdown">`。クライアント側で (a) 拡張子 `/\.(md|markdown)$/i` チェック、(b) `file.size <= 1024*1024`、(c) `await file.text()` で UTF-8 として読み込み、(d) 50,000 文字以下チェック、(e) チェック通過なら textarea にセット + ファイル名から拡張子を除いて `filenameBase` state に保存。既存内容がある場合は `window.confirm("入力欄を上書きします。よろしいですか？")` で確認。拒否時はエラーをトースト風 div で表示) → `app/tools/markdown-pdf/page.tsx`

**Checkpoint**:

- 手動で User Story 3 の 4 ステップを通せる (拒否ケース含む)
- US1 / US2 の E2E が引き続きパス
- ネットワークパネルで「アップロード時にサーバへ POST が飛んでいない」ことを確認 (FR-012 / SC-007: クライアント完結)

---

## Phase 6: User Story 4 - mermaid 図を含む Markdown を PDF 化する (Priority: P2)

**Goal**: ```` ```mermaid ```` コードブロックを含む Markdown が、プレビューと PDF の双方で図 (SVG) として描画される。mermaid 構文エラーは該当ブロックがプレースホルダ表示になり、他箇所の描画と PDF 生成はブロックされない (FR-011)。

**Independent Test**:

1. quickstart.md §4 User Story 4 のサンプル Markdown (flowchart + sequenceDiagram) をペースト
2. プレビューにフローチャートとシーケンス図が SVG として描画されることを確認
3. PDF をダウンロードして、図がソースコードではなく図形として埋め込まれ、日本語ラベルも読めることを確認 (SC-004)
4. `flowchart LR` を `flowchart LL` に壊して入力 → プレビュー該当箇所が「mermaid 構文エラー」プレースホルダ表示になり、他箇所と PDF 生成は通常通り進む

### Tests for User Story 4 ⚠️

- [X] T027 [P] [US4] `tests/e2e/markdown-pdf.spec.ts` に mermaid シナリオを追記 (シナリオ: (a) mermaid フェンスを含む Markdown をペーストするとプレビュー内に `.mermaid > svg` が出現する [waitForSelector], (b) その状態でダウンロードボタンを押し、`%PDF-` で始まる 1KB 以上のファイルが保存される) → `tests/e2e/markdown-pdf.spec.ts`

### Implementation for User Story 4

- [X] T028 [US4] mermaid 構文エラー時の代替表示を実装 (server-side: lib/markdown-pdf/mermaid-runner.ts、client-side: app/tools/markdown-pdf/page.tsx の per-node try/catch、CSS: lib/markdown-pdf/templates/_base.ts の `.markdown-pdf-mermaid-error`) (T010 で書いた `html.ts` の mermaid run ロジックを `try/catch` per-node に変更: `for (const node of document.querySelectorAll(".markdown-pdf-root .mermaid")) { try { await mermaid.render(...) ; node.innerHTML = svg } catch (e) { node.innerHTML = '<div class="markdown-pdf-mermaid-error">mermaid 構文エラー: ' + escapeHtml(e.message) + '</div>'; } }`。プレビュー側 (`page.tsx`) も同じ per-node ラッパに変更し、両者が同じ挙動になることを保証。`_base.css` に `.markdown-pdf-mermaid-error` のスタイル [赤系の枠 + 等幅フォント] を追加) → `lib/markdown-pdf/html.ts`, `app/tools/markdown-pdf/page.tsx`, `lib/markdown-pdf/templates/_base.css`

**Checkpoint**:

- `pnpm test:e2e tests/e2e/markdown-pdf.spec.ts` の mermaid シナリオがパス
- 手動で構文エラーケースを通せる (FR-011)
- 3 種 mermaid (flowchart / sequenceDiagram / classDiagram) すべてプレビュー + PDF で図として出る (SC-004)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 仕上げ・性能チェック・永続化検証・lint

- [X] T029 [P] Route Handler のエラー応答とログを実装漏れチェック (contracts/render-api.md §3 のエラーコード `BAD_REQUEST_MARKDOWN` / `BAD_REQUEST_TEMPLATE` / `BAD_REQUEST_FILENAME` / `BAD_REQUEST_JSON` / `METHOD_NOT_ALLOWED` / `CHROMIUM_LAUNCH_FAILED` / `MERMAID_TIMEOUT` / `PDF_GENERATION_FAILED` / `INTERNAL_ERROR` が全て発火経路を持ち、ログに `code` / `markdownLength` / `templateId` / `durationMs` が出ること。Markdown 本文・PDF バイナリ・filename が **ログに含まれない** こと) → `app/tools/markdown-pdf/api/render/route.ts`
- [X] T030 [P] `X-Render-Warnings` ヘッダの実装 (route.ts でサーバ側 mermaid 失敗数を `X-Render-Warnings` に付与済み) (mermaid 描画失敗ブロック数 + 外部画像取得失敗数を `setContent` 後に `page.evaluate` で集計してヘッダに付与。観測のためだけなので無くてもエラーにはしない) → `app/tools/markdown-pdf/api/render/route.ts`, `lib/markdown-pdf/html.ts`
- [X] T031 [P] `pnpm lint` を実行し ESLint 警告/エラーを 0 にする (`pnpm lint` クリーン) (本フィーチャー由来のファイルに限定) → 該当ファイル
- [X] T032 quickstart.md §4 の全シナリオを手動で実行 (US1〜US4 を E2E 12/12 緑で確認、US2 テンプレ切替 / US3 ファイルアップロード / 拡張子エラー / アップロードファイル名継承 を Playwright スモークで確認): User Story 1〜4、Edge (mermaid 構文エラー / 外部画像取得失敗 / 永続化されない)、SC-001〜SC-007 を確認 → 検証のみ
- [X] T033 quickstart.md §7 「永続化されていないことの自己テスト」を実行 (`find . -name "*.pdf" -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./.next/*"` および `find /tmp -name "*.pdf" -mmin -10` ともに 0 件): PDF ダウンロード後に `find . -name "*.pdf" -not -path "./node_modules/*" -not -path "./.git/*"` および `find /tmp -name "*.pdf" -mmin -5` でファイルが残らないことを確認 (SC-007) → 検証のみ

---

## Phase 8: Follow-up — PDF 拡大縮小 (post-implement)

**Purpose**: 実装完了後、利用者要望「PDF 化時にドキュメント拡大縮小を指定したい」に対応する追加機能。プリセット 50/75/100/125/150/200% から選択、プレビューと PDF を CSS `zoom` と Playwright `page.pdf({scale})` で連動、永続化なし (セッションのみ)。

**Goal**: ツールバーの「拡大率」プルダウンで倍率を切り替えると、プレビューとダウンロードされる PDF の見た目が同じ倍率で拡大縮小される。

**Independent Test**:

1. `/tools/markdown-pdf` で任意の Markdown を入力
2. 「拡大率」プルダウンで `50%` → `100%` → `150%` と切替
3. プレビューが切替に追従して拡縮することを確認
4. 各倍率で PDF をダウンロードし、PDF 内のテキストサイズが切替に追従していることを確認

### Implementation (already done in follow-up commit)

- [X] T034 `lib/markdown-pdf/types.ts` に `RenderRequest.scale?` と `MIN_SCALE` / `MAX_SCALE` / `DEFAULT_SCALE` 定数、エラーコード `BAD_REQUEST_SCALE` を追加 → `lib/markdown-pdf/types.ts`
- [X] T035 `lib/markdown-pdf/validation.ts` で `scale` を 0.5〜2.0 範囲の有限数として検証 (未指定なら DEFAULT_SCALE) + `app/tools/markdown-pdf/api/render/route.ts` で `page.pdf({scale})` に伝搬しログにも記録 → `lib/markdown-pdf/validation.ts`, `app/tools/markdown-pdf/api/render/route.ts`
- [X] T036 `app/tools/markdown-pdf/page.tsx` に「拡大率」プルダウン (50/75/100/125/150/200%) を追加、`scale` state を持ち、preview-root に `style={{ zoom: scale }}` を適用、API リクエストの `scale` フィールドに乗せる → `app/tools/markdown-pdf/page.tsx`

**Checkpoint**:

- Unit / E2E が引き続き全件パス
- 手動で 50/100/200% を切り替えてプレビュー・PDF が一致することを確認

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: 依存なし。最初に着手
- **Phase 2 Foundational**: Phase 1 完了が前提。Phase 3+ をブロックする
- **Phase 3 (US1)**: Phase 2 完了後に開始可能。MVP のスコープ
- **Phase 4 (US2)**: Phase 2 完了 + US1 完了後に着手するのが推奨 (`page.tsx` を US1 で作ってから UI を拡張する形)
- **Phase 5 (US3)**: 同上 (US1 の `page.tsx` を拡張する)
- **Phase 6 (US4)**: 同上 (US1 の `page.tsx` / `html.ts` を拡張する)
- **Phase 7 Polish**: 全ての対象 User Story 完了が前提

### User Story Dependencies (file conflict 視点)

- **US1**: Foundational のみに依存
- **US2 / US3 / US4**: いずれも `app/tools/markdown-pdf/page.tsx` を編集するため **3 つの並列実装は不可**。US1 完了後、US2 → US3 → US4 の順 (もしくは任意の 1 ストーリーずつ) で着手する
- **US2 と US4**: 共に `lib/markdown-pdf/templates/` 配下 (US2) と `lib/markdown-pdf/html.ts` (US4) を触るので、ファイル単位では別だが page.tsx で衝突する

### Within Each User Story

- テストを先に書き、FAIL を確認してから実装に進む (TDD は厳格には強制しないが、E2E の挙動定義として有用)
- US1: テスト 3 本 → markdown-pdf.css → page.tsx → route.ts → registry flip の順
- US2: business.css と technical.css は並列 → templates.ts 配列追加 → page.tsx 選択 UI → templates.test.ts 拡張
- US3: page.tsx のみの単独タスク
- US4: e2e テスト → html.ts + page.tsx + _base.css の per-node エラーラッパ

### Parallel Opportunities

- **Phase 1 内**: T001 → T002 は順次 (依存関係あり)
- **Phase 2 内**: T003 / T004 / T005 / T006 / T007 / T008 / T011 / T012 は別ファイルなので並列可 ([P])。T009 (templates.ts) は T003 + T005 完了後、T010 (html.ts) は T003 + T004 + T005 + T006 完了後、T013 (next.config.ts) は他と独立だが実装は T013 を先に試して必要時のみ
- **Phase 3 (US1) 内**: T014 / T015 / T016 はテストファイル 3 本独立で並列、T017 は markdown-pdf.css 単独で並列、T018 (page.tsx) と T019 (route.ts) は別ファイルなので並列可、T020 (registry flip) は最後
- **Phase 4 (US2) 内**: T021 / T022 が並列、T023 は両者完了後、T024 と T025 は別ファイルなので並列可
- **Phase 5 (US3)**: 1 タスクのみ、並列なし
- **Phase 6 (US4) 内**: T027 (test) と T028 (実装) は別ファイル方向だが、page.tsx は US1 由来で同一ファイル編集になるため [P] は付けない
- **Phase 7 Polish**: T029 / T030 は同じファイル (route.ts) を触るので並列不可、T031 (lint) は他と並列可

---

## Parallel Example: Phase 2 Foundational

```bash
# Phase 1 完了後、以下は並列で着手可能 (異なるファイル、Phase 2 内で独立):
Task: "T003 lib/markdown-pdf/types.ts を作成"
Task: "T004 lib/markdown-pdf/templates/_base.css を作成"
Task: "T005 lib/markdown-pdf/templates/standard.css を作成"
Task: "T006 lib/markdown-pdf/markdown.ts を作成"
Task: "T007 lib/markdown-pdf/filename.ts を作成"
Task: "T008 lib/markdown-pdf/chromium.ts を作成"
Task: "T011 lib/markdown-pdf/mermaid-bundle.ts を作成"
Task: "T012 lib/markdown-pdf/validation.ts を作成"

# 上記のうち T003 + T005 が完了したら:
Task: "T009 lib/markdown-pdf/templates.ts を作成 (TEMPLATES = [standard] 1 件のみで開始)"

# T003 + T004 + T005 + T006 が完了したら:
Task: "T010 lib/markdown-pdf/html.ts を作成"
```

## Parallel Example: User Story 1

```bash
# Phase 2 完了後、テストと UI シェル CSS は実装と並列に着手可:
Task: "T014 [US1] tests/e2e/markdown-pdf.spec.ts を作成 (まず FAIL を確認)"
Task: "T015 [US1] tests/unit/markdown-pipeline.test.ts を作成 (まず FAIL を確認)"
Task: "T016 [US1] tests/unit/templates.test.ts を作成 (まず FAIL を確認)"
Task: "T017 [US1] app/tools/markdown-pdf/markdown-pdf.css を作成"

# その後、別ファイルなので page.tsx と route.ts は並列可:
Task: "T018 [US1] app/tools/markdown-pdf/page.tsx を実装"
Task: "T019 [US1] app/tools/markdown-pdf/api/render/route.ts を実装"

# 最後にカタログのフラグを倒す:
Task: "T020 [US1] lib/tools/registry.ts の markdown-pdf を status: available に"
```

---

## Implementation Strategy

### MVP First (User Story 1 のみ)

1. Phase 1 Setup を完了 (依存追加 + Chromium 確認)
2. Phase 2 Foundational を完了 (型 / Markdown パイプライン / テンプレ 1 件 / Chromium / html builder / filename / validation)
3. Phase 3 US1 を完了 (テスト 3 本 → UI シェル → page → API → カタログフラグ)
4. **STOP and VALIDATE**: `pnpm test:e2e tests/e2e/markdown-pdf.spec.ts` が緑、quickstart.md §4 User Story 1 が手動で通る、生成 PDF を開いて日本語が文字化けしていない (SC-003)
5. ここまでで「Markdown を貼って日本語 PDF をダウンロードできる」最小ツールが成立。残り (US2〜US4) を待たずに一旦コミット/PR 化してデモ可能

### Incremental Delivery

1. Setup + Foundational → 基盤完成
2. US1 → MVP 出荷 (テンプレ 1 種 / 貼り付け経路のみ / mermaid なし)
3. US2 追加 → テンプレ 3 種に拡張、見栄えの選択肢が成立
4. US3 追加 → アップロード経路が成立 (`.md` ファイルから直接 PDF 化できる)
5. US4 追加 → mermaid 図を含む技術文書も PDF 化できる
6. Polish → エラーコード網羅 + 観測ヘッダ + lint + 永続化検証

### Parallel Team Strategy

開発者が複数いる場合:

1. 1 人が Phase 1 + Phase 2 を完了させる (foundational ファイル間の整合性を担保)
2. 完了後:
   - 開発者 A: US1 (P1 / MVP) を最優先で着手
   - 開発者 B: US2 のテンプレ CSS (`business.css` / `technical.css`) を先行作成 (page.tsx を触らないので US1 と衝突しない)
   - 開発者 C: US4 の E2E テストスケルトン (`tests/e2e/markdown-pdf.spec.ts` を US1 担当が作ってから追記する形)
3. US1 完了後、開発者 B/C が page.tsx を順番に拡張 (US2 → US3 → US4)。並列にできるのは別ファイルへの修正のみ
4. Polish は全員が自分の関わったストーリーの仕上げに合流

---

## Notes

- [P] = 異なるファイル・未完了タスクへの依存なし
- 各タスクは 1 コミット〜数コミットで完結する粒度を意図 (憲法 IV: Surgical Changes)
- 「Done」は実装した本人が ① 自テスト緑 ② quickstart の関連シナリオを手で通す、までを指す (憲法: Done means verified)
- 同一ファイルを複数タスクが触る箇所 (特に `app/tools/markdown-pdf/page.tsx` を US1〜US4 がそれぞれ拡張する) は **同時並列不可**。順序通り進めること
- ドキュメント追加 (README 等) は本フィーチャー範囲外 (CLAUDE.md / quickstart.md で十分)
- Markdown 本文・生成 PDF のサーバ側永続化は **どのタスクでも禁止** (FR-012)。レビュー時に grep で `fs.writeFile` / `page.pdf({path:` 等が混入していないか必ず確認
