import { test, expect } from "@playwright/test";

test("shows knowledge sources without allowing chat uploads and preserves the draft", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /شروع گفتگوی جدید/ }).click();
  await page.getByLabel("متن پیام").fill("این متن باید حفظ شود");

  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await page.getByRole("button", { name: "نمایش منابع دانش" }).click();
  const dialog = page.getByRole("dialog", { name: "منابع دانش" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(/هنوز منبعی ثبت نشده است|منابع دانش/);
  await expect(page.getByLabel("متن پیام")).toHaveValue("این متن باید حفظ شود");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
