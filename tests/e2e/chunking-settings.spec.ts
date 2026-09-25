import { expect, test } from "@playwright/test";

test("admin selects all retrieval strategies and rebuilds source when chunk size changes", async ({ page }) => {
  await page.goto("/admin/chunking");
  await page.getByLabel("رمز عبور").fill("test-admin-password");
  await page.getByRole("button", { name: "ورود به پنل" }).click();
  await expect(page.getByRole("heading", { name: "شیوهٔ بازیابی" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "اندازهٔ قطعه‌ها" })).toBeVisible();
  await expect(page.getByText("حد پذیرش شاهد داخلی")).toHaveCount(0);

  const original = (await (await page.request.get("/api/admin/rag-settings")).json()).settings;
  const create = await page.request.post("/api/admin/sources", { multipart: { file: {
    name: "retrieval-proof.txt", mimeType: "text/plain", buffer: Buffer.from("مقدار بودجه برابر دویست تومان است.\n\nموضوع دوم درباره گزارش فروش است."),
  } } });
  expect(create.status()).toBe(201);
  const id = (await create.json()).id as string;
  try {
    for (const strategy of ["broad", "rerank", "two_step"]) {
      await page.locator(`input[name="retrievalStrategy"][value="${strategy}"]`).check();
      await page.getByRole("button", { name: "ذخیرهٔ تنظیمات" }).click();
      await expect(page.getByRole("status")).toContainText("ذخیره شد");
      const saved = (await (await page.request.get("/api/admin/rag-settings")).json()).settings;
      expect(saved.retrievalStrategy).toBe(strategy);
      await page.goto("/");
      await page.getByRole("button", { name: /شروع گفتگوی جدید/ }).click();
      await page.getByLabel("متن پیام").fill("مقدار بودجه چقدر است؟");
      await page.getByLabel("متن پیام").press("Enter");
      await expect(page.locator(".message.assistant").last()).toContainText("دویست تومان");
      await page.goto("/admin/chunking");
    }
    await page.getByLabel("اندازهٔ هر قطعه").fill("800");
    await page.getByLabel("هم‌پوشانی قطعه‌ها").fill("20");
    await page.getByRole("button", { name: "ذخیرهٔ تنظیمات" }).click();
    await expect(page.getByRole("status")).toContainText("دوباره چانک‌بندی شد");
    const saved = (await (await page.request.get("/api/admin/rag-settings")).json()).settings;
    expect(saved.chunkSize).toBe(800);
    expect(saved.overlap).toBe(20);
    const source = (await (await page.request.get("/api/admin/sources")).json()).sources.find((item: { id: string }) => item.id === id);
    expect(source.activeVersion).toBeGreaterThan(1);
    await page.getByLabel("اندازهٔ هر قطعه").fill("100");
    await page.getByRole("button", { name: "ذخیرهٔ تنظیمات" }).click();
    await expect(page.locator(".admin-alert")).toContainText("اندازهٔ هر قطعه باید بین ۲۰۰ تا ۴۰۰۰ نویسه باشد");
    const invalid = await page.request.put("/api/admin/rag-settings", { data: { strategy: "unknown" } });
    expect(invalid.status()).toBe(422);
    expect((await invalid.json()).error).toMatch(/[آ-ی]/u);
  } finally {
    await page.request.put("/api/admin/rag-settings", { data: original });
    await page.request.delete("/api/admin/sources/" + id);
  }
});

