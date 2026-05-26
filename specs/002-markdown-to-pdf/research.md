# Phase 0: 技術調査 (Markdown → PDF 変換ツール)

**Feature**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)
**Date**: 2026-05-26

仕様の確定事項を「動作する 1 つの最小構成」に落とすため、以下の不明点を解決した。すべて [NEEDS CLARIFICATION] は spec 側で解消済みのため、本書はあくまで実装方針の選択を記録するもの。

---

## R-1. PDF 生成方式

### Decision

**サーバ側ヘッドレス Chromium (Playwright `chromium.launch()`) で `page.pdf()` する。**

クライアントから POST された `{markdown, templateId}` をサーバが受け、Markdown → HTML 変換 + テンプレ CSS + mermaid ランタイム JS を 1 枚の HTML として組み立て、ヘッドレス Chromium に `page.setContent(html)` で読み込ませる。mermaid の描画完了を待ってから `page.pdf({format: "A4"})` を呼び、得たバイナリを `application/pdf` でレスポンスする。ブラウザはこれをそのまま `<a download>` 風に保存する。

### Rationale

- **マルチバイトフォントの再現性**: Chromium 内蔵のテキスト描画 + システム/同梱フォントを使うため、日本語は「ベクター文字」として PDF に埋め込まれ、文字化け（豆腐表示）と無縁。クライアント側 PDF ライブラリ (jsPDF + html2canvas / pdfmake) は日本語フォントを別途バンドルする必要があり、ライブラリ独自の罠が多い (spec SC-003 を確実に満たすため不採用)
- **プレビューとの視覚的一致 (FR-004)**: プレビューも同じ HTML + CSS をブラウザでレンダリングするだけなので、サーバ側 Chromium と同一の描画エンジンで比較可能。テンプレ切替も CSS の差し替えのみで両者に効く
- **mermaid 対応 (FR-006)**: Chromium 上で mermaid JS をそのまま実行できるので、図のソースはクライアント側プレビューと同じパスで描画される。サーバ側で SVG を別途生成する複雑な経路 (JSDOM + mermaid) を排除
- **ダウンロード UX (User Story 1)**: 「ボタンを押すと PDF がダウンロードされる」ことが仕様の明示的体験であり、OS の印刷ダイアログを経由する `window.print()` パスでは満たしにくい
- **依存追加コスト**: `@playwright/test` が devDependencies に既に存在し、その同梱 Chromium バイナリは導入済み。新規 `playwright` パッケージは `playwright-core` を共有しており、追加ダウンロードは発生しない (実測でも `node_modules` サイズの増分は数 MB レベル)

### Alternatives Considered

- **`window.print()` + 印刷向け CSS**: 最も依存が軽い。ただし利用者が OS 印刷ダイアログで「PDF として保存」を毎回選ぶ必要があり、ファイル名指定や自動保存も OS 任せ。spec の業務フロー「ダウンロードボタン → PDF ダウンロード」と齟齬が出るため不採用
- **クライアント側 jsPDF + html2canvas**: 日本語フォントの別バンドル (3〜10MB の TTF/OTF) が必須。html2canvas は SVG ラスタライズ品質に難があり mermaid 図が崩れることが多い。テンプレ CSS の再現性も低い
- **`@react-pdf/renderer`**: React コンポーネントで宣言的に PDF を組む方式。日本語フォント埋め込み可能だが、Markdown の任意構造 (見出し階層、表、コードブロック、入れ子リスト、mermaid) を <View><Text> ツリーに再現するロジックの実装コストが高すぎる
- **`puppeteer`**: 機能的に Playwright と等価だが、別途 Chromium バイナリをダウンロードするため `@playwright/test` の Chromium と二重保有になる。本プロジェクトでは Playwright を採用済みなので統一

---

## R-2. Markdown パーサ

### Decision

**`markdown-it` (v14.x) を採用。サーバ側・クライアント側で同一の Markdown → HTML 関数を共有する。**

GitHub Flavored Markdown 相当の機能 (`linkify: true`, テーブル, 取り消し線) はオプションと組み込みルールで賄えるため、追加プラグインなしで開始する。

### Rationale

- **API が小さく学習コストが低い**: 単一の `new MarkdownIt(options).render(src)` で HTML 文字列が得られる。Next.js の Server Component / Route Handler / クライアント側 React コンポーネント、いずれからも同じコードで呼べる
- **mermaid 用のフェンス書き換えが容易**: `md.renderer.rules.fence` をオーバライドし `info === "mermaid"` のとき `<div class="mermaid">${content}</div>` を返す 5〜10 行のカスタマイズで本仕様を満たせる
- **GFM 機能の必要範囲**: 仕様 (User Story 1 の Acceptance Scenario 1) で要求されるのは「見出し・段落・リスト・表・コードブロック」程度。`markdown-it` 本体 + `html: false` + `linkify: true` で十分カバーする (表は本体組み込み)
- **依存の軽さ**: `unified` + `remark-*` + `rehype-*` 系は機能豊富だがパッケージ数が増え、本フィーチャーの YAGNI 基準 (憲法 II) に照らして過剰

