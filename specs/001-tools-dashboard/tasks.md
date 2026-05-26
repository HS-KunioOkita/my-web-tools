---

description: "Task list for 001-tools-dashboard"
---

# Tasks: ローカルWebツール群ダッシュボード基盤

**Input**: Design documents from `/specs/001-tools-dashboard/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/tool-registry.md](./contracts/tool-registry.md), [quickstart.md](./quickstart.md)

**Tests**: 採用する (plan.md で Vitest unit + Playwright E2E を明示)。各 User Story の挙動テストを含める。

**Organization**: タスクは User Story 単位でグループ化し、各ストーリーが独立に実装・検証できることを保証する。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可 (異なるファイル、未完了タスクへの依存なし)
- **[Story]**: 所属する User Story (US1 / US2 / US3)。Setup / Foundational / Polish は付与しない
- 各タスクの説明には対象ファイルの絶対パス起点 (リポジトリルートからの相対) を明示

## Path Conventions

リポジトリルート直下のフラット構成 (plan.md "Structure Decision"):

- ソース: `app/`, `lib/`
- テスト: `tests/unit/`, `tests/e2e/`
- 設定: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `docker-compose.yml`, `.env.example`, `.gitignore`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Next.js + pnpm + Docker の土台を作る

- [x] T001 リポジトリルートで `pnpm init` を実行し `package.json` を生成 (name, version, type: module を含む) → `package.json`
- [x] T002 ランタイム + 開発依存を一括インストール: `pnpm add next@15 react@19 react-dom@19 pg` および `pnpm add -D typescript @types/node @types/react @types/react-dom @types/pg vitest @vitest/coverage-v8 @playwright/test eslint eslint-config-next prettier` → `package.json`, `pnpm-lock.yaml`
- [x] T003 [P] `tsconfig.json` を作成 (Next.js 標準: `target: ES2022`, `module: esnext`, `moduleResolution: bundler`, `jsx: preserve`, `paths` で `@/*` → `./*`) → `tsconfig.json`
- [x] T004 [P] `next.config.ts` を作成 (最小構成; `experimental` は触らない) → `next.config.ts`
- [x] T005 [P] `.gitignore` を作成 (`node_modules/`, `.next/`, `.env`, `.env.local`, `coverage/`, `playwright-report/`, `test-results/`, `*.log`) → `.gitignore`
- [x] T006 [P] `.env.example` を作成 (`DATABASE_URL=postgres://app:app@localhost:5432/app` をコメント付きで記載) → `.env.example`
- [x] T007 [P] `docker-compose.yml` を作成 (service: `postgres:16`, env は `POSTGRES_DB/USER/PASSWORD` を `.env` から読む, named volume `pgdata` で `/var/lib/postgresql/data` を永続化, port `5432:5432`) → `docker-compose.yml`
- [x] T008 `package.json` の `scripts` セクションに `dev`, `build`, `start`, `lint`, `test:unit`, `test:e2e` を追加 (T002 完了が前提) → `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 全 User Story が依存する型・レイアウト・テスト基盤を整える

**⚠️ CRITICAL**: 以下が揃うまで User Story の実装は開始できない

- [x] T009 `app/layout.tsx` を作成 (`<html lang="ja">`, `<body>` 直下に `children`, `globals.css` を import) → `app/layout.tsx`
- [x] T010 [P] `app/globals.css` を作成 (最小: CSS reset 相当の余白ゼロ化, `body` の `font-family` 指定, `:root` で基本カラー変数 2〜3 個) → `app/globals.css`
- [x] T011 [P] `lib/tools/types.ts` を作成 (contracts/tool-registry.md §2 の `Tool` と `ToolStatus` をそのまま export) → `lib/tools/types.ts`
- [x] T012 [P] `vitest.config.ts` を作成 (TypeScript 直読み, `test.environment: "node"`, `test.include: ["tests/unit/**/*.test.ts"]`) → `vitest.config.ts`
- [x] T013 [P] `playwright.config.ts` を作成 (`testDir: "tests/e2e"`, `use.baseURL: "http://localhost:3000"`, `webServer: { command: "pnpm dev", port: 3000, reuseExistingServer: true }`, projects に chromium のみ) → `playwright.config.ts`

**Checkpoint**: 型・レイアウト・テスト基盤が整い、User Story 実装に着手可能

---

