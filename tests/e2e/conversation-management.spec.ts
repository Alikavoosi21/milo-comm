import { expect, test } from "@playwright/test";

test("renames, cancels deletion, and permanently deletes a conversation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /گفتگوی جدید|شروع گفتگوی جدید/ }).first().click();
  await expect(page).toHaveURL(/\/chat\//);

  await page.getByRole("button", { name: "عملیات گفتگو" }).first().click();
  await page.getByRole("menuitem", { name: "تغییر نام" }).click();
  const title = page.getByLabel("نام گفتگو");
  await title.fill("برنامه درس فارسی");
  await title.press("Enter");
  await expect(page.getByRole("heading", { name: "برنامه درس فارسی" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "برنامه درس فارسی" })).toBeVisible();

  await page.getByRole("button", { name: "عملیات گفتگو" }).first().click();
  await page.getByRole("menuitem", { name: "حذف گفتگو" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("حذف دائمی");
  await page.getByRole("button", { name: "انصراف" }).click();
  await expect(page).toHaveURL(/\/chat\//);

  await page.getByRole("button", { name: "عملیات گفتگو" }).first().click();
  await page.getByRole("menuitem", { name: "حذف گفتگو" }).click();
  await page.getByRole("button", { name: "حذف دائمی" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByText("برنامه درس فارسی", { exact: true })).toHaveCount(0);
});
