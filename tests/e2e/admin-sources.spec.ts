import { expect, test } from "@playwright/test";

test("admin uploads a source and user sees a cited answer", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel("رمز عبور").fill("test-admin-password");
  await page.getByRole("button", { name: "ورود به پنل" }).click();
  await expect(page.getByRole("heading", { name: "منابع پاسخ‌گویی" })).toBeVisible();
  const input = page.locator(".admin-upload-button input[type=file]");
  await input.setInputFiles({ name: "facts.txt", mimeType: "text/plain", buffer: Buffer.from("قیمت محصول برابر پنجاه تومان است.") });
  await expect(page.getByText("facts.txt")).toBeVisible();

  const source = await page.request.get("/api/admin/sources");
  const sourceId = (await source.json()).sources.find((item: { originalName: string }) => item.originalName === "facts.txt")?.id;
  try {
    await page.goto("/");
    await page.getByRole("button", { name: /شروع گفتگوی جدید/ }).click();
    await page.getByLabel("متن پیام").fill("قیمت محصول چقدر است؟");
    await page.getByLabel("متن پیام").press("Enter");
    await expect(page.locator(".message.assistant").last()).toContainText("پنجاه تومان");
    await expect(page.getByLabel("منابع پاسخ")).toContainText("facts.txt");
    await page.goto("/admin/chunking");
    await expect(page.getByRole("heading", { name: "راهبرد RAG" })).toBeVisible();
    await expect(page.getByRole("main")).not.toContainText("قیمت محصول برابر پنجاه تومان است.");
  } finally {
    if (sourceId) await page.request.delete("/api/admin/sources/" + sourceId);
  }
});

test("admin enforces three sources and keeps a source on invalid replacement", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel("رمز عبور").fill("test-admin-password");
  await page.getByLabel("رمز عبور").press("Tab");
  await expect(page.getByRole("button", { name: "ورود به پنل" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "منابع پاسخ‌گویی" })).toBeVisible();
  const ids: string[] = [];
  try {
    for (let index = 0; index < 3; index++) {
      const data = new FormData();
      data.set("file", new File(["مقدار " + index], "source" + index + ".txt", { type: "text/plain" }));
      const response = await page.request.post("/api/admin/sources", { multipart: { file: { name: "source" + index + ".txt", mimeType: "text/plain", buffer: Buffer.from("مقدار " + index) } } });
      expect(response.status()).toBe(201);
      ids.push((await response.json()).id as string);
    }
    await page.reload();
    await expect(page.getByText("۳ از ۳ منبع")).toBeVisible();
    await expect(page.locator(".admin-upload-button input[type=file]")).toBeDisabled();
    const fourth = await page.request.post("/api/admin/sources", { multipart: { file: { name: "fourth.txt", mimeType: "text/plain", buffer: Buffer.from("مقدار چهارم") } } });
    expect(fourth.status()).toBe(409);
    const replace = await page.request.put("/api/admin/sources/" + ids[0], { multipart: { file: { name: "empty.txt", mimeType: "text/plain", buffer: Buffer.alloc(0) } } });
    expect(replace.status()).toBe(422);
    const listing = await page.request.get("/api/admin/sources");
    expect((await listing.json()).sources.find((item: { id: string; activeVersion: number }) => item.id === ids[0])?.activeVersion).toBe(1);
    await page.request.delete("/api/admin/sources/" + ids[2]);
    ids.pop();
    await page.reload();
    await expect(page.locator(".admin-upload-button input[type=file]")).toBeEnabled();
  } finally {
    for (const id of ids) await page.request.delete("/api/admin/sources/" + id);
  }
});