## Phase 3: User Story 1 - ダッシュボードでツール一覧を確認する (Priority: P1) 🎯 MVP

**Goal**: ダッシュボードのトップページを開くと、登録済みツール一覧が **SSR で** 描画され、初回 HTML レスポンスに含まれている。0 件時は空状態を表示する。

**Independent Test**: `pnpm dev` でアプリ起動 → `curl http://localhost:3000/` で取得した HTML 内に登録ツール名が含まれることを確認。`RAW_TOOLS = []` に書き換えた場合は "現在利用可能なツールはありません" 相当の文言が含まれることを確認。

### Tests for User Story 1 ⚠️

> 実装より先に書き、最初は FAIL することを確認してから T016〜T019 を進める

- [x] T014 [P] [US1] `tests/e2e/dashboard.spec.ts` を作成 (3 シナリオ: (a) ツール 3 件登録時に各ツール名が表示される, (b) `[]` のとき空状態文言が表示される — テスト内ではカタログ書き換えが破壊的になるため `data-test='tool-card'` の存在チェックで代替し、空状態は quickstart §4 P1 で手動検証, (c) `page.content()` の HTML 文字列に最初のツール名が含まれている [SSR 検証]) → `tests/e2e/dashboard.spec.ts`

### Implementation for User Story 1

- [x] T015 [US1] `lib/tools/registry.ts` を作成 (data-model.md の例に倣い、`RAW_TOOLS` に 3 件 [`markdown-pdf`, `time-convert`, `json-format`] を全て `status: "coming-soon"` で宣言。最小実装の `assertValidTools()` は必須フィールド欠落のみチェックして欠落エントリを除外。重複検知や正規表現は US3 で追加。) → `lib/tools/registry.ts`
- [x] T016 [US1] `lib/db/health.ts` を作成 (`pg.Pool` を `DATABASE_URL` から生成、`connectionTimeoutMillis: 2000`、`getDbHealth()` は `SELECT 1` を投げて成功時 `{status:"ok", latency}` / 失敗時 `{status:"unreachable", error}` を返す。例外はサーバログにのみ `console.error`) → `lib/db/health.ts`
- [x] T017 [US1] `app/page.tsx` を Server Component として実装 (`tools` を `lib/tools/registry` から import、`getDbHealth()` を await、ツール 0 件なら空状態を、1 件以上ならカード一覧を描画。各カードは `<Link href={`/tools/${tool.slug}`}>` でラップしておく [US2 で遷移可能になる]。ヘッダ下に DB ステータスを小さく表示) → `app/page.tsx`
- [x] T018 [US1] `app/globals.css` にダッシュボード用スタイルを追記 (`.tool-grid` の grid layout, `.tool-card` の見た目, `.empty-state` の中央寄せ, `.db-status` のインジケータ) → `app/globals.css`

**Checkpoint**: `pnpm test:e2e tests/e2e/dashboard.spec.ts` がパス。MVP として独立に出荷可能 (ツール本体は coming-soon プレースホルダ待ちでも、ダッシュボード自体は完成)。

---

## Phase 4: User Story 2 - 一覧から各ツールへ遷移する (Priority: P2)

**Goal**: ダッシュボードの各カードをクリックすると `/tools/<slug>` に遷移。実体ページがあればそれを、なければ未実装プレースホルダを返す (200 OK)。カタログに無い `slug` は 404。

**Independent Test**: dev サーバ起動状態で `curl -i http://localhost:3000/tools/markdown-pdf` が 200 を返し本文に "Coming soon" 相当文言が含まれること、`curl -i http://localhost:3000/tools/non-existent` が 404 を返すことを確認。

### Tests for User Story 2 ⚠️

- [x] T019 [P] [US2] `tests/e2e/tool-page.spec.ts` を作成 (3 シナリオ: (a) ダッシュボードカードをクリックして `/tools/markdown-pdf` に遷移し coming-soon プレースホルダが見える, (b) 直接 `/tools/json-format` を開いてもプレースホルダが見える, (c) `/tools/non-existent` は 404) → `tests/e2e/tool-page.spec.ts`

### Implementation for User Story 2

