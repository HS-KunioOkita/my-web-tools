# Contract: PDF レンダ API

**Feature**: [002-markdown-to-pdf](../spec.md)
**Date**: 2026-05-26
**Endpoint**: `POST /tools/markdown-pdf/api/render`
**Implementation file**: `app/tools/markdown-pdf/api/render/route.ts`

本書はクライアント (`app/tools/markdown-pdf/page.tsx`) とサーバ Route Handler の間の契約を定める。データ型の詳細は [data-model.md](../data-model.md) を参照。

---

## 1. リクエスト

### 1.1 ヘッダ

| ヘッダ | 値 | 必須 |
|--------|-----|------|
| `Content-Type` | `application/json; charset=utf-8` | はい |
| `Accept` | `application/pdf` を含むこと | 推奨 |

### 1.2 ボディ (JSON)

```jsonc
{
  "markdown": "string (UTF-8, 1〜50000 文字 / 1MiB 以内)",
  "templateId": "standard" | "business" | "technical",
  "filename": "string (任意, 拡張子なし, 1〜100 文字, OS 安全文字のみ)"
}
```

### 1.3 メソッド / パス

- **メソッド**: `POST` のみ。`GET` 等は `405 Method Not Allowed` を返す
- **パス**: `/tools/markdown-pdf/api/render` (固定)

---

## 2. 成功レスポンス

### 2.1 ヘッダ

| ヘッダ | 値 |
|--------|-----|
| `Status` | `200 OK` |
| `Content-Type` | `application/pdf` |
| `Content-Disposition` | `attachment; filename="<ascii fallback>.pdf"; filename*=UTF-8''<RFC5987 encoded>.pdf` |
| `Content-Length` | PDF バイト数 |
| `Cache-Control` | `no-store` (永続化禁止方針との整合) |
| `X-Render-Duration-Ms` | サーバ側生成時間 (整数, 観測用) |

### 2.2 ボディ

PDF バイナリ (`%PDF-1.x` で始まる)。1 リクエスト 1 ファイル。

### 2.3 ファイル名規則

- リクエスト `filename` が指定されていれば `<filename>.pdf`
- 未指定なら `document.pdf`
- 末尾の `.pdf` は常に付与される (リクエストで `.pdf` を含めても二重にしない)
- 日本語ファイル名は `filename*=UTF-8''` 形式で UTF-8 エンコードして渡す。互換用に ASCII フォールバック (英数字以外を `_` に置換) を `filename=...` にも入れる

---

## 3. エラーレスポンス

すべて `Content-Type: application/json; charset=utf-8` で以下の形:

```jsonc
{
  "error": "human readable message (日本語可)",
  "code": "machine readable code"
}
```

### 3.1 入力エラー (`400 Bad Request`)

| `code` | 発生条件 | クライアント対応 |
|--------|----------|------------------|
| `BAD_REQUEST_MARKDOWN` | `markdown` が string でない / 空 / 50,000 文字超 / 1MiB 超 | textarea 周辺に上限メッセージ表示 |
| `BAD_REQUEST_TEMPLATE` | `templateId` が未定義値 | プレースホルダなしのテンプレ一覧へリセット |
| `BAD_REQUEST_FILENAME` | `filename` に不正文字 / 100 文字超 | 入力欄を赤くしてメッセージ |
| `BAD_REQUEST_JSON` | リクエストボディが JSON パース不能 | リロード推奨メッセージ |

### 3.2 メソッド不一致 (`405 Method Not Allowed`)

レスポンスヘッダ `Allow: POST`、ボディは `{"error": "method not allowed", "code": "METHOD_NOT_ALLOWED"}`。

### 3.3 サーバ内部エラー (`500 Internal Server Error`)

| `code` | 発生条件 |
|--------|----------|
| `CHROMIUM_LAUNCH_FAILED` | ヘッドレス Chromium の launch に失敗した |
| `MERMAID_TIMEOUT` | mermaid 描画完了シグナルが 10s 待っても立たない |
| `PDF_GENERATION_FAILED` | `page.pdf()` 中の例外 |
| `INTERNAL_ERROR` | 上記以外の未分類例外 |

クライアントには「PDF 生成に失敗しました。時間をおいて再度お試しください」程度の汎用メッセージを表示し、`code` はトーストやログ送信時に内部用として保持する。

---

## 4. 部分エラーの扱い

> mermaid 構文エラーや、外部画像の読み込み失敗等の局所的なエラーは、**HTTP レベルではエラーにしない**。

- mermaid 構文エラー: 該当ブロックを「mermaid 構文エラー」プレースホルダ要素として PDF に含める。他の正常箇所は通常通り。HTTP レスポンスは `200 OK` (FR-011)
- 外部画像取得失敗: 該当 `<img>` を代替テキスト枠で置換し、PDF に含める。HTTP レスポンスは `200 OK` (Edge Cases)
- これらの「PDF には含まれたが個別に描画できなかった要素」の件数を `X-Render-Warnings: N` ヘッダで通知する (任意; 観測のためだけ)

---

## 5. リクエスト/レスポンス例

### 5.1 成功例 (curl)

```bash
curl -sS -X POST http://localhost:3000/tools/markdown-pdf/api/render \
  -H "Content-Type: application/json" \
  --data-binary '{
    "markdown": "# 見出し\n\nこんにちは、世界。\n\n```mermaid\nflowchart LR\nA-->B\n```\n",
    "templateId": "standard",
    "filename": "サンプル"
  }' \
  -o output.pdf -D headers.txt
```

期待される `headers.txt` の冒頭:

```text
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="サンプル.pdf"; filename*=UTF-8''%E3%82%B5%E3%83%B3%E3%83%97%E3%83%AB.pdf
```

### 5.2 入力エラー例

```bash
curl -sS -X POST http://localhost:3000/tools/markdown-pdf/api/render \
  -H "Content-Type: application/json" \
  --data-binary '{"markdown": "", "templateId": "standard"}'
```

```jsonc
HTTP/1.1 400 Bad Request
Content-Type: application/json; charset=utf-8

{"error": "Markdown が空です", "code": "BAD_REQUEST_MARKDOWN"}
```

---

## 6. クライアントの呼び出し責務

`page.tsx` 側は以下を保証する:

1. ボタン押下時、サーバへ送る前にクライアント側でも `markdown` の長さ・テンプレ id・filename を再検証 (UX 上の即時フィードバック)
2. レスポンスが `200 OK` かつ `Content-Type: application/pdf` であることを確認し、`Blob` → `URL.createObjectURL()` → `<a download={filename}>` を `click()` する古典的ダウンロード手法を使う
3. レスポンスが `4xx` / `5xx` の場合は JSON を読み、利用者にトーストでメッセージ表示
4. `URL.revokeObjectURL` を必ず呼び、メモリリークを防ぐ

---

## 7. サーバの不変条件

- `RenderRequest` を受け取った関数は、**ファイルシステムへ書き込まない** (`page.pdf({path})` 不使用、`fs.writeFile`/`fs.createWriteStream` 不使用、`tmp` 利用なし)
- `RenderRequest.markdown` の内容を **ログに出力しない** (長さ・先頭ハッシュ等までに留める)
- Chromium プロセスは **モジュールスコープでシングルトン**。リクエストごとに `browser.newPage()` を生成し、終了時に `page.close()` する
- 同時実行は Node のシングルスレッド + Playwright ページ並列で素直に処理する。明示的なキューや排他は導入しない (YAGNI / 単一利用前提)
