import { expect, test } from "@playwright/test";

test("summarizes a long conversation and opens chunking controls", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /شروع گفتگوی جدید/ }).click();
  for (let index = 0; index < 4; index++) {
    const text = "هدف گفتگو بررسی محصول است. " + "الف".repeat(370) + " " + index;
    await page.getByLabel("متن پیام").fill(text);
    await page.getByLabel("متن پیام").press("Enter");
    await expect(page.locator(".message.assistant").nth(index)).toContainText("متاسفانه خواسته شما در منابع تعیین شده وجود ندارد", { timeout: 15_000 });
    await expect(page.getByLabel("توقف تولید پاسخ")).toBeHidden();
  }
  const conversationId = new URL(page.url()).pathname.split("/").at(-1);
  const response = await page.request.get("/api/conversations/" + conversationId);
  const conversation = await response.json();
  expect(conversation.summary).toBeTruthy();
  expect(conversation.messages.length).toBe(8);

  await page.goto("/admin/chunking");
  await page.getByLabel("رمز عبور").fill("test-admin-password");
  await page.getByRole("button", { name: "ورود به پنل" }).click();
  await expect(page.getByRole("heading", { name: "راهبرد RAG" })).toBeVisible();
  await expect(page.getByRole("main")).not.toContainText("هدف گفتگو بررسی محصول است");
});

test("keeps the active source topic after summarizing earlier turns", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel("رمز عبور").fill("test-admin-password");
  await page.getByRole("button", { name: "ورود به پنل" }).click();
  const created = await page.request.post("/api/admin/sources", { multipart: { file: {
    name: "memory-topic.txt", mimeType: "text/plain",
    buffer: Buffer.from("بودجه پروژه آذر برابر دویست تومان است. گزارش پروژه آذر درباره بودجه و برنامه اجرایی است."),
  } } });
  expect(created.status()).toBe(201);
  const sourceId = (await created.json()).id as string;
  try {
    await page.goto("/");
    await page.getByRole("button", { name: /شروع گفتگوی جدید/ }).click();
    for (const question of [
      "بودجه پروژه آذر چقدر است؟",
      "الف".repeat(1000) + " بودجه پروژه آذر چقدر است؟",
      "درباره‌اش بیشتر بگو",
    ]) {
      const count = await page.locator(".message.assistant").count();
      await page.getByLabel("متن پیام").fill(question);
      await page.getByLabel("متن پیام").press("Enter");
      await expect(page.locator(".message.assistant").nth(count)).toContainText("پروژه آذر", { timeout: 15_000 });
      await expect(page.getByLabel("توقف تولید پاسخ")).toBeHidden();
    }
    const conversationId = new URL(page.url()).pathname.split("/").at(-1);
    const conversation = await (await page.request.get("/api/conversations/" + conversationId)).json();
    expect(conversation.summary).toContain("پروژه آذر");
  } finally {
    await page.request.delete("/api/admin/sources/" + sourceId);
  }
});




