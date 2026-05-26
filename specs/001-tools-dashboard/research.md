# Phase 0 Research: ローカルWebツール群ダッシュボード基盤

**Feature**: [001-tools-dashboard](./spec.md)
**Date**: 2026-05-26
**Status**: Complete — `NEEDS CLARIFICATION` 残ゼロ

本ファイルは plan.md の Technical Context で採択した各選択肢について、なぜそれを選び、何を捨てたかを記録する。憲法 II (Simplicity First) に従い「使わない依存は入れない」を基本方針とする。

---

## D1. Next.js のルーティング方式: App Router vs Pages Router

- **Decision**: App Router (`app/` ディレクトリ) を採用
- **Rationale**:
  - Next.js 13 以降の公式推奨方式で、Next.js 15 時点では App Router がデフォルト
  - React Server Components により、SSR 時点でツール一覧を組み込んで返す要件 (FR-004) に自然にマッチする (`page.tsx` のサーバコンポーネントから直接ツール配列を読み込んで JSX を返すだけ)
  - 動的ルート `app/tools/[slug]/page.tsx` で未実装ツールのプレースホルダ要件 (User Story 2 / FR-002〜003) を 1 ファイルで満たせる
- **Alternatives considered**:
  - Pages Router (`pages/`): 既存資産がない新規プロジェクトであり、わざわざ旧方式を選ぶ理由がない。`getServerSideProps` 方式は SSR には十分機能するが、最新ドキュメントとの整合が取りにくく学習コストが二重化する

---

## D2. 言語: TypeScript vs JavaScript

