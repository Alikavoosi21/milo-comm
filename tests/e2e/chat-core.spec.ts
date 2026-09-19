import { test, expect } from "@playwright/test";

test("creates a Persian chat, keeps context, streams, cancels, and retries", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /شروع گفتگوی جدید/ }).click();

  await page.getByLabel("متن پیام").fill("نام من علی است");
  await page.getByLabel("متن پیام").press("Enter");
  await expect(page.getByText(/در حال (بررسی|آماده‌سازی|تولید)/)).toBeVisible();
  await expect(page.getByText(/پیام شما را بررسی کردم/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel("ارسال پیام")).toBeVisible();

  await page.getByLabel("متن پیام").fill("نام من چه بود؟");
  await page.getByLabel("متن پیام").press("Enter");
  await expect(page.getByText(/زمینهٔ قبلی.*علی/).last()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel("ارسال پیام")).toBeVisible();

  await page.getByLabel("متن پیام").fill("این پاسخ را متوقف کن");
  await page.getByLabel("متن پیام").press("Enter");
  await page.getByLabel("توقف تولید پاسخ").click();
  await expect(page.locator(".chat-error")).toContainText("متوقف شد");
  await page.getByRole("button", { name: "تلاش دوباره" }).click();
  await expect(page.locator(".message.assistant").last()).toContainText("این پاسخ را متوقف کن", { timeout: 15_000 });
});
