import { test, expect } from "@playwright/test";

test("editing a user message creates and switches between isolated branches", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /شروع گفتگوی جدید/ }).click();
  await page.getByLabel("متن پیام").fill("نسخه قدیمی");
  await page.getByLabel("ارسال پیام").click();
  await expect(page.locator(".message.assistant")).toContainText("نسخه قدیمی", { timeout: 15_000 });
  await expect(page.getByLabel("ارسال پیام")).toBeVisible();

  await page.getByRole("button", { name: "ویرایش" }).click();
  await page.locator(".message-editor textarea").fill("نسخه جدید");
  await page.getByRole("button", { name: "ذخیره و تولید دوباره" }).click();
  await expect(page.locator(".message.user").getByText("نسخه جدید", { exact: true })).toBeVisible({ timeout: 15_000 });

  const switcher = page.getByLabel("انتخاب مسیر گفتگو");
  await expect(switcher).toBeVisible();
  await switcher.selectOption({ label: "مسیر اصلی" });
  await expect(page.locator(".message.user").getByText("نسخه قدیمی", { exact: true })).toBeVisible();
  await expect(page.locator(".message.user").getByText("نسخه جدید", { exact: true })).not.toBeVisible();
  await expect(page.locator(".message.assistant")).toContainText("نسخه قدیمی");

  await switcher.selectOption({ label: "مسیر 2" });
  await expect(page.locator(".message.user").getByText("نسخه جدید", { exact: true })).toBeVisible();
  await expect(page.locator(".message.user").getByText("نسخه قدیمی", { exact: true })).not.toBeVisible();
});

