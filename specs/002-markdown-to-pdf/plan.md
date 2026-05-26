# Implementation Plan: Markdown → PDF 変換ツール

**Branch**: `002-markdown-to-pdf` | **Date**: 2026-05-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-markdown-to-pdf/spec.md`

**Note**: 本ファイルは `/speckit-plan` で生成。テンプレート: `.specify/templates/plan-template.md`

## Summary

[001-tools-dashboard](../001-tools-dashboard/spec.md) で構築したダッシュボードに「Markdown → PDF」ツールを追加する。仕様で確定した主要事項:

- **P1**: テキスト入力欄に Markdown をペーストし、即時プレビューで内容を確認した上で、ボタン押下で PDF をダウンロードする一気通貫の業務フロー
- **P2 (a)**: 3 種類の PDF デザインテンプレート (`standard` / `business` / `technical`) を選択でき、プレビューと PDF が同時に切り替わる
- **P2 (b)**: `.md` / `.markdown` ファイルをドラッグ&ドロップで読み込めるアップロード経路 (本文はサーバへ送らずクライアント側で読み込む)
- **P2 (c)**: mermaid (`flowchart`, `sequenceDiagram`, `classDiagram` を最低保証) がプレビュー・PDF いずれでも図として描画される
- **横断**: 日本語等マルチバイト文字が PDF で文字化けしない / 利用者の Markdown 本文と PDF はサーバ側に永続化しない

技術アプローチ:

- **サーバ側ヘッドレス Chromium (Playwright `chromium.launch()`)** で `page.pdf()` を呼び、Markdown を HTML + mermaid + テンプレ CSS に組んだ 1 枚の HTML を `setContent` し、A4 PDF として返す (詳細は [research.md §R-1](./research.md))
- **Markdown 解析は `markdown-it` (v14.x)** をサーバ/クライアント共通で使用。mermaid フェンスは fence renderer で `<div class="mermaid">` に書き換える (§R-2)
- **mermaid (v11.x)** を Chromium 内で実行 (サーバ側も同様)。テンプレ別のテーマを `initialize()` で切り替える (§R-3)
- **テンプレートは「定数 + CSS 文字列」**として `lib/markdown-pdf/templates/` 配下に 3 件用意。`CSSString` を `?raw` インポートで読み込み、プレビューとサーバ PDF 用 HTML の双方で使い回す (§R-4)
- **アップロードはクライアント完結 (`File.text()`)**。サーバには Markdown 文字列のみが流れる (§R-5)
- **API は `POST /tools/markdown-pdf/api/render` 1 本**。`{markdown, templateId, filename?}` JSON を受け、`application/pdf` バイナリを返す ([contracts/render-api.md](./contracts/render-api.md))
- **テストは E2E 1 本 + ユニット 2 本** に絞り、憲法 III (Behavior-Focused Testing) と整合させる (§R-7)

## Technical Context

**Language/Version**: TypeScript 5.x (親フィーチャーと同じ。Node 20 LTS、Next.js 15 同梱ランタイム)

**Primary Dependencies** (新規):

- `markdown-it` (^14.x) — Markdown → HTML 変換 (サーバ/クライアント共通)
- `mermaid` (^11.x) — クライアント側 / サーバ側 Chromium 内での図描画
- `playwright` (^1.60.x) — サーバ側ヘッドレス Chromium での `page.pdf()`。`@playwright/test` (devDeps) と Chromium バイナリを共有するためディスク追加は最小

**Primary Dependencies** (引き継ぎ): Next.js 15 (App Router, RSC, Route Handlers), React 19, TypeScript 5

**Storage**: なし。本フィーチャーは PostgreSQL を触らない。利用者の Markdown 本文・生成 PDF はサーバ側に永続化しない (FR-012 / SC-007)

**Testing**:

- Vitest: `markdown-pipeline.test.ts` (mermaid フェンス変換) / `templates.test.ts` (テンプレ解決とフォールバック)
- Playwright (E2E): `markdown-pdf.spec.ts` (日本語 + mermaid を含む Markdown のペースト → プレビュー → ダウンロード → PDF ヘッダ検証まで一気通貫)

**Target Platform**: 親フィーチャーと同じ (macOS / Linux dev 機。ブラウザは Chrome / Safari / Firefox 各最新版)。CI を将来導入する場合は Playwright 公式 Docker イメージ `mcr.microsoft.com/playwright:v1.60.0-jammy` を推奨 (日本語フォント込み)

**Project Type**: web (親と同じ Next.js フルスタックアプリ 1 つ。`backend/` `frontend/` 分離はしない)

**Performance Goals**:

- プレビュー描画 (5 ページ以下): **2 秒以内 95%ile** (spec SC-001)
- PDF 生成完了 (5 ページ以下): **5 秒以内 95%ile** (spec SC-002)
- 上記を達成するため、Chromium プロセスはモジュールスコープでシングルトン化して使い回す (毎リクエストの launch コスト ≈ 1〜2s を回避)

**Constraints**:

- 入力上限: **50,000 文字 / 1MiB UTF-8** (spec Assumptions)
- 用紙: **A4 縦のみ** (spec Assumptions)
- mermaid サポート最低保証: **flowchart / sequenceDiagram / classDiagram** (spec Assumptions)
- 画像: HTTPS 外部 URL と data URI のみ PDF 埋め込み対象。ローカル相対パスはプレースホルダ表示 (spec Edge Cases)
- 永続化禁止: `page.pdf()` の `path` オプションを **使わない** / `fs.writeFile` 系を呼ばない (FR-012)
- ログ: Markdown 本文を出力しない (機密漏洩リスク回避)

**Scale/Scope**:

- 単一ローカル利用者前提 (親フィーチャー方針踏襲)。同時リクエストは Playwright の `newPage()` 並列で対応、明示的キューは持たない
- 追加コードは数百〜千数百 LOC を想定 (`page.tsx` の UI + Route Handler + Markdown/テンプレモジュール + テスト)

## Constitution Check

*GATE: Phase 0 研究の前に必ず通過させ、Phase 1 設計後に再評価する。*

| Principle | 適合状況 | 根拠 |
|-----------|---------|------|
| **I. Spec-Driven Development** | ✅ Pass | `/speckit-specify` → `/speckit-plan` の流れに従う。spec.md・research.md・data-model.md・contracts/・quickstart.md・本ファイルがすべて同フィーチャーディレクトリ内で整合 |
| **II. Simplicity First (YAGNI)** | ⚠️ Pass with note | 「サーバ側ヘッドレス Chromium」は依存重量で目を引くが、`@playwright/test` (devDeps) が同じ Chromium を既に保有しており **新たな大容量バイナリは導入されない**。一方、これにより「クライアント PDF ライブラリ + 日本語フォント別バンドル」「JSDOM 上の mermaid」「mermaid-cli サブプロセス」などの代替経路をまとめて回避できる。Complexity Tracking には記載するが憲法違反としては扱わない |
| **III. Behavior-Focused Testing** | ✅ Pass | P1 を Playwright E2E で end-to-end に検証 (Markdown ペースト → プレビュー → ダウンロード)。Markdown パイプラインの fence 書き換えとテンプレ解決のみ Vitest ユニット。カバレッジ稼ぎ目的のテストは追加しない |
| **IV. Surgical, Reviewable Changes** | ✅ Pass (Plan 段階) | 触るのは: `lib/tools/registry.ts` (status を `coming-soon` → `available`)、新規 `app/tools/markdown-pdf/`、新規 `lib/markdown-pdf/`、新規テストファイル、`package.json` (依存追加)。ダッシュボード本体・他ツール・親フィーチャーのファイルは一切変更しない。タスク粒度は `/speckit-tasks` で 1 タスク 1 コミットへ分解する |
| **V. Observable & Debuggable** | ✅ Pass | Route Handler のリクエスト境界で `Markdown 文字数 / templateId / 処理時間 / エラー種別` を構造化ログ。mermaid 構文エラー・外部画像取得失敗は警告ログ + PDF 内プレースホルダで「気づける」状態に保つ。`X-Render-Warnings` ヘッダで部分エラー件数も観測可能。Chromium launch 失敗は明示エラーコード `CHROMIUM_LAUNCH_FAILED` |

**Initial gate result**: ✅ All gates pass. Principle II は重い依存に関する説明責任を Complexity Tracking で果たすが、追加実害は最小 (Chromium バイナリ共有)。

**Post-Design re-check (Phase 1 完了後)**: ✅ All gates pass.

- contracts/render-api.md と contracts/templates.md の不変条件 (「サーバはファイル書き込み禁止」「テンプレは scoped CSS のみ」) を明文化したことで、Surgical Changes (IV) と Observable (V) の遵守を実装レビューでも追跡可能になった
- data-model.md で DB スキーマがゼロであることを再確認 (II)
- quickstart.md に「永続化されていないことを `find` で確認する手順」を含め、SC-007 を運用面でも追跡可能 (V)
- Complexity Tracking は Playwright runtime 依存の 1 件のみ。新規違反なし

## Project Structure

### Documentation (this feature)

```text
specs/002-markdown-to-pdf/
├── plan.md                       # 本ファイル
├── research.md                   # Phase 0 出力 (技術選定の Decision/Rationale/Alternatives)
├── data-model.md                 # Phase 1 出力 (型 / リクエスト・レスポンス / クライアント state)
├── quickstart.md                 # Phase 1 出力 (動作確認手順 + 永続化チェック)
├── contracts/
│   ├── render-api.md             # POST /tools/markdown-pdf/api/render の契約
│   └── templates.md              # PdfTemplate の追加・修正契約
├── checklists/
│   └── requirements.md           # /speckit-specify が生成したクオリティチェックリスト
└── tasks.md                      # Phase 2 出力 (/speckit-tasks で生成。本コマンドでは作らない)
```

### Source Code (repository root)

新規 / 変更されるファイルのみ列挙する。既存ツリーは [001-tools-dashboard/plan.md §Project Structure](../001-tools-dashboard/plan.md) を参照。

```text
my-web-tools/
├── package.json                  # 変更: dependencies に markdown-it / mermaid / playwright 追加
├── pnpm-lock.yaml                # 変更 (自動)
├── app/
│   └── tools/
│       └── markdown-pdf/
│           ├── page.tsx          # 新規: クライアントコンポーネント (editor + テンプレ選択 + プレビュー + ダウンロード)
│           ├── markdown-pdf.css  # 新規: ツール画面のレイアウト (UI シェル) スタイル
│           └── api/
│               └── render/
│                   └── route.ts  # 新規: POST ハンドラ (Playwright で PDF 生成)
├── lib/
│   ├── tools/
│   │   └── registry.ts           # 変更: markdown-pdf エントリの status を "available" に
│   └── markdown-pdf/
│       ├── types.ts              # 新規: PdfTemplate / PdfTemplateId / RenderRequest 等
│       ├── markdown.ts           # 新規: markdown-it ラッパ (mermaid フェンス書き換え含む)
│       ├── templates.ts          # 新規: getTemplate / listTemplates / getDefaultTemplate / assertValidTemplates
│       ├── templates/
│       │   ├── _base.css         # 新規: 共通レイアウト + CSS 変数 + @page A4
│       │   ├── standard.css      # 新規: 標準テンプレ
│       │   ├── business.css      # 新規: ビジネス文書テンプレ
│       │   └── technical.css     # 新規: 技術文書テンプレ
│       ├── chromium.ts           # 新規: Playwright Chromium シングルトン (getBrowser / dispose)
│       ├── html.ts               # 新規: buildHtmlDocument({html, template, mermaidScript})
│       └── filename.ts           # 新規: Content-Disposition 用ファイル名生成 (RFC 5987)
└── tests/
    ├── unit/
    │   ├── markdown-pipeline.test.ts   # 新規: mermaid フェンス変換と通常コードブロックの区別
    │   └── templates.test.ts            # 新規: getTemplate のフォールバック動作
    └── e2e/
        └── markdown-pdf.spec.ts         # 新規: ペースト → プレビュー → ダウンロード → PDF ヘッダ検証
