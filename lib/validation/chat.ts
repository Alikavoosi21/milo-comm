import { z } from "zod";

export const messageInputSchema = z.object({
  content: z.string().trim().min(1, "پیام نمی‌تواند خالی باشد").max(20_000),
  attachmentIds: z.array(z.string().uuid()).max(3).default([]),
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
  expectedRevision: z.number().int().positive("نسخه گفتگو معتبر نیست"),
}).strict().refine((value) => value.title !== undefined || value.instructions !== undefined, {
  message: "حداقل نام یا راهنمای گفتگو باید ارسال شود",
});
