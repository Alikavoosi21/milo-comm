import { env } from "@/lib/validation/env";
import type { ChatMessage } from "@/lib/types";
import type { ActiveMemory } from "./summary-service";

function normalize(value: string) {
  return value.normalize("NFKC").toLowerCase()
    .replace(/[يى]/g, "ی").replace(/ك/g, "ک")
    .replace(/[\u200c\u200d]/g, "")
    .replace(/[؟?!.،؛:]/g, " ").replace(/\s+/g, " ").trim();
}

export function recentTurns(memory: ActiveMemory, currentQuestion: string): ChatMessage[] {
  const recent = memory.recent.filter((item) => item.status === "completed").slice(-env.MEMORY_RECENT_MESSAGES - 1);
  if (recent.at(-1)?.role === "user" && normalize(recent.at(-1)!.content) === normalize(currentQuestion)) recent.pop();
  return recent.slice(-env.MEMORY_RECENT_MESSAGES);
}

function shortQuote(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 240);
}

type MemoryIntent = "topic" | "previous_question" | "previous_answer" | "name";
function memoryIntent(question: string): MemoryIntent | null {
  const normalized = normalize(question);
  if (/(?:اسم|نام) (?:من|خودم) (?:چی|چه)|(?:اسم|نام)م (?:چی|چه)/u.test(normalized)) return "name";
  if (/(?:آخرین|قبلی).*(?:پاسخ|جواب).*(?:تو|شما|چی|چه)|(?:چی|چه) (?:گفتی|گفتید)/u.test(normalized)) return "previous_answer";
  if (/(?:آخرین|قبلی).*(?:سوال|پرسش).*(?:من|چی|چه)|(?:قبلا|پیشتر) چی (?:پرسیدم|گفتم)/u.test(normalized)) return "previous_question";
  if (/(?:درباره|راجع|در مورد) (?:چی|چه چیزی).*(?:حرف|صحبت)|(?:موضوع|بحث).*(?:چیه|چیست|بوده)|(?:چی|چه چیزهایی) (?:از )?(?:گفتگو|گفت وگو|صحبت|حرف).*(?:یادت|گفتیم)|(?:تا الان|قبلا|پیشتر).*(?:چی گفتیم|درباره چی)|(?:یادته|یادت هست).*(?:چی|چه).*(?:حرف|صحبت|موضوع)/u.test(normalized)) return "topic";
  return null;
}

export function isMemoryRecallQuestion(question: string) {
  return memoryIntent(question) !== null;
}

/** Recall what was said in this conversation, without treating it as RAG evidence. */
export function shortMemoryReply(question: string, memory: ActiveMemory): string | null {
  const intent = memoryIntent(question);
  if (!intent) return null;

  const turns = recentTurns(memory, question);
  const users = turns.filter((item) => item.role === "user" && !isMemoryRecallQuestion(item.content));
  const assistants = turns.filter((item) => item.role === "assistant");
  if (intent === "name") {
    const name = [...users].reverse()
      .map((item) => item.content.match(/(?:اسم|نام) من\s+([\p{L}]{2,30})(?:\s+(?:است|هست)|[.!؟?\s]|$)|من\s+([\p{L}]{2,30})\s+هستم/u))
      .find((item) => item);
    return name ? `در همین گفتگو گفتید نامتان «${name[1] ?? name[2]}» است.`
      : "در پیام‌های اخیر این گفتگو نامی از شما پیدا نکردم.";
  }
  if (intent === "previous_answer") {
    const previous = assistants.at(-1)?.content;
    return previous ? `در پاسخ قبلی گفتم: «${shortQuote(previous)}»` : "هنوز در این گفتگو پاسخی پیش از این پرسش نداده‌ام.";
  }
  if (intent === "previous_question") {
    const previous = users.at(-1)?.content;
    return previous ? `آخرین پرسش شما در این گفتگو این بود: «${shortQuote(previous)}»` : "پیش از این پرسش، سؤالی در این گفتگو ندارم.";
  }
  const recentTopics = users.map((item) => shortQuote(item.content)).filter(Boolean).slice(-3);
  if (recentTopics.length) {
    return `در این گفتگو، آخرین موضوعی که مطرح کردید «${recentTopics.at(-1)}» بود.`
      + (recentTopics.length > 1 ? ` پیش از آن هم دربارهٔ ${recentTopics.slice(0, -1).map((item) => `«${item}»`).join(" و ")} صحبت کردیم.` : "");
  }
  return memory.summary.trim()
    ? `از بخش قدیمی‌تر این گفتگو این خلاصه را دارم: ${memory.summary.trim().slice(0, 400)}`
    : "هنوز در این گفتگو موضوعی پیش از این پرسش مطرح نشده است.";
}
