import { expect, test } from "@playwright/test";

test.describe("Tool Page (US2)", () => {
  test("ダッシュボードのカードから個別ツールへ遷移しプレースホルダが見える", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByText("Markdown → PDF").click();
    await expect(page).toHaveURL(/\/tools\/markdown-pdf$/);
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