### Alternatives Considered

- **`unified` + `remark-parse` + `remark-gfm` + `remark-rehype` + `rehype-stringify`**: 標準的でプラグイン資産が豊富だが、パッケージ点数が増える。Footnote, definition list 等を将来必要とした時点で導入を再評価する
- **`react-markdown`**: React コンポーネントとして直接描画できるが、サーバ側 Chromium に流す HTML 文字列としては不向き (renderToStaticMarkup を経由する手間が増える)
- **`marked`**: 軽量で安定だが、ルールのカスタマイズ API が `markdown-it` より硬く、mermaid フェンスの差し替えが面倒

### Notes

- 入力は信頼できるユーザ自身の Markdown だが、念のため `html: false` (Markdown 内の生 HTML を許可しない) を既定とする。これにより XSS リスクと PDF レンダ時の不正タグ混入を回避
- 表組みは GFM の `|` 区切り構文を本体がサポート
- リンクは `target="_blank"` を強制せず、PDF 内では単にスタイル付きテキストとして表示

---

## R-3. mermaid のレンダリング

### Decision

**プレビュー画面、PDF 生成用 HTML の双方で、`mermaid` (v11.x) を ブラウザ JavaScript として動的に実行する。図ブロックは `<div class="mermaid">` でマーク済みのため、`mermaid.run()` が一括で SVG に置換する。**

PDF 用 HTML を組み立てるサーバ側では、`mermaid` の ESM ビルド (`node_modules/mermaid/dist/mermaid.min.js` 相当) を `<script>` で埋め込み、ページ先頭でブートストラップする。`page.setContent` で読み込んだ Chromium はこのスクリプトを実行して mermaid を描画してから、待機シグナル (例: `document.body.dataset.mermaidReady = "true"`) を立て、サーバ側は `page.waitForFunction(...)` でそれを待ってから `page.pdf()` を呼ぶ。

### Rationale

- **プレビューと PDF の挙動が完全に同一**: 同じ `mermaid` バージョン、同じ初期化オプション、同じテーマ。差異が出るのは「Chromium の描画タイミングを待つかどうか」のみ
- **対応図種の広さ**: mermaid 公式パーサがそのまま動くため、flowchart / sequenceDiagram / classDiagram (本仕様の保証範囲) はもちろん、gantt / pie / stateDiagram もベストエフォートで動く (spec Assumptions)
- **構文エラー耐性 (FR-011)**: mermaid は構文エラー時にコンソールへ警告を吐き、当該ブロックは描画されない。プレビュー側 / PDF 側それぞれで「mermaid 構文エラー」プレースホルダ要素に置換するラッパを 1 か所 (`renderMermaidWithFallback`) に集約する

### Alternatives Considered

- **`@mermaid-js/mermaid-cli` をサブプロセスとして呼ぶ**: 内部で puppeteer を起動し SVG/PNG を出力する。サーバプロセスから子プロセス起動するオーバヘッドと、Chromium が二重起動するコストが大きい
- **JSDOM 上で `mermaid.render()`**: mermaid は内部で `getComputedStyle` 等を多用するため JSDOM での再現には実績的に難があり、トラブルシュート負荷が高い

### Notes

- `mermaid.initialize({ startOnLoad: false, theme: <by template> })` とし、`run()` を明示的に呼ぶ
- テンプレごとにテーマを切替 (例: 標準 = "default", ビジネス文書 = "neutral", 技術文書 = "dark" もしくは "forest") できるようにする
- フォント関係は CSS 側でコントロールし、mermaid の SVG 内テキストにも日本語フォントが乗るように `font-family` を明示

---

## R-4. デザインテンプレート構造

### Decision

**テンプレートは「定数定義 + CSS」のペアで `lib/markdown-pdf/templates/` 配下に 3 件用意する。型は `{id, name, description, mermaidTheme, css}` 形式とする。** CSS は文字列としてバンドルし、プレビュー側は `<style>` タグで動的に差し替え、サーバ側は HTML 文字列のヘッダに連結する。

| テンプレート ID | 表示名 | 想定用途 | フォント方針 | mermaid テーマ |
|----------------|--------|----------|--------------|----------------|
| `standard` | 標準 | 汎用ドキュメント | システム既定 (Noto Sans JP / Hiragino Sans / sans-serif フォールバック) | `default` |
| `business` | ビジネス文書 | 社内資料・配布物 | 明朝/ゴシック混在 (見出し: ゴシック / 本文: 明朝)、A4 余白広め | `neutral` |
| `technical` | 技術文書 | 開発者向け仕様書 | 全文ゴシック、コードブロック幅を活かす、見出しに番号付け色 | `forest` |

