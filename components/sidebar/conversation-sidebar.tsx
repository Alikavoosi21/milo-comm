"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Conversation } from "@/lib/types";
import { groupConversations } from "@/lib/chat/conversation-list-service";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function ConversationSidebar() {
  const [items, setItems] = useState<Conversation[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const load = useCallback(() => {
    fetch("/api/conversations").then((response) => response.json()).then(setItems).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("milo:conversations-changed", load);
    return () => window.removeEventListener("milo:conversations-changed", load);
  }, [load, pathname]);

  const groups = useMemo(() => groupConversations(items), [items]);
  async function create() {
    const response = await fetch("/api/conversations", { method: "POST" });
    if (!response.ok) return;
    const value = await response.json();
    load();
    router.push(`/chat/${value.id}`);
    router.refresh();
  }

  return <aside className="sidebar">
    <div className="brand"><span className="brand-mark">م</span><div><strong>MILO COMM</strong><small>دستیار فارسی شما</small></div></div>
    <button className="new-chat" onClick={create}><span>＋</span> گفتگوی جدید</button>
    <nav className="conversation-nav" aria-label="گفتگوها">
      {Object.entries(groups).map(([label, conversations]) => conversations.length ? <section key={label}>
        <h2>{label}</h2>
        {conversations.map((item) => <Link className={pathname.includes(item.id) ? "conversation-link active" : "conversation-link"} href={`/chat/${item.id}`} key={item.id}><span className="bubble-icon">◌</span><span>{item.title}</span></Link>)}
      </section> : null)}
      {!items.length && <p className="sidebar-empty">هنوز گفتگویی ندارید.</p>}
    </nav>
    <div className="sidebar-footer">
      <ThemeToggle />
      <Link className="settings-link" href="/admin" aria-label="مدیریت منابع"><span aria-hidden="true">◫</span><span>مدیریت</span></Link>
      <Link className="settings-link" href="/settings" aria-label="تنظیمات"><span aria-hidden="true">⚙</span><span>تنظیمات</span></Link>
      <div className="user-summary"><strong>کاربر مایلو</strong><small>فضای شخصی</small></div>
    </div>
  </aside>;
}

