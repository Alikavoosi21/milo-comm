import { expect, test } from "@playwright/test";

test("keeps a tall independent transcript and an accessible composer", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /گفتگوی جدید|شروع گفتگوی جدید/ }).first().click();
  const transcript = page.locator(".chat-scroll");
  const composer = page.locator(".composer-wrap");
  await expect(transcript).toBeVisible();
  await expect(composer).toBeVisible();

  const metrics = await transcript.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    viewport: window.innerHeight,
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  const minimum = testInfo.project.name.includes("mobile") ? 0.7 : 0.75;
  expect(metrics.height / metrics.viewport).toBeGreaterThanOrEqual(minimum);
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
});
