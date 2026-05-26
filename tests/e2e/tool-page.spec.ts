import { expect, test } from "@playwright/test";

test.describe("Tool Page (US2)", () => {
  test("ダッシュボードのカードから個別ツールへ遷移しプレースホルダが見える", async ({
    page,
  }) => {
    // 002-markdown-to-pdf 実装後、Markdown → PDF は実体ページに切り替わったため
    // 残る coming-soon ツールの 1 つで遷移確認する
    await page.goto("/");
    await page.getByText("時刻変換").click();
    await expect(page).toHaveURL(/\/tools\/time-convert$/);
    await expect(page.getByText("このツールは現在準備中です")).toBeVisible();
    await expect(page.getByRole("link", { name: /ダッシュボードに戻る/ })).toBeVisible();
  });

  test("直接 URL アクセスでもプレースホルダが 200 で表示される", async ({
    page,
  }) => {
    const response = await page.goto("/tools/json-format");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
    await expect(page.getByText("JSON フォーマッタ")).toBeVisible();
  });

  test("未登録の slug は 404", async ({ page }) => {
    const response = await page.goto("/tools/non-existent");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(404);
  });
});