```

**Structure Decision**: 親フィーチャーで採用したフラットな Next.js 単一アプリ構成を踏襲する。本ツールは `app/tools/markdown-pdf/` 配下にページ + Route Handler を、`lib/markdown-pdf/` 配下にドメインロジック (Markdown 変換・テンプレ・Chromium 管理) を集約する。理由:

- 親フィーチャーの contracts/tool-registry.md §6 (後続ツール側の責務) に準拠: 既存エントリの status 更新 + 専用ページ追加のみで、ダッシュボード/他ツールには触れない
- ロジックを `lib/markdown-pdf/` に独立させることで、将来別アプリ化する必要が出ても切り出しやすい (本フィーチャー時点で別アプリ化は YAGNI)
- テストは親と同じ `tests/unit/` `tests/e2e/` に並べ、ツール別ファイル名でスコープを明示

## Complexity Tracking

> Constitution Check の **Principle II (Simplicity First)** に関して 1 件、説明責任を果たすため記載する。憲法違反としては扱わないが、選択の理由を残しておく。

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| `playwright` runtime 依存の追加 (Chromium バイナリ ~200MB を含むが、`@playwright/test` (devDeps) と共有のため実質増分は数 MB) | 日本語フォントの再現性 (SC-003)、プレビュー/PDF の視覚的一致 (FR-004)、mermaid 描画の一貫性 (FR-006) を同時に満たす最小経路がサーバ側 Chromium だったため | (a) クライアント PDF ライブラリ (jsPDF + html2canvas / pdfmake / @react-pdf): 日本語フォントの別バンドル必須 + mermaid SVG のラスタライズ崩れ。(b) `window.print()`: OS 印刷ダイアログを挟み spec の「ダウンロードボタン → PDF」体験に合わない。(c) JSDOM + mermaid: mermaid 内部の DOM 依存が強く再現負荷が高い |
