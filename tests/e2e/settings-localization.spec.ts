import { expect, test } from "@playwright/test";

test("shows Persian RTL settings and persists theme", async ({ page }) => {
  await page.goto("/");
  const settingsLink = page.getByRole("link", { name: "تنظیمات" });
  await settingsLink.focus();
  await expect(settingsLink).toBeFocused();
  await settingsLink.press("Enter");
  await expect(page).toHaveURL("/settings");
  await expect(page.getByRole("heading", { name: "تنظیمات" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByRole("button", { name: /فعال‌کردن حالت تاریک|فعال‌کردن حالت روشن/ }).last().click();
  await expect(page.getByRole("status")).toContainText("ذخیره");
  const theme = await page.locator("html").getAttribute("data-theme");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme!);
});