- [x] T020 [US2] `app/tools/[slug]/page.tsx` を作成 (Server Component、`params.slug` で `tools` 配列を検索、ヒットしなければ `notFound()`、ヒットしたエントリは `status` に関わらず本体実装が無いため共通プレースホルダ JSX を描画。プレースホルダにはツール名と「このツールは現在準備中です」のメッセージ、ダッシュボードに戻る `<Link href="/">`を含める。プレースホルダ用スタイルも `app/globals.css` に追記) → `app/tools/[slug]/page.tsx`, `app/globals.css`

**Checkpoint**: US1 + US2 のどちらも独立にテスト可能 (`pnpm test:e2e` で両方パス)。

---

## Phase 5: User Story 3 - 新規ツールをカタログに追加できる (Priority: P3)

**Goal**: ツール定義のバリデーションを強化し、不正定義 (必須欠落 / `slug` 不正 / 重複) は warn ログ付きで除外され、ダッシュボード全体は壊れず描画される。新規追加は配列に 1 エントリ + サービス再起動だけで反映できる (SC-002)。

**Independent Test**: 不正エントリを混ぜた配列を `assertValidTools()` に渡したユニットテストが全て期待通りに振る舞う (除外 + warn 発火)。実際に `RAW_TOOLS` に不正エントリを 1 件混ぜてダッシュボードを開いても、正常エントリだけが表示され 500 にならない。

### Tests for User Story 3 ⚠️

- [x] T021 [P] [US3] `tests/unit/registry.test.ts` を作成 (5 ケース: (a) 必須フィールド欠落エントリは除外, (b) `slug` が `^[a-z0-9-]+$` に違反するエントリは除外, (c) 同一 `slug` の重複は最初の 1 件のみ残る, (d) `status` が許容値外なら除外, (e) `order` 指定 → 未指定 (name 昇順) の安定ソート。warn 発火は (a)〜(d) で検証) → `tests/unit/registry.test.ts`

### Implementation for User Story 3

- [x] T022 [US3] `lib/tools/registry.ts` の `assertValidTools()` を完成形に拡張 (必須フィールド検証 + `slug` 正規表現 + `id`/`slug` 重複除外 + `status` 列挙チェック + `order` の型ガード + warn ログ。除外時のメッセージは contracts/tool-registry.md §5 の文言に揃える。`order` 指定エントリ→未指定エントリの順、それぞれ昇順安定ソート) → `lib/tools/registry.ts`

**Checkpoint**: `pnpm test:unit` 全パス。US1 / US2 の E2E も引き続きパス (壊していないこと確認)。

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 仕上げと FR-009 (DB 断時挙動) の手動受け入れ

- [x] T023 [P] `app/page.tsx` で `status === "coming-soon"` のツールカードに視覚的バッジ ("準備中") を追加し、`app/globals.css` に対応スタイルを追記 → `app/page.tsx`, `app/globals.css`
- [x] T024 [P] `pnpm lint` を実行し、ESLint 警告/エラーを 0 にする (Next.js デフォルトルールから外れない限り) → 該当ファイル。なお `next lint` は Next 16 で廃止予定 + `eslint-config-next@16` と `eslint@10` の互換問題があったため、`eslint.config.mjs` (flat config) + `typescript-eslint` で代替。`app/`, `lib/`, `tests/` 全てクリーン
- [x] T025 quickstart.md §4 の全シナリオを手動で実行: P1 (一覧 SSR + 空状態) → Playwright 6/6 PASS。P2 (遷移 + 404) → 200 + プレースホルダ / 404 双方確認。P3 (新規追加が反映) → registry に load 時 console.warn が出る形で確認可能 (unit テスト 5/5 PASS)。Edge (DB 停止時のページ描画継続) → `docker compose stop` 後も HTTP 200 + ツール名表示を curl で確認。idle client error が uncaughtException 化する問題は health.ts に `pool.on("error", ...)` を追加して恒久対処。SC-001〜004 すべて充足 → 検証のみ

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: 依存なし。最初に着手
- **Phase 2 Foundational**: Phase 1 完了が前提。Phase 3+ をブロックする
- **Phase 3 (US1)**: Phase 2 完了後に開始可能。MVP のスコープ
- **Phase 4 (US2)**: Phase 2 完了後に開始可能。US1 とは独立に開発できるが、E2E 確認は US1 のダッシュボードを使う
- **Phase 5 (US3)**: Phase 2 完了後に開始可能。US1 の `registry.ts` を拡張する形になるため、US1 完了後に着手するのが衝突回避上スムーズ
- **Phase 6 Polish**: 全ての対象 User Story 完了が前提

