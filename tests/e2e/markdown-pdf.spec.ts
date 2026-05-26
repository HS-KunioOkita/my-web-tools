import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const SAMPLE_MARKDOWN = `# 動作確認用ドキュメント

こんにちは、世界。日本語の段落がきちんとレンダリングされるかを確認します。

- 箇条書き 1
- 箇条書き 2
  - ネスト

| 列A | 列B |
|-----|-----|
| あい | うえ |
| かき | くけ |

\`\`\`python
def greet():
    print("こんにちは")
\`\`\`
`;

async function fillMarkdown(page: Page, source: string): Promise<void> {
  await page.locator('[data-test="markdown-input"]').fill(source);
  await expect(page.locator('[data-test="preview-root"]')).toHaveAttribute(
    "data-mermaid-status",
    "ready",
  );
}

test.describe("Markdown → PDF (US1 MVP)", () => {
  test("renders Japanese Markdown in the preview", async ({ page }) => {
    await page.goto("/tools/markdown-pdf");
    await expect(page.locator("h1")).toHaveText("Markdown → PDF");
    await expect(page.locator('[data-test="preview-empty"]')).toBeVisible();

    await fillMarkdown(page, SAMPLE_MARKDOWN);

    const preview = page.locator('[data-test="preview-root"]');
    await expect(preview.locator("h1")).toHaveText("動作確認用ドキュメント");
    await expect(preview.locator("table")).toBeVisible();
    await expect(preview.locator("pre")).toBeVisible();
    await expect(preview.locator("p")).toContainText("こんにちは、世界");
  });

  test("downloads a valid PDF that starts with %PDF-", async ({ page }) => {
    await page.goto("/tools/markdown-pdf");
    await fillMarkdown(page, SAMPLE_MARKDOWN);

    const downloadPromise = page.waitForEvent("download");
    await page.locator('[data-test="download-button"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);

    const path = await download.path();
    expect(path).toBeTruthy();
    const buf = await readFile(path!);
    expect(buf.byteLength).toBeGreaterThan(1024);
    const head = buf.subarray(0, 5).toString("utf8");
    expect(head).toMatch(/^%PDF-/);
  });

  test("download button is disabled when input is empty", async ({ page }) => {
    await page.goto("/tools/markdown-pdf");
    const btn = page.locator('[data-test="download-button"]');
    await expect(btn).toBeDisabled();
    await page.locator('[data-test="markdown-input"]').fill("# Hello");
    await expect(page.locator('[data-test="preview-root"]')).toHaveAttribute(
      "data-mermaid-status",
      "ready",
    );
    await expect(btn).toBeEnabled();
    await page.locator('[data-test="markdown-input"]').fill("");
    await expect(btn).toBeDisabled();
  });
});

const MERMAID_MARKDOWN = `# mermaid 動作確認

\`\`\`mermaid
flowchart LR
  A[開始] --> B{条件}
  B -- Yes --> C[処理1]
  B -- No --> D[処理2]
  C --> E[終了]
  D --> E
\`\`\`

\`\`\`mermaid
sequenceDiagram
  利用者 ->> ツール: 入力
  ツール -->> 利用者: プレビュー
\`\`\`
`;

const MERMAID_BROKEN = `# 構文エラー混在

\`\`\`mermaid
flowchart LR
  A --> B
\`\`\`

\`\`\`mermaid
nonsense diagram
  this is not mermaid
\`\`\`

通常の段落も含む。
`;

test.describe("Markdown → PDF (US4 mermaid)", () => {
  test("renders mermaid diagrams as SVG in the preview", async ({ page }) => {
    await page.goto("/tools/markdown-pdf");
    await fillMarkdown(page, MERMAID_MARKDOWN);
    const preview = page.locator('[data-test="preview-root"]');
    const svgs = preview.locator(".mermaid > svg");
    await expect(svgs.nth(0)).toBeVisible();
    await expect(svgs.nth(1)).toBeVisible();
    await expect(await svgs.count()).toBe(2);
  });

  test("downloads PDF when mermaid diagrams are present", async ({ page }) => {
    await page.goto("/tools/markdown-pdf");
    await fillMarkdown(page, MERMAID_MARKDOWN);
    const downloadPromise = page.waitForEvent("download");
    await page.locator('[data-test="download-button"]').click();
    const download = await downloadPromise;
    const path = await download.path();
    const buf = await readFile(path!);
    expect(buf.byteLength).toBeGreaterThan(1024);
    expect(buf.subarray(0, 5).toString("utf8")).toMatch(/^%PDF-/);
  });

  test("broken mermaid fence shows an error placeholder but other blocks still render", async ({
    page,
  }) => {
    await page.goto("/tools/markdown-pdf");
    await fillMarkdown(page, MERMAID_BROKEN);
    const preview = page.locator('[data-test="preview-root"]');
    // First (valid) block renders an SVG
    await expect(preview.locator(".mermaid > svg").nth(0)).toBeVisible();
    // Second (broken) block renders the error placeholder
    await expect(
      preview.locator(".markdown-pdf-mermaid-error"),
    ).toBeVisible();
    await expect(
      preview.locator(".markdown-pdf-mermaid-error"),
    ).toContainText("mermaid 構文エラー");
    // Normal paragraph still renders
    await expect(preview).toContainText("通常の段落も含む。");
  });
});
