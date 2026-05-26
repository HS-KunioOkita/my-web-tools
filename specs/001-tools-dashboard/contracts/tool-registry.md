# Contract: ツールカタログ登録 (Tool Registry)

**Feature**: [001-tools-dashboard](../spec.md)
**Date**: 2026-05-26
**Audience**: 新しいツールをダッシュボードに追加したい開発者 (自分自身を含む)

本書は「新しいツールをダッシュボードのカタログに 1 件追加する」ための対外契約を定める。`/speckit-plan` 由来の Phase 1 成果物であり、後続ツールフィーチャー側はこの契約を満たすことで一覧表示と遷移を保証される。

---

## 1. 物理的に何をするか

新しいツールを追加するときに開発者が **触る** のは以下のみ:

1. `lib/tools/registry.ts` の `RAW_TOOLS` 配列に 1 オブジェクトを追加する
2. (実装するなら) `app/tools/<slug>/page.tsx` を新規作成する
3. サービス再起動 (`pnpm dev` を Ctrl-C → 再実行) でダッシュボードを再描画

これ以外の手順 (DB 更新、ビルド設定変更、追加スクリプト実行) は **発生しないこと** が本フィーチャーで担保される。これは SC-002 ("5 ステップ以下") の根拠でもある。

---

## 2. `Tool` 型 (`lib/tools/types.ts`)

```typescript
export type ToolStatus = "available" | "coming-soon";

export interface Tool {
  /** 不変の一意識別子 (kebab-case 推奨)。`slug` と同値でも可。 */
  id: string;

  /** URL パスに使う英数小文字 + ハイフン。`/tools/<slug>` でアクセスされる。 */
  slug: string;

  /** ダッシュボードカードに表示する日本語名。 */
  name: string;

  /** カードに表示する 1〜2 行の短い説明。 */
  description: string;

  /** 任意。表示分類用ラベル (例: "text", "time")。 */
  category?: string;

  /** 任意。表示順 (昇順)。未指定なら `name` 昇順。 */
  order?: number;

  /** "available" なら本体ページが、"coming-soon" ならプレースホルダが表示される。 */
  status: ToolStatus;
}
```

### 必須フィールド

- `id`
- `slug`
- `name`
- `description`
- `status`

### 制約

- `slug` は `^[a-z0-9-]+$` を満たすこと
- `id` および `slug` は他エントリと重複しないこと
- 全フィールドは空文字 (`""`) ではないこと

これら制約は実行時にも `assertValidTools()` で検証され、違反したエントリは **黙殺ではなく warn ログ付きで除外** される (憲法 V: Observable & Debuggable)。

---

## 3. 登録手順 (実例)

新しく「YAML フォーマッタ」を追加する場合:

```typescript
// lib/tools/registry.ts (差分)
const RAW_TOOLS: Tool[] = [
  // ...既存エントリ...
  {
    id: "yaml-format",
    slug: "yaml-format",
    name: "YAML フォーマッタ",
    description: "YAML の整形・キー並び替え・コメント保持",
    category: "text",
    status: "available", // 本体実装が済んだら "available"
  },
];
```

本体実装ファイル:

```typescript
// app/tools/yaml-format/page.tsx
export default function YamlFormatPage() {
  return <main>{/* ツール本体 */}</main>;
}
```

サービスを再起動して `http://localhost:3000/` を開けば、新エントリがカードとして並ぶ。クリックで `/tools/yaml-format` に遷移する。

---

## 4. プレースホルダ動作 (`status: "coming-soon"`)

- ダッシュボード一覧にはカードが表示される (淡色 / バッジ "Coming soon" など視覚的区別)
- リンク先 `/tools/<slug>` は `app/tools/[slug]/page.tsx` の共通プレースホルダが応答する (200 OK)
- 開発者が `app/tools/<slug>/page.tsx` を実装し、`status` を `"available"` に書き換えれば、自動的に共通プレースホルダではなく本体が描画されるようになる

ルーティング解決順 (Next.js App Router の通常規則):

1. `app/tools/<slug>/page.tsx` が存在する → 本体ページが優先される
2. 存在しない場合 → `app/tools/[slug]/page.tsx` (動的ルート) のプレースホルダが応答する
3. `slug` がカタログに存在しない場合 → `notFound()` で 404

---

## 5. 不正登録時の振る舞い (Edge Cases)

| ケース | 結果 |
|--------|------|
| 必須フィールド欠落 | エントリは除外、`console.warn` で `Tool entry skipped: missing field <name>` |
| 重複 `slug` または `id` | 最初の 1 件を採用、残りは除外、`console.warn` で `Duplicate slug/id skipped: <value>` |
| `slug` が不正な文字を含む | エントリは除外、`console.warn` で `Invalid slug format: <slug>` |
| カタログが 0 件 | ダッシュボードは空状態 ("現在利用可能なツールはありません") を表示。これは仕様通り、エラーではない |

ダッシュボード自体は **どのケースでも 200 OK で描画される** (FR-005 / Edge Cases)。

---

## 6. 後続ツール側の責務

後続のツールフィーチャー (例: 002-markdown-pdf) は以下を必ず守る:

- 自分のエントリ 1 つを `lib/tools/registry.ts` に追加する
- そのエントリの `slug` と一致する `app/tools/<slug>/page.tsx` を提供する
- ダッシュボードや他ツールの登録を **触らない** (憲法 IV: Surgical Changes)
- 必要なら自分の DB スキーマやマイグレーションを自フィーチャー内で持ち込む (本フィーチャーは何も用意しない)