### Rationale

- **「最低 3 種類」を満たしつつ、4 種類目を急いで増やさない (YAGNI / 憲法 II)**
- **データではなくコード**: テンプレが配列にまとまっているため、新規テンプレ追加は「新しい CSS 定数を 1 つ書き、配列に 1 件足す」で完結する。ツールカタログ ([001-tools-dashboard/contracts/tool-registry.md](../001-tools-dashboard/contracts/tool-registry.md)) のパターンを踏襲
- **テンプレ切替の即時反映 (FR-008)**: CSS 文字列を差し替えるだけなのでクライアント側は <style> 要素の更新で完結。サーバ側 PDF 生成も同じ CSS 文字列を流し込むだけ
- **日本語フォント方針の明確化**: 各テンプレで `font-family` を `-apple-system, "Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", sans-serif` 等を明示し、Linux/macOS/Windows のいずれでも豆腐表示にならない優先順位を設定する。Docker コンテナ内で実行するシナリオでは Noto Sans JP / Noto Serif JP をシステムフォントとして同梱する手順を quickstart に書く

### Alternatives Considered

- **Tailwind / CSS Modules / styled-components 等の CSS 戦略を本フィーチャーで導入**: 親フィーチャー (001-tools-dashboard) で「標準 CSS + globals.css」を選択済みであり、それを踏襲。本フィーチャー独自に CSS 戦略を増やすのは Surgical Changes (憲法 IV) に反する
- **テンプレを DB に持たせる / 動的に追加可能にする**: spec が「数パターン用意して選択」と固定数を求めており、ユーザによる追加要件はない。動的化は YAGNI

### Notes

- A4 (210mm × 297mm)、余白は標準 25mm / ビジネス 30mm / 技術 20mm を初期値
- コードブロックの等幅フォントは `"JetBrains Mono", "SFMono-Regular", "Menlo", "Consolas", monospace` を共通指定
- テンプレ別の見出し装飾 (色、罫線) は CSS のみで実現し、Markdown 構造は不変

---

## R-5. アップロード UX

### Decision

**HTML 標準の `<input type="file" accept=".md,.markdown,text/markdown">` とドラッグ&ドロップを併設し、選択ファイルは `File.text()` でクライアント側で読み込み、textarea にセットする。サーバには Markdown 本文 (string) のみが流れ、ファイルそのものはアップロードしない。**

### Rationale

