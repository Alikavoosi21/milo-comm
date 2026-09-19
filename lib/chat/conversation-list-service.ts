import type { Conversation } from "@/lib/types";

export function groupConversations(items: Conversation[], now = new Date()) {
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  const startYesterday = new Date(startToday); startYesterday.setDate(startYesterday.getDate() - 1);
  return items.reduce<Record<string, Conversation[]>>((groups, item) => {
    const date = new Date(item.lastActivityAt);
    const label = date >= startToday ? "امروز" : date >= startYesterday ? "دیروز" : "قدیمی‌تر";
    (groups[label] ??= []).push(item);
    return groups;
  }, { "امروز": [], "دیروز": [], "قدیمی‌تر": [] });
}