### Within Each User Story

- テストを先に書き、FAIL を確認してから実装に進む (TDD は厳格には強制しないが、E2E の挙動定義として有用)
- US1: registry → db/health → page → styles の順 (page が両方に依存)
- US2: 単一ファイル `app/tools/[slug]/page.tsx` の追加のみ
- US3: ユニットテスト → registry 拡張

### Parallel Opportunities

- **Phase 1 内**: T003〜T007 は別々の独立ファイル ([P] 付き)
- **Phase 2 内**: T010〜T013 は別々のファイル ([P] 付き)
- **Phase 3 内**: T014 (E2E テスト記述) は実装 T015〜T018 と並列に着手可能 (FAIL 状態で OK)。T015 / T016 はそれぞれ別ファイルなので [P] にしてもよいが、T017 が両方に依存するためここでは sequential を推奨
- **チーム並行 (人数があれば)**: Phase 2 完了後、US1 担当 / US2 担当 / US3 担当が同時並行で進行可能 (US3 だけは US1 の registry に追従するため軽い同期が必要)

---

## Parallel Example: Phase 1 Setup

```bash
# T001 → T002 を順に実行した後、以下は並列で着手可能:
Task: "T003: tsconfig.json を作成"
Task: "T004: next.config.ts を作成"
Task: "T005: .gitignore を作成"
Task: "T006: .env.example を作成"
Task: "T007: docker-compose.yml を作成"
# 最後に T008 (package.json scripts 追記) を順に実行
```

## Parallel Example: User Story 1

```bash
# T014 (E2E テスト) は実装と並走可能:
Task: "T014 [US1] tests/e2e/dashboard.spec.ts を作成 (まず FAIL を確認)"

# その後、実装を順に進める:
Task: "T015 [US1] lib/tools/registry.ts を作成"
Task: "T016 [US1] lib/db/health.ts を作成"
Task: "T017 [US1] app/page.tsx を実装 (T015, T016 に依存)"
Task: "T018 [US1] app/globals.css にダッシュボードスタイル追記"
```

---

## Implementation Strategy

### MVP First (User Story 1 のみ)

1. Phase 1 Setup を完了
2. Phase 2 Foundational を完了 (型・レイアウト・テスト基盤)
3. Phase 3 US1 を完了
4. **STOP and VALIDATE**: `pnpm test:e2e tests/e2e/dashboard.spec.ts` が緑、quickstart.md §4 の P1 シナリオが通る
5. ここまでで「ダッシュボード基盤」としては最低限の価値が出ているので、一度コミット/PR 化してデモ可

### Incremental Delivery

1. Setup + Foundational → 基盤完成
2. US1 → MVP 出荷 (上記)
3. US2 追加 → ツール導線が機能する。SC で言えば「2 秒以内に開ける」「遷移できる」を満たす
4. US3 追加 → 拡張性 (新規ツール追加の安全性) を担保
5. Polish → DB 断時の手動確認 + 視覚バッジ + lint

### Parallel Team Strategy

開発者が複数いる場合:

1. 1 人が Phase 1 + Phase 2 を完了させる (土台の競合を避ける)
2. 完了後:
   - 開発者 A: US1
   - 開発者 B: US2 (US1 のカード `<Link>` が機能していない状態でも `[slug]/page.tsx` 単独で開発・テストできる)
   - 開発者 C: US3 (US1 完了を待ってから着手するのが衝突回避上ベター。それまでは tests/unit/registry.test.ts の準備のみ)
3. Polish は全員が自分の関わったストーリーの仕上げに合流

---

## Notes

- [P] = 異なるファイル・未完了タスクへの依存なし
- 各タスクは 1 コミット〜数コミットで完結する粒度を意図 (憲法 IV: Surgical Changes)
- 「Done」は実装した本人が ① 自テスト緑 ② quickstart の関連シナリオを手で通す、までを指す (憲法: Done means verified)
- 同一ファイルを複数タスクが触る箇所 (US1 → US3 で `lib/tools/registry.ts`、US1 → Polish で `app/page.tsx`/`app/globals.css`) は **同時並列不可**。順序通り進めること
- ドキュメント追加 (README 等) は本フィーチャー範囲外 (CLAUDE.md / quickstart.md で十分)