- **Decision**: TypeScript 5.x
- **Rationale**:
  - ツールカタログ (`Tool` 型) を型で守ることが、不正定義除外 (Edge Cases / User Story 3 受け入れ基準 #2) の最初の防壁になる
  - Next.js の `create-next-app` は TypeScript をデフォルトで提供する
  - 開発者は単独想定であり、IDE 補完による生産性向上は明確に効く
- **Alternatives considered**:
  - 素の JavaScript: 型チェックを失う代償が大きい。型がないと「ツール定義に必須項目の欠落」を実行時のみでしか弾けない

---

## D3. パッケージマネージャ: npm vs pnpm vs yarn

- **Decision**: pnpm
- **Rationale**:
  - ローカル単一プロジェクトでもインストール速度・ディスク効率に明確な差がある
  - Next.js 公式ドキュメントが第一級でサポートしている
  - 将来モノレポ化する場合の `pnpm workspace` への移行が滑らか (本フィーチャーでは不要だが、選択肢として残せる)
- **Alternatives considered**:
  - npm: 標準で何の追加導入もいらないが、`node_modules` の重複・速度面で劣る
  - yarn (classic / berry): classic はメンテナンスフェーズ、berry は学習コストが今フィーチャーには過剰

---

## D4. データベースクライアント: 素の `pg` vs ORM (Prisma / Drizzle)

- **Decision**: 素の `pg` のみ採用 (ORM は導入しない)
- **Rationale**:
  - 今フィーチャーで DB に対して必要なのは「接続できるかを確かめる 1 クエリ」だけ (FR-009 / health check)。テーブル定義もスキーマもまだ存在しない
  - ORM を入れると、未使用のマイグレーション基盤・スキーマファイル・型生成パイプラインを抱え込む。憲法 II (Simplicity First) に明確に違反する
  - 後続ツールが本格的に DB を使うフェーズで、必要が確定してから別フィーチャーとして ORM 採択を行えばよい
- **Alternatives considered**:
  - Prisma: 高機能だが、スキーマファイル必須・generate 手順・実行時依存が重い
  - Drizzle: 軽量だが、テーブル定義・型生成が前提。今フィーチャーには過剰
  - Knex などのクエリビルダ: ORM 同様に「対象テーブルがある前提」の道具で、今は不要

---

## D5. テストツール: ユニット (Vitest) と E2E (Playwright)

- **Decision**: Vitest + Playwright
- **Rationale (Vitest)**:
  - Vite ベースで起動が速く、TypeScript 設定がほぼゼロでよい
  - Next.js / React コンポーネントとの相性が良く、`vi.mock` の API がシンプル
  - 今フィーチャーで書くユニットテストは「不正なツール定義を除外する」純粋関数のテスト 1〜2 本に留まるため、最低限の構成で済む
- **Rationale (Playwright)**:
  - SSR を「初回 HTML レスポンスに含まれていること」(User Story 1 受け入れ基準 #3) として検証するには、実ブラウザで `view-source` 相当のチェックができる Playwright が最適
  - Playwright は Next.js 15 公式の Recommended E2E ツールであり、Server Components の確認に困らない
  - User Story 1 (描画 / 空状態) と User Story 2 (リンク遷移) を 1 つの spec ファイルにまとめられる
- **Alternatives considered**:
  - Jest: 設定が重く、ESM / TypeScript 周りで Vitest より追加コストが高い
  - Cypress: API は親しみやすいが、CI/CD の起動・依存ブラウザ管理が Playwright より重い
  - Testing Library 単体での描画テスト: SSR の「初回 HTML に入っている」を検証するには、サーバを実起動して HTML を取得する必要があり、結局 Playwright と同等の仕組みになる

---

## D6. ツールカタログの宣言形式

- **Decision**: TypeScript の静的配列 (`lib/tools/registry.ts` から `export const tools: Tool[]`) として宣言する
- **Rationale**:
  - FR-010 で「リポジトリ管理のコード/設定ファイル方式」を選択済み
  - TypeScript の型 (`Tool`) で必須項目を強制でき、不正定義を「コンパイル時点」で防げる (Edge Cases / User Story 3 受け入れ基準 #2)
  - YAML や JSON の外部ファイル + 別途バリデータ (Zod 等) を入れる選択肢もあるが、当面ツールは全て同一リポジトリ内で実装されるため、型付き配列で十分。外部スキーマと検証層を加えるのはオーバースペック (YAGNI)
  - 新規ツール追加の手順は「型に従って 1 オブジェクトを配列に push する」 + サービス再起動のみ (SC-002 の "5 ステップ以下" を満たす)
- **Validation**:
  - 型では `id` / `slug` / `name` / `path` / `description` を必須にする
  - 実行時バリデータ (薄いガード関数) も `registry.ts` 内に置き、空文字や重複 `slug` を排除して warn ログを残す (Edge Cases)
- **Alternatives considered**:
  - JSON / YAML 設定ファイル: 型強制が効かない、JSON はコメントが書けない、結局スキーマ検証ライブラリが必要
  - DB 登録方式: FR-010 で却下済み (ローカル単一利用者でカタログを動的編集する動機が弱い)
  - 動的スキャン (`app/tools/*/manifest.ts` を glob で集める): 「魔法」が増えて憲法 V (Observable & Debuggable) に逆行する。何が登録されているかを 1 ファイル grep で全把握できる方が良い

---

## D7. docker-compose の構成

- **Decision**: `docker-compose.yml` 1 枚で PostgreSQL 16 を起動。名前付き volume で永続化、`POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` は `.env` 経由
- **Rationale**:
  - SC-003: 「1 コマンドで開発環境を立ち上げられる」 → `docker-compose up -d` + `pnpm dev` の 2 コマンドで充足 (Postgres 起動とアプリ起動は責務が違うため分離するのが妥当)
  - 永続ボリュームがないと、再起動のたびにツール側の開発データが揮発し、後続ツール開発の体験を損なう
  - 環境変数は `.env.example` をコミットし、`.env` は `.gitignore` 対象とする (秘匿情報事故防止)
- **Alternatives considered**:
  - PostgreSQL をホスト直接インストール: 開発機差異・OS 差異を吸収できない (SC-003 の「1 コマンドで」が成り立たない場合がある)
  - SQLite: ローカル単一利用者には充分だが、利用者が明示的に PostgreSQL を指定しているため対象外
  - Dev Container (devcontainer.json): 価値はあるが今フィーチャーのスコープを超え、追加複雑度を持ち込む

---

## D8. スタイリング戦略

- **Decision**: グローバル CSS (`app/globals.css`) + CSS Modules (必要になれば) のみで開始。Tailwind / CSS-in-JS は導入しない
- **Rationale**:
  - 本フィーチャーが描画する UI は「ヘッダ + ツール一覧カード + 空状態メッセージ + DB ステータス表示」の最小構成。Tailwind を入れる前にユーティリティが要るほどの量がない (YAGNI)
  - Next.js 15 標準の CSS Modules で、コンポーネント単位の局所スタイルが必要になれば即対応できる
- **Alternatives considered**:
  - Tailwind: スピードは出るが、ビルド設定 (PostCSS + plugin) と学習コストを払う前にまず最小で動かす
  - shadcn/ui 等のコンポーネント集: 同上。20+ ツールカード + 空状態程度に必要ない
  - styled-components / emotion: Server Components との相性で詰まりやすく、現状回避すべき

---

## D9. DB ヘルスチェックの実装方針 (FR-009 対応)

- **Decision**: `lib/db/health.ts` で `SELECT 1` を 1 回投げる軽量関数を提供し、ダッシュボードトップの Server Component から呼び出す。失敗時は try/catch で握って `{ status: "unreachable", error: <短文> }` を返し、ページ自体は描画継続
- **Rationale**:
  - 「DB が落ちていてもダッシュボードトップは描画継続」(FR-009) を最小コードで満たせる
  - DB 接続エラーは Server Console にもログとして残し (憲法 V: 隠さない)、UI 上は控えめなインジケータ ("DB: unreachable") で表示
  - 接続タイムアウトは `pg` の `connectionTimeoutMillis` を短め (例: 2000ms) に設定し、SC-001 (初回 2 秒以内) を脅かさない
- **Alternatives considered**:
  - DB を一切触らない (今フィーチャーで health check 不要): FR-009 を満たせない (落ちているかどうかすら可視化できない)
  - 専用 `/api/health` エンドポイントを別途切る: SSR ページから直接呼ぶよりホップが増え、初回 SSR を遅らせる。今フィーチャーではオーバースペック

---

## D10. ツール未実装ページの扱い (User Story 2)

- **Decision**: `app/tools/[slug]/page.tsx` を 1 つ用意し、`slug` を `registry.ts` と突き合わせる
  - 一致するエントリがあるが本体がまだない場合 → "Coming soon" プレースホルダ
  - 一致しない場合 → Next.js の `notFound()` で 404
- **Rationale**:
  - User Story 2 受け入れ基準 #2 (「未実装のツールをクリックしても 500/404 にならない」) を満たすには、カタログに載っていれば 200 を返す必要がある
  - 一方で、適当な URL を打たれた場合は 404 でよい (悪意ではなく typo 想定)
- **Alternatives considered**:
  - 全部 200 で受ける (404 を出さない): URL のタイポも黙って受けるのは健全でない。カタログに存在しないものは 404 が誠実
  - プレースホルダもツール側で個別に書く: 本フィーチャー時点では実装するツールがゼロなので、共通プレースホルダで充分
