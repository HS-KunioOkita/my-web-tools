# Implementation Plan: ローカルWebツール群ダッシュボード基盤

**Branch**: `001-tools-dashboard` | **Date**: 2026-05-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-tools-dashboard/spec.md`

**Note**: 本ファイルは `/speckit-plan` で生成。テンプレート: `.specify/templates/plan-template.md`

## Summary

ローカルPC上で動く個人向けWebツール群の「入口」となるダッシュボードを構築する。仕様で確定した主要事項:

- **P1**: ダッシュボードのトップページで、登録済みツール一覧を **サーバ側で描画 (SSR)** して返す
- **P2**: 各ツールエントリは個別ツールページ (未実装時はプレースホルダ) へリンクする
- **P3**: ツールカタログは **リポジトリ管理のコード/設定ファイル** で宣言する (運用時のDB更新方式は採用しない、FR-010 確定)

技術アプローチ:

- **Next.js 15 (App Router) + React 19 + TypeScript 5** で SSR を実現する
- **PostgreSQL 16** は `docker-compose` で同梱起動する。今フィーチャー時点では「後続ツール用の永続化層」として待機させるだけで、ダッシュボード自体は DB ヘルスチェックの 1 クエリにしか使わない (Edge Case / FR-009 対応)
- **ツールカタログは TypeScript の静的配列** (`lib/tools/registry.ts`) で宣言する。後続ツールを追加するときは、このファイルに 1 エントリ追加してサービス再起動するだけで一覧に反映される
- **テスト戦略は behavior-focused** に絞る。Playwright で「ダッシュボードを開くとツールが SSR で含まれている」を 1 本、Vitest で「不正なツール定義はカタログから除外される」を 1 本

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 15 同梱の Node.js ランタイム; 開発機 Node 20 LTS 以降)

**Primary Dependencies**:
- Next.js 15 (App Router, React Server Components, SSR)
- React 19
- `pg` (PostgreSQL ドライバ; ORM は採用しない — 必要になるまで導入しない)
- 開発依存: Vitest, Playwright, @types/node, @types/pg, ESLint, Prettier

**Storage**: PostgreSQL 16 (docker-compose で起動。今フィーチャー時点では「接続できることの確認」用のみ。スキーマは作成しない)

**Testing**:
- Vitest (ユニット: ツールカタログのバリデーション)
- Playwright (E2E: ダッシュボードの SSR レンダリング、空状態、リンク遷移)

**Target Platform**: macOS / Linux 開発機。ブラウザは Chrome / Safari / Firefox 各最新版

**Project Type**: web (Next.js のフルスタックアプリ 1 つ。`backend/` `frontend/` 分離はしない)

**Performance Goals**:
- ダッシュボード初回表示: ローカル環境で **2 秒以内** (spec SC-001)
- ツール 20 件以上でも表示崩れなし (spec SC-004)

**Constraints**:
- ローカル単一利用者前提 (認証なし、HTTP)
- 既定ポート: アプリ `3000` / Postgres `5432`
- `docker-compose up` 1 回で DB を立ち上げられること (spec SC-003)
- DB 未起動でもダッシュボードトップは描画継続 (FR-009)
- ツールカタログは Git 管理下のソース (TypeScript) として宣言 (FR-010)

**Scale/Scope**:
- ツールカタログは 0〜数十件 (実用上 50 件未満) の規模を想定
- リポジトリ全体は小規模 (実装目標は数百〜数千 LOC; 過剰な抽象禁止)

## Constitution Check

*GATE: Phase 0 研究の前に必ず通過させ、Phase 1 設計後に再評価する。*

| Principle | 適合状況 | 根拠 |
|-----------|---------|------|
| **I. Spec-Driven Development** | ✅ Pass | spec.md → plan.md → tasks.md → implement の流れに従う。本ファイルは `/speckit-plan` から自動生成 |
| **II. Simplicity First (YAGNI)** | ✅ Pass | 認証なし、ORM なし、モノレポなし、状態管理ライブラリなし、CSS フレームワークも標準 CSS + Tailwind の必要性は研究で再評価。ツールカタログは「ただの TypeScript 配列」 |
| **III. Behavior-Focused Testing** | ✅ Pass | P1 (一覧 SSR) を Playwright で 1 本、P3 (不正定義除外) を Vitest で 1 本。フレームワーク内部テストや「カバレッジ稼ぎ」テストは追加しない |
| **IV. Surgical, Reviewable Changes** | ✅ Pass (Plan 段階) | 個別タスクは `/speckit-tasks` で分割し、コミット粒度は 1 タスク 1 コミットを目安 |
| **V. Observable & Debuggable** | ✅ Pass | 不正ツール定義は warn ログを残してスキップ (Edge Cases)。DB ヘルスチェック結果はダッシュボード上に視認可能な小さなインジケータとして表示。SSR 中のエラーは Next.js の標準エラーログに残し、利用者には「読み込みに失敗しました」程度の友好的メッセージを表示 |

**Initial gate result**: ✅ All gates pass. 違反による Complexity Tracking エントリなし。

**Post-Design re-check (Phase 1 完了後)**: ✅ All gates pass.

- research.md で確定した依存 (`pg` のみ、ORM 不採用、Tailwind 不採用) は Principle II と整合
- data-model.md は永続化エンティティを新設せず (DB スキーマゼロ)、Principle II と整合
- contracts/tool-registry.md は「登録は配列に 1 行追加するだけ」を明文化、Principle II と SC-002 を担保
- quickstart.md に DB ダウン時の挙動確認手順を含め、Principle V (Observable) と FR-009 を運用面でも追跡可能にした
- 新たな違反・複雑度の追加は発生せず、Complexity Tracking 表は引き続き空

## Project Structure

### Documentation (this feature)

```text
specs/001-tools-dashboard/
├── plan.md              # 本ファイル
├── research.md          # Phase 0 出力
├── data-model.md        # Phase 1 出力
├── quickstart.md        # Phase 1 出力 (1コマンド起動手順)
├── contracts/
│   └── tool-registry.md # ツール登録の開発者向け契約
└── tasks.md             # Phase 2 出力 (/speckit-tasks で生成。本コマンドでは作らない)
```

### Source Code (repository root)

```text
my-web-tools/
├── docker-compose.yml         # postgres サービス定義 (永続ボリューム付き)
├── .env.example               # DATABASE_URL の例
├── package.json
├── pnpm-lock.yaml             # package manager は pnpm (research.md で根拠)
├── tsconfig.json
├── next.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── app/
│   ├── layout.tsx             # ルートレイアウト (ヘッダ・フッタ・日本語UI)
│   ├── page.tsx               # ダッシュボード本体 (User Story 1 / SSR)
│   ├── globals.css
│   └── tools/
│       └── [slug]/
│           └── page.tsx       # 未実装ツール用プレースホルダ (User Story 2)
├── lib/
│   ├── tools/
│   │   ├── types.ts           # Tool 型定義
│   │   └── registry.ts        # ツールカタログ宣言 + バリデーション (User Story 3 の枠組み)
│   └── db/
│       └── health.ts          # DB ヘルスチェック (FR-009)
└── tests/
    ├── unit/
    │   └── registry.test.ts   # 不正定義除外 (Vitest)
    └── e2e/
        └── dashboard.spec.ts  # SSR 描画 / 空状態 / リンク遷移 (Playwright)
```

**Structure Decision**: 単一 Next.js アプリをリポジトリルート直下に置くフラット構成を採用する (テンプレートの "single project" に最も近い)。理由:

- ダッシュボード自体が「ホスト」であり、後続ツールはサブルート (`app/tools/<slug>/`) として同一アプリ内に追加される予定。モノレポにする経済的根拠は現時点でない (YAGNI)
- 憲法 "Each tool SHOULD live in its own directory" は「リポジトリレベルで複数の独立アプリが並ぶ場合」を想定したガイダンスであり、本フィーチャーは「ダッシュボード＋複数ツールを同居させる 1 つの web 基盤」というスコープのため、ディレクトリ分離は app ルーティングレベル (`app/tools/<slug>/`) で実現する
- 将来、特定ツールが極端に重くなった場合は別アプリへ切り出すリファクタを別フィーチャーとして起こす

## Complexity Tracking

> Constitution Check の違反はなし。本セクションは空。

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| (none)    | —          | —                                    |
