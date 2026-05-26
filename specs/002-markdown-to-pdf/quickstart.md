# Quickstart: Markdown → PDF 変換ツール

**Feature**: [002-markdown-to-pdf](./spec.md)
**Date**: 2026-05-26
**Audience**: このフィーチャー実装後にツールを開いて動作確認する開発者・利用者

親フィーチャー [001-tools-dashboard](../001-tools-dashboard/quickstart.md) の手順でダッシュボードが起動できる前提で、本フィーチャー固有の準備と動作確認手順を示す。

---

## 1. 追加で必要なもの

ダッシュボードのセットアップに加えて、本フィーチャーは以下を追加する:

- **npm 依存** (pnpm install で導入される):
  - `markdown-it` (^14)
  - `mermaid` (^11)
  - `playwright` (^1.60) — runtime 用。`@playwright/test` と Chromium バイナリを共有
- **日本語フォント**:
  - macOS: 既定で Hiragino Sans/Mincho が入っているため追加不要
  - Linux (CI / Docker): `fonts-noto-cjk` (Debian/Ubuntu の場合は `apt-get install -y fonts-noto-cjk`) を入れること。手元 dev でも Linux 環境を使うなら同様
  - Windows: 既定で Yu Gothic UI / Meiryo が入っているため追加不要

> CI 環境 (将来 GitHub Actions 等で動かす場合) は Playwright の公式 Docker イメージ `mcr.microsoft.com/playwright:v1.60.0-jammy` が日本語フォント込みで提供されており、これを使うと最も手間がない。

---

## 2. 初回セットアップ (このフィーチャー後)

ダッシュボードのセットアップ後、追加で必要なのは以下のみ:

```bash
# 依存追加分のインストール (pnpm が package.json の差分を自動取り込み)
pnpm install

# Playwright Chromium (devDeps 由来) が既にインストール済みであることを確認
pnpm exec playwright install --dry-run
# Chromium がない場合は:
pnpm exec playwright install chromium
```

---

## 3. ツールを開く

```bash
# DB はダッシュボードと共有 (本フィーチャーでは DB を使わないが、ダッシュボードトップへの遷移は通る)
docker compose up -d

# Next.js dev サーバ
pnpm dev
```

ブラウザで <http://localhost:3000/> を開く → 「Markdown → PDF」カードをクリック → <http://localhost:3000/tools/markdown-pdf> へ遷移する。

---

## 4. 動作確認 (User Story 1〜4 受け入れ確認)

### User Story 1: ペースト → プレビュー → ダウンロード (P1)

1. ツール画面を開く
2. 以下のサンプル Markdown を textarea にペースト:

   ````markdown
   # 動作確認用ドキュメント

   こんにちは、世界。日本語の段落がきちんとレンダリングされるかを確認します。

   - 箇条書き 1
   - 箇条書き 2
     - ネスト

   | 列A | 列B |
   |-----|-----|
   | あい | うえ |
   | かき | くけ |

   ```python
   def greet():
       print("こんにちは")
   ```
   ````

3. 1 秒以内に右側 (または下部) プレビューが更新されることを確認 (SC-001)
4. 「PDF をダウンロード」ボタンを押す → 5 秒以内に `document.pdf` がダウンロードされる (SC-002)
5. PDF を開き、日本語が文字化けせず、表・コードブロックが整形済みで表示されることを確認 (SC-003)

### User Story 2: テンプレ切替

1. テンプレ選択 UI (ドロップダウン or タブ) で「ビジネス文書」を選ぶ
2. プレビューが切替後のスタイル (フォント・色・余白) で再描画されることを確認
3. 「PDF をダウンロード」を押す → 切替後の見た目を反映した PDF が得られることを確認 (SC-005)
4. 「技術文書」「標準」も同様に確認

### User Story 3: ファイルアップロード

1. 上記サンプルを `.md` ファイルに保存 (`sample.md`)
2. ツール画面のアップロード領域にドラッグ&ドロップ
3. textarea にファイル内容が反映され、プレビューが更新されることを確認
4. ダウンロードボタンを押すと `sample.pdf` (拡張子のみ置換) でダウンロードされることを確認
5. 拡張子が `.md` / `.markdown` 以外のファイルを試し、エラーメッセージが出ることを確認

### User Story 4: mermaid 図