- **永続化なし要件 (FR-012)**: ファイル本体をサーバへ送らないのが最もシンプル。サーバ側にはダウンロード時の Markdown 文字列だけが届く
- **拡張子バリデーション (User Story 3 Acceptance #2)**: `accept` 属性 + JS 側で `file.name.endsWith(".md" | ".markdown")` の二重チェック。`accept` だけだとブラウザ実装差で抜けが出るため必須
- **ファイルサイズ上限**: 1MB / 50,000 文字 (Assumptions) をクライアント側で先にチェックしてユーザに即時フィードバック

### Alternatives Considered

- **multipart/form-data で `/api/upload` に送る**: 永続化しないのに往復させる意味がない。サーバ-側ストレージへの一時保存も発生してしまい FR-012 のリスクが増える
- **クリップボード API のみ**: ペースト経路 (User Story 1) と用途が被るが、`.md` ファイルからの取り込み体験 (User Story 3) が成立しない

---

## R-6. リクエストフロー / API 形

### Decision

**Next.js Route Handler を `app/tools/markdown-pdf/api/render/route.ts` に 1 本置き、`POST` で `application/json` を受け、`application/pdf` を返す。**

リクエスト形:
```json
{
  "markdown": "string (UTF-8, 上限 1MB / 50000 char)",
  "templateId": "standard" | "business" | "technical",
  "filename": "string (任意; 拡張子なし)"
}
```

レスポンス:
- 成功: `200 OK` / `Content-Type: application/pdf` / `Content-Disposition: attachment; filename="...pdf"` / ボディは PDF バイナリ
- 入力不正: `400 Bad Request` / JSON エラー (`{error, code}`)
- 生成失敗: `500 Internal Server Error` / JSON エラー、サーバログにスタックトレース

Chromium プロセスは 1 インスタンスをモジュールスコープでキャッシュし、初回リクエストで遅延起動、以降は再利用 (`getBrowser()`)。プロセス終了時に `process.on("exit")` で `close()`。

### Rationale

- **REST 的に最も自然な「POST で生成、レスポンスでファイル」**: 仲介する一時保存もなく、FR-012 を満たす
- **Chromium 再利用**: 毎回 launch だと 1〜2 秒のコストが発生し SC-002 (≤5s) のマージンを食いつぶす。シングルトンで保持し、ページは毎回 new。CPU ピーク時はメモリ ~300MB 程度
- **エラー応答の構造化 (憲法 V)**: フロント側で `error.code` ごとにメッセージ出し分け可能。サーバログには `request size`, `template`, `duration`, `error stack` を残す

### Notes

- `Content-Disposition` の `filename` は RFC 5987 で UTF-8 エンコード (`filename*=UTF-8''...`) を併記し、日本語ファイル名も保存できるようにする
- レート制限・認証はローカル単一利用前提なので導入しない (親フィーチャー 001-tools-dashboard の方針踏襲)

---

## R-7. テスト戦略

### Decision

**Playwright E2E 1 本 + Vitest ユニット 2 本に絞る。**

- **Playwright (`tests/e2e/markdown-pdf.spec.ts`)**: 日本語 + mermaid を含むサンプル Markdown をペースト → プレビュー描画を待つ → 「PDF をダウンロード」ボタンを押す → ダウンロードイベント (`page.waitForEvent("download")`) を捕捉 → 保存先のファイルが 1KB 以上の PDF (`%PDF-` ヘッダ) であることを検証
- **Vitest (`tests/unit/markdown-pipeline.test.ts`)**: `renderMarkdown` 関数が ```mermaid フェンスを `<div class="mermaid">` に変換し、他言語のコードブロックは `<pre><code>` のまま返すこと
- **Vitest (`tests/unit/templates.test.ts`)**: `getTemplate("standard")` / `getTemplate("business")` / `getTemplate("technical")` が定義済みオブジェクトを返し、`getTemplate("unknown")` が標準テンプレへフォールバックすること

### Rationale

- **憲法 III**: P1 ユーザストーリーは E2E で end-to-end に確認。Markdown パイプラインとテンプレ解決のような「非自明な純関数」だけ Vitest でカバー
- **テストの数を最小に**: P2 ストーリーは E2E に追加するほどの差し迫った価値がない (テンプレ切替は CSS 差替えのみ、アップロードは `File.text()` の薄いラッパ、mermaid 描画は P1 の E2E が日本語 + mermaid の両方をカバーする)

### Notes

- Playwright のテストは「PDF の中身を pdf-parse 等で開いて文字列検査」までは行わない (依存追加を避ける)。代わりに **ファイル先頭が `%PDF-1.` で始まる + サイズが妥当範囲** で合否判定する
- ダウンロード機能の動作確認 (User Story 1 Acceptance Scenario 3: PDF を開いて文字化けがないこと) は手動 QA に委ねる

---

## R-8. 永続化なしの確認手段 (FR-012 / SC-007)

### Decision

**サーバ側コードに「アップロード/生成ファイルを書き込む処理」を一切持たない構造とする。リクエスト処理中は Node プロセスの メモリ上 (関数ローカル変数) でのみ Markdown / PDF Buffer を保持し、ハンドラ関数の return 後に GC へ委ねる。** 

quickstart.md に「PDF ダウンロード後、コンテナ内 (`/tmp` 等) およびリポジトリ作業領域に該当 PDF / `.md` が残存していないことを `find` で確認する手順」を載せる。

### Rationale

- **シンプル**: ライブラリ呼び出しで一時ファイルを作る経路 (例: Playwright `page.pdf({path: ...})`) を採らない。`page.pdf()` のオーバロード (path 指定なし) は Buffer 返却なので、これだけを使う
- **検証可能**: 利用者/レビューアが `find` で確認できるので SC-007 を運用検査で満たせる

---

## R-9. 親フィーチャー (ダッシュボード) との接続

### Decision

**`lib/tools/registry.ts` の既存エントリ `markdown-pdf` の `status: "coming-soon"` を `"available"` に変更する。それ以外のフィールド (id, slug, name, description, category) は変更しない。**

`app/tools/markdown-pdf/page.tsx` を新設し、本ツール本体とする。動的ルート `app/tools/[slug]/page.tsx` (プレースホルダ) は変更しない (Next.js App Router の解決順により、固定パスが優先される)。

### Rationale

- **Tool Registry Contract ([001-tools-dashboard/contracts/tool-registry.md](../001-tools-dashboard/contracts/tool-registry.md)) の §6 後続ツール側の責務に従う**: 既存エントリのフラグ切替 + 専用ページ追加のみで、ダッシュボード / 他ツールには触れない (憲法 IV)
- **slug は確定済み**: `markdown-pdf`。URL は `/tools/markdown-pdf`
