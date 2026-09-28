import { z } from "zod";

export const messageInputSchema = z.object({
  content: z.string().trim().min(1, "پیام نمی‌تواند خالی باشد").max(20_000),
  attachmentIds: z.array(z.string().uuid()).max(0, "پیوست فایل در چت غیرفعال است.").default([]),
  referenceConversationIds: z.array(z.string().uuid()).max(5).default([]),
  idempotencyKey: z.string().min(8).max(100),
});

export const forkInputSchema = z.object({
  content: z.string().trim().min(1).max(20_000),
  idempotencyKey: z.string().min(8).max(100).optional(),
});

export const conversationPatchSchema = z.object({
  title: z.string().trim().min(1, "نام گفتگو نمی‌تواند خالی باشد").max(80, "نام گفتگو حداکثر می‌تواند ۸۰ نویسه باشد").optional(),
  instructions: z.string().max(4000, "راهنمای گفتگو حداکثر می‌تواند ۴۰۰۰ نویسه باشد").optional(),
  projectId: z.string().uuid().nullable().optional(),
  icon: z.enum(["message", "book", "briefcase", "code", "palette", "heart", "graduation", "flask", "scale", "chart", "globe", "folder"]).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "رنگ معتبر نیست").optional(),
  expectedRevision: z.number().int().positive("نسخه گفتگو معتبر نیست"),
}).strict().refine((value) => value.title !== undefined || value.instructions !== undefined || value.projectId !== undefined || value.icon !== undefined || value.color !== undefined, {
  message: "حداقل یک تغییر باید ارسال شود",
});

export const projectInputSchema = z.object({
  title: z.string().trim().min(1, "نام پروژه نمی‌تواند خالی باشد").max(80),
  icon: z.enum(["message", "book", "briefcase", "code", "palette", "heart", "graduation", "flask", "scale", "chart", "globe", "folder"]).default("folder"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "رنگ معتبر نیست").default("#fb956c"),
  parentProjectId: z.string().uuid().nullable().optional(),
}).strict();

export const projectPatchSchema = projectInputSchema.partial().refine((value) => Object.keys(value).length > 0, "حداقل یک تغییر باید ارسال شود");