1. 以下を入力欄に追加 (User Story 1 のサンプルの末尾に貼る等):

   ````markdown
   ## フローチャート

   ```mermaid
   flowchart LR
     A[開始] --> B{条件}
     B -- Yes --> C[処理1]
     B -- No --> D[処理2]
     C --> E[終了]
     D --> E
   ```

   ## シーケンス図

   ```mermaid
   sequenceDiagram
     利用者 ->> ツール: Markdown 入力
     ツール -->> 利用者: プレビュー表示
     利用者 ->> ツール: PDF ダウンロード要求
     ツール -->> 利用者: PDF
   ```
   ````

2. プレビューにフローチャートとシーケンス図が描画されることを確認
3. PDF をダウンロードして、図がソースコードではなく図として埋め込まれ、日本語ラベルも読めることを確認 (SC-004)

### Edge: mermaid 構文エラー

1. 上記サンプルの mermaid ブロックを 1 文字壊す (例: `flowchart LR` → `flowchart LL`)
2. プレビューで該当箇所だけがエラー表示になり、他の見出し/段落/表は通常通り描画されることを確認 (FR-011)
3. ダウンロードした PDF にもエラー表示プレースホルダが残るが、他箇所は通常通り出力されることを確認

### Edge: 外部画像取得失敗

1. インターネットを切る (もしくは存在しない URL を使う)
2. Markdown に `![alt](https://example.invalid/missing.png)` を含めてダウンロード
3. PDF に該当画像が代替表示 (alt テキスト or 枠) で出力され、PDF 生成自体は成功することを確認

### Edge: 永続化されない (FR-012 / SC-007)

ダウンロード完了後、以下のいずれにも該当ファイルが残らないことを確認:

```bash
# リポジトリ作業ツリー
find . -name "*.pdf" -not -path "./node_modules/*" -not -path "./.git/*"
find . -name "document.md" -not -path "./node_modules/*"

# 開発機の /tmp (Linux/macOS)
find /tmp -name "*markdown-pdf*" -mmin -10
find /tmp -name "*.pdf" -mmin -10
```

該当ファイルがどれも出力されなければ OK。

---

## 5. テスト実行

```bash
# ユニット (Markdown パイプライン / テンプレ解決)
pnpm test:unit -- markdown-pdf

# E2E (Playwright) — dev サーバを別ターミナルで起動した状態で
pnpm test:e2e -- markdown-pdf
```

---

## 6. よくあるトラブル

- **PDF が `%PDF-` で始まらない / ダウンロードできない**: サーバログに `CHROMIUM_LAUNCH_FAILED` 等が出ていないか確認。Playwright Chromium が未 install の場合は `pnpm exec playwright install chromium` を実行
- **日本語が PDF で豆腐表示になる**: Linux 環境で日本語フォントが入っていない可能性。`fontconfig` 経由で `fc-list :lang=ja` を叩き、表示が空なら `apt-get install -y fonts-noto-cjk` (Debian系) を実行
- **mermaid 図が PDF で「ソースコードのまま」になる**: Chromium 内で mermaid JS が実行できていない。サーバログで `MERMAID_TIMEOUT` が出ているか確認。タイムアウトは 10 秒固定 (contracts/render-api.md §3.3)
- **ボタンが活性化しない**: プレビューが `mermaidStatus: "ready"` になっていない可能性。mermaid 描画中はボタン非活性 (FR-010 補強)。10 秒以上待っても活性化しないなら mermaid 構文エラーの可能性が高い

---

## 7. 「永続化されていない」ことの自己テスト (SC-007)

CI なし運用なので手動チェックリスト:

- [ ] PDF 生成後、`find . -name "*.pdf"` でリポジトリ内に PDF が残っていない
- [ ] `find /tmp -name "*.pdf" -mmin -5` で `/tmp` にも残っていない
- [ ] `docker compose exec db psql ...` で本フィーチャー由来のテーブルが追加されていない (DB はそもそも触らない設計)
- [ ] Next.js dev サーバのログに Markdown 本文が出力されていない (長さ等のメタデータのみが出ている)

---

## 8. 関連ファイル

- [spec.md](./spec.md) — 機能要件と受け入れ基準
- [plan.md](./plan.md) — 全体方針と技術選定
- [research.md](./research.md) — 各技術選定の Decision/Rationale/Alternatives
- [data-model.md](./data-model.md) — メモリ上のデータ / リクエストボディ / クライアント state
- [contracts/render-api.md](./contracts/render-api.md) — `POST /tools/markdown-pdf/api/render` の契約
- [contracts/templates.md](./contracts/templates.md) — テンプレ追加・修正の契約
- [../001-tools-dashboard/quickstart.md](../001-tools-dashboard/quickstart.md) — 親フィーチャーの起動手順
