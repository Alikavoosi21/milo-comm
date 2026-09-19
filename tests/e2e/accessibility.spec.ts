import { test, expect } from "@playwright/test";

test("main shell exposes Persian RTL semantics and named controls", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  if (testInfo.project.name.includes("mobile")) await expect(page.locator(".conversation-nav")).toBeHidden();
  else await expect(page.getByRole("navigation", { name: "گفتگوها" })).toBeVisible();
  await expect(page.getByRole("button", { name: /فعال‌کردن حالت/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "تنظیمات" })).toHaveAccessibleName("تنظیمات");
});

test("delete dialog keeps safe focus and returns it to the trigger", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /گفتگوی جدید|شروع گفتگوی جدید/ }).first().click();
  const trigger = page.getByRole("button", { name: "عملیات گفتگو" });
  await trigger.click();
  await page.getByRole("menuitem", { name: "حذف گفتگو" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "انصراف" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
