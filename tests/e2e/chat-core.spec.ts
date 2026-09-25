import { expect, test } from "@playwright/test";

test("answers with the exact fixed text when there are no admin sources", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /شروع گفتگوی جدید/ }).click();
  await page.getByLabel("متن پیام").fill("پاسخ این پرسش کجاست؟");
  await page.getByLabel("متن پیام").press("Enter");
  await expect(page.locator(".message.assistant").last()).toContainText(
    "متاسفانه خواسته شما در منابع تعیین شده وجود ندارد، لطفا منبع مناسب این سوال رو وارد کنید"
  );
  await expect(page.getByLabel("ارسال پیام")).toBeVisible();
});
