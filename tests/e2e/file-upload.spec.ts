import { test, expect } from "@playwright/test";

test("guides file selection, rejects unsafe input, and preserves the draft", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /شروع گفتگوی جدید/ }).click();
  await expect(page.getByText(/PDF، DOCX، TXT، MD، CSV/)).toBeVisible();

  await page.getByLabel("متن پیام").fill("این متن باید حفظ شود");
  const input = page.locator('input[type="file"]');
  await input.setInputFiles({ name: "unsafe.zip", mimeType: "application/zip", buffer: Buffer.from("zip") });
  await expect(page.getByText(/فایل پذیرفته نشد/)).toBeVisible();
  await expect(page.getByLabel("متن پیام")).toHaveValue("این متن باید حفظ شود");

  await input.setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("safe text") });
  await expect(page.getByText("notes.txt")).toBeVisible();
  await page.getByRole("button", { name: "حذف notes.txt" }).click();
  await expect(page.getByText("notes.txt")).not.toBeVisible();
  await expect(page.getByLabel("متن پیام")).toHaveValue("این متن باید حفظ شود");
});
