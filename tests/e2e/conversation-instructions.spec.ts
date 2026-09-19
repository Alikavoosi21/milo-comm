import { expect, test } from "@playwright/test";

test("persists and clears per-conversation instructions", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /گفتگوی جدید|شروع گفتگوی جدید/ }).first().click();
  await page.getByRole("button", { name: "راهنمای این گفتگو" }).click();

  const editor = page.getByLabel("دستورها و قواعد این گفتگو");
  await editor.fill("پاسخ‌ها کوتاه و رسمی باشند");
  await expect(page.getByText(/۳٬۹۷۴ نویسه باقی مانده/)).toBeVisible();
  await page.getByRole("button", { name: "ذخیره قواعد" }).click();
  await expect(page.getByText("قواعد گفتگو ذخیره شد")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "راهنمای این گفتگو" }).click();
  await expect(editor).toHaveValue("پاسخ‌ها کوتاه و رسمی باشند");
  await page.getByRole("button", { name: "پاک‌کردن قواعد" }).click();
  await page.getByRole("button", { name: "ذخیره قواعد" }).click();
  await expect(editor).toHaveValue("");
});
