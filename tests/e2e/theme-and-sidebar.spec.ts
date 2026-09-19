import { test, expect } from "@playwright/test";

test("persists theme and supports RTL keyboard sidebar navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.keyboard.press("Tab");
  await expect(page.locator(".new-chat")).toBeFocused();

  await page.getByRole("button", { name: /فعال‌کردن حالت تاریک/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".new-chat")).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
});

