# Quickstart: ローカルWebツール群ダッシュボード基盤

**Feature**: [001-tools-dashboard](./spec.md)
**Date**: 2026-05-26
**Audience**: 開発機でこのリポジトリを clone してすぐ動かしたい人

仕様 SC-003 (「1 コマンドで開発環境を立ち上げられる」) の検証手順でもある。

---

## 1. 前提

開発機に以下が入っていること:

- Node.js 20 LTS 以上
- pnpm 9 以上 (`npm i -g pnpm` で導入)
- Docker / Docker Compose (DB を起動するため)

---

## 2. セットアップ手順

```bash
git clone <this repo>
cd my-web-tools

# 依存インストール
pnpm install

# 環境変数の雛形をコピー (中身は .env.example のとおりでローカルは動く)
cp .env.example .env
```

---

## 3. 起動

DB とアプリを起動する。

```bash
# DB を起動 (バックグラウンド)
docker compose up -d

# Next.js dev サーバを起動
pnpm dev
```

ブラウザで <http://localhost:3000/> を開けば、ダッシュボードのトップに登録ツール一覧が SSR で描画される。

> SC-003 は「ダッシュボードとデータ永続化層を含む開発環境を起動できる」が条件。`docker compose up -d` (DB 担当) と `pnpm dev` (アプリ担当) はそれぞれ責務が異なるため分離している。両者を 1 行で叩く `pnpm start:all` 等のラッパ scripts は YAGNI のため初期は提供しない (必要が出てから別フィーチャーで追加)。

---

## 4. 動作確認 (P1 / P2 / P3 受け入れ確認)

### P1: ツール一覧が SSR で表示される

1. `http://localhost:3000/` を開く
2. 登録されている各ツールがカードとして並ぶことを確認
3. ブラウザの View Source (Cmd+Option+U) で **初回 HTML にカードが含まれている** ことを確認 (JS 後追いではない)

### P1 (空状態)

1. `lib/tools/registry.ts` の `RAW_TOOLS` を一旦 `[]` にする
2. dev サーバが HMR で再構築 (もしくは Ctrl-C → `pnpm dev` 再起動)
3. トップに「現在利用可能なツールはありません」が表示されることを確認
4. 確認後、`RAW_TOOLS` を元に戻す

### P2: 一覧から各ツールへ遷移

1. 任意のカード (例: "Markdown → PDF") をクリック
2. `/tools/markdown-pdf` に遷移し、未実装プレースホルダが表示されることを確認 (500 / 404 にならない)
3. ブラウザのアドレスバーに `/tools/non-existent` を打ち込み、404 が表示されることを確認

### P3: 新規ツール追加が反映される

1. `lib/tools/registry.ts` の `RAW_TOOLS` に 1 件追加 (`id`, `slug`, `name`, `description`, `status: "coming-soon"`)
2. `pnpm dev` を Ctrl-C → 再起動
3. トップを再読込し、新エントリがカードに表示されることを確認

### Edge: DB ダウン時

1. `docker compose stop` で Postgres を止める
2. トップを再読込
3. ページが 500 にならず描画されること、DB ステータスインジケータが "unreachable" を示すことを確認
4. `docker compose start` で復旧

---

## 5. テストの走らせ方

```bash
# ユニットテスト (Vitest)
pnpm test:unit

# E2E テスト (Playwright) — dev サーバを別ターミナルで起動した状態で実行
pnpm test:e2e
```

> Playwright を初回実行する前に `pnpm exec playwright install` でブラウザバイナリを取得する必要がある (1 回だけ)。

---

## 6. よくあるトラブル

- **`pnpm dev` 起動直後にトップで赤いエラー枠**: ほとんどは `.env` 不在または DATABASE_URL 誤り。`.env.example` と突き合わせる
- **`docker compose up -d` で `port is already allocated`**: ホストの 5432 が別 Postgres で占有されている。`docker compose.yml` の `ports` を `5433:5432` 等に変更し、`.env` の `DATABASE_URL` も合わせる
- **Playwright 起動が遅い**: 初回 `playwright install` がブラウザバイナリ DL を伴うため。2 回目以降は速い
