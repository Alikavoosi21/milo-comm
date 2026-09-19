import { test, expect } from "@playwright/test";

test("selects an explicit owned conversation reference", async ({ page }) => {
  await page.goto("/");
  const first = await page.request.post("/api/conversations").then((response) => response.json());
  await page.request.post(`/api/conversations/${first.id}/messages`, { data: { content: "اطلاعات مرجع", attachmentIds: [], referenceConversationIds: [], idempotencyKey: crypto.randomUUID() } });
  const second = await page.request.post("/api/conversations").then((response) => response.json());
  await page.goto(`/chat/${second.id}`);
  await page.getByTitle("ارجاع به گفتگوی دیگر").click();
  await page.getByText(/فقط گفتگوهای انتخاب‌شده/).waitFor();
  const option = page.locator(".reference-popover label").first();
  await option.locator("input").check();
  await expect(page.getByText("＠ گفتگوی انتخاب‌شده")).toBeVisible();
});
