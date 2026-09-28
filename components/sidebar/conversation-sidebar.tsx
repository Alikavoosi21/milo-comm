"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChartNoAxesColumn, ChevronDown, ChevronLeft, Database, FolderPlus, Menu, MessageSquarePlus, MoreHorizontal, Pencil, Plus, Search, Settings2, Shield, SlidersHorizontal, Trash2, FolderInput } from "lucide-react";
import type { ChatProject, Conversation } from "@/lib/types";
import { groupConversations } from "@/lib/chat/conversation-list-service";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { WorkspaceEditor, type WorkspaceEditorValue } from "./workspace-editor";
import { WorkspaceIcon } from "./workspace-icon";

const destinations = [
  { href: "/", label: "گفتگو", icon: MessageSquarePlus },
  { href: "/admin", label: "منابع دانش · مدیر", icon: Database },
  { href: "/admin/chunking", label: "راهبرد RAG · مدیر", icon: SlidersHorizontal },
  { href: "/admin/usage", label: "گزارش مصرف · مدیر", icon: ChartNoAxesColumn },
];

type Editor = { kind: "project" | "conversation"; id?: string; moveOnly?: boolean };
type DeleteTarget = { kind: "project" | "conversation"; id: string; title: string };

export function ConversationSidebar({ mode = "chat" }: { mode?: "chat" | "admin" }) {
  const [items, setItems] = useState<Conversation[]>([]);
  const [projects, setProjects] = useState<ChatProject[]>([]);
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [editor, setEditor] = useState<Editor>();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>();
  const [pendingDelete, setPendingDelete] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  const load = useCallback(async () => {
    if (mode === "admin") return;
    try {
      const [chatResponse, projectResponse] = await Promise.all([fetch("/api/conversations"), fetch("/api/projects")]);
      if (!chatResponse.ok || !projectResponse.ok) throw new Error("دریافت گفتگوها ممکن نشد.");
      const [chats, folders] = await Promise.all([chatResponse.json(), projectResponse.json()]);
      setItems(Array.isArray(chats) ? chats : []);
      setProjects(Array.isArray(folders) ? folders : []);
      setError("");
    } catch { setError("دریافت گفتگوها ممکن نشد. صفحه را تازه‌سازی کنید."); }
  }, [mode]);

  useEffect(() => {
    void load();
    window.addEventListener("milo:conversations-changed", load);
    return () => window.removeEventListener("milo:conversations-changed", load);
  }, [load, pathname]);

  const normalizedQuery = query.trim().toLocaleLowerCase("fa");
  const unassigned = useMemo(() => items.filter((item) => !item.projectId && item.title.toLocaleLowerCase("fa").includes(normalizedQuery)), [items, normalizedQuery]);
  const groups = useMemo(() => groupConversations(unassigned), [unassigned]);
  const visibleProjects = useMemo(() => {
    if (!normalizedQuery) return projects;
    const visibleIds = new Set<string>();
    for (const project of projects) {
      if (!project.title.toLocaleLowerCase("fa").includes(normalizedQuery) && !items.some((item) => item.projectId === project.id && item.title.toLocaleLowerCase("fa").includes(normalizedQuery))) continue;
      let current: ChatProject | undefined = project;
      while (current && !visibleIds.has(current.id)) {
        visibleIds.add(current.id);
        current = projects.find((item) => item.id === current?.parentProjectId);
      }
    }
    return projects.filter((project) => visibleIds.has(project.id));
  }, [projects, items, normalizedQuery]);

  async function create(projectId: string | null = null) {
    if (creating) return;
    setCreating(true); setError("");
    try {
      const response = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) });
      if (!response.ok) throw new Error((await response.json()).error || "ساخت گفتگو انجام نشد.");
      const value: Conversation = await response.json();
      setMobileOpen(false);
      void load();
      router.push("/chat/" + value.id);
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ساخت گفتگو انجام نشد."); }
    finally { setCreating(false); }
  }

  async function save(value: WorkspaceEditorValue) {
    if (!editor) return;
    const target = editor.kind === "project" ? projects.find((item) => item.id === editor.id) : items.find((item) => item.id === editor.id);
    const url = editor.kind === "project" ? (editor.id ? "/api/projects/" + editor.id : "/api/projects") : "/api/conversations/" + editor.id;
    const method = editor.kind === "project" ? (editor.id ? "PATCH" : "POST") : "PATCH";
    const payload = editor.kind === "project"
      ? editor.moveOnly
        ? { parentProjectId: value.parentProjectId }
        : { title: value.title, icon: value.icon, color: value.color, parentProjectId: value.parentProjectId }
      : editor.moveOnly
        ? { projectId: value.projectId, expectedRevision: (target as Conversation).revision }
        : { title: value.title, icon: value.icon, color: value.color, projectId: value.projectId, expectedRevision: (target as Conversation).revision };
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error((await response.json()).error || "ذخیره انجام نشد.");
    await load();
    window.dispatchEvent(new Event("milo:conversations-changed"));
    router.refresh();
  }

  async function remove() {
    if (!deleteTarget || pendingDelete) return;
    setPendingDelete(true); setError("");
    try {
      const url = deleteTarget.kind === "project" ? "/api/projects/" + deleteTarget.id : "/api/conversations/" + deleteTarget.id;
      const response = await fetch(url, { method: "DELETE" });
      if (!response.ok) throw new Error((await response.json()).error || "حذف انجام نشد.");
      await load();
      window.dispatchEvent(new Event("milo:conversations-changed"));
      if (deleteTarget.kind === "conversation" && pathname === "/chat/" + deleteTarget.id) router.push("/");
      setDeleteTarget(undefined);
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "حذف انجام نشد."); }
    finally { setPendingDelete(false); }
  }

  function chatRow(item: Conversation) {
    const active = pathname === "/chat/" + item.id;
    return <div className={"conversation-row" + (active ? " active" : "")} key={item.id}>
      <Link href={"/chat/" + item.id} onClick={() => setMobileOpen(false)} className="conversation-link" aria-current={active ? "page" : undefined}><WorkspaceIcon icon={item.icon} color={item.color} size={15} /><span className="conversation-name">{item.title}</span></Link>
      <DropdownMenu><DropdownMenuTrigger className="row-more" aria-label={"عملیات گفتگوی " + item.title}><MoreHorizontal size={17} /></DropdownMenuTrigger><DropdownMenuContent align="end" className="workspace-action-menu">
        <DropdownMenuItem onClick={() => setEditor({ kind: "conversation", id: item.id })}><Pencil size={15} />تغییر نام و آیکون</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setEditor({ kind: "conversation", id: item.id, moveOnly: true })}><FolderInput size={15} />انتقال به پروژه</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget({ kind: "conversation", id: item.id, title: item.title })}><Trash2 size={15} />حذف گفتگو</DropdownMenuItem>
      </DropdownMenuContent></DropdownMenu>
    </div>;
  }

  function projectSection(project: ChatProject, depth = 0) {
    const conversations = items.filter((item) => item.projectId === project.id && (project.title.toLocaleLowerCase("fa").includes(normalizedQuery) || item.title.toLocaleLowerCase("fa").includes(normalizedQuery)));
    const children = visibleProjects.filter((item) => item.parentProjectId === project.id);
    const isCollapsed = collapsed.includes(project.id) && !normalizedQuery;
    return <section className={"project-section" + (depth ? " nested" : "")} key={project.id}>
      <div className="project-row"><button type="button" className="project-toggle" aria-expanded={!isCollapsed} onClick={() => setCollapsed((current) => isCollapsed ? current.filter((id) => id !== project.id) : [...current, project.id])}><WorkspaceIcon icon={project.icon} color={project.color} /><span className="project-name">{project.title}</span><span className="project-count">{(conversations.length + children.length).toLocaleString("fa-IR")}</span>{isCollapsed ? <ChevronLeft size={14} /> : <ChevronDown size={14} />}</button>
        <DropdownMenu><DropdownMenuTrigger className="row-more" aria-label={"عملیات پروژهٔ " + project.title}><MoreHorizontal size={17} /></DropdownMenuTrigger><DropdownMenuContent align="end" className="workspace-action-menu">
          <DropdownMenuItem onClick={() => void create(project.id)}><Plus size={15} />گفتگوی جدید در پروژه</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditor({ kind: "project", id: project.id })}><Pencil size={15} />تغییر نام و آیکون</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditor({ kind: "project", id: project.id, moveOnly: true })}><FolderInput size={15} />انتقال به پروژه</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget({ kind: "project", id: project.id, title: project.title })}><Trash2 size={15} />حذف پروژه</DropdownMenuItem>
        </DropdownMenuContent></DropdownMenu></div>
      {!isCollapsed && <div className="project-children">{children.map((child) => projectSection(child, depth + 1))}{conversations.map(chatRow)}{!children.length && !conversations.length && <p className="project-empty">گفتگویی در این پروژه نیست.</p>}</div>}
    </section>;
  }

  function panel() {
    return <div className="rail-inner">
      <Link href="/" className="brand" onClick={() => setMobileOpen(false)}><BrandMark className="brand-mark" /><span className="brand-name"><strong>MILO COMM</strong><small>دستیار فارسی شما</small></span></Link>
      {mode === "chat" ? <>
        <Button type="button" className="new-chat" onClick={() => void create()} disabled={creating}><MessageSquarePlus size={17} aria-hidden="true" />{creating ? "در حال ساخت…" : "گفتگوی جدید"}</Button>
        <label className="rail-search"><Search size={16} aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجوی گفتگو یا پروژه" aria-label="جست‌وجوی گفتگو یا پروژه" /></label>
        {error && <p className="rail-error" role="alert">{error}</p>}
        <nav className="conversation-nav" aria-label="پروژه‌ها و گفتگوها">
          <div className="rail-section-heading"><h2>پروژه‌ها</h2><button type="button" aria-label="ایجاد پروژه" title="پروژهٔ جدید" onClick={() => setEditor({ kind: "project" })}><FolderPlus size={17} /></button></div>
          {visibleProjects.filter((project) => !project.parentProjectId || !visibleProjects.some((item) => item.id === project.parentProjectId)).map((project) => projectSection(project))}
          {!visibleProjects.length && !normalizedQuery && <p className="project-empty root-empty">با «＋» پروژه‌ای بسازید و گفتگوها را در آن دسته‌بندی کنید.</p>}
          <div className="rail-section-heading loose-chats"><h2>گفتگوهای بدون پروژه</h2></div>
          {Object.entries(groups).map(([label, conversations]) => conversations.length ? <section className="conversation-date-group" key={label}><h3>{label}</h3>{conversations.map(chatRow)}</section> : null)}
          {!unassigned.length && <p className="project-empty root-empty">{normalizedQuery ? "نتیجه‌ای پیدا نشد." : "گفتگوی بدون پروژه ندارید."}</p>}
        </nav>
      </> : <div className="admin-rail-context"><span>مدیریت دانش</span><h2>منابع و راهبرد پاسخ</h2><p>دسترسی به این بخش‌ها با رمز مدیر انجام می‌شود.</p></div>}
      <div className="sidebar-footer">
        <div className="user-summary"><strong>کاربر مایلو</strong><small>فضای شخصی</small></div>
        <div className="rail-footer-actions"><Link href="/settings" className="rail-action" onClick={() => setMobileOpen(false)}><Settings2 size={16} aria-hidden="true" />تنظیمات</Link>
          <DropdownMenu><DropdownMenuTrigger className="rail-action" aria-label="بخش‌های برنامه"><Menu size={16} aria-hidden="true" />بخش‌های برنامه</DropdownMenuTrigger><DropdownMenuContent side="top" align="start" className="rail-destinations"><div className="rail-menu-heading">بخش‌های برنامه</div>{destinations.map(({ href, label, icon: Icon }) => <DropdownMenuItem key={href} onClick={() => { setMobileOpen(false); router.push(href); }}><Icon size={16} aria-hidden="true" />{label}{href.startsWith("/admin") && <Shield size={13} aria-label="نیازمند ورود مدیر" />}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
        </div>
        <div className="rail-theme"><ThemeToggle showLabel /></div>
      </div>
    </div>;
  }

  const target = editor?.kind === "project" ? projects.find((item) => item.id === editor.id) : items.find((item) => item.id === editor?.id);
  return <>
    <aside className="sidebar" aria-label={mode === "chat" ? "پروژه‌ها و گفتگوها" : "بخش‌های مدیریت"}>{panel()}</aside>
    <div className="mobile-rail-trigger"><Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetTrigger className="mobile-menu-button"><Menu size={18} aria-hidden="true" />{mode === "chat" ? "فهرست گفتگوها" : "فهرست"}</SheetTrigger><SheetContent side="right" className="mobile-rail-sheet" showCloseButton><SheetTitle className="sr-only">پروژه‌ها، گفتگوها و بخش‌های برنامه</SheetTitle>{panel()}</SheetContent></Sheet></div>
    {editor && <WorkspaceEditor key={editor.kind + ":" + (editor.id ?? "new") + ":" + (editor.moveOnly ? "move" : "edit")} kind={editor.kind} target={target} projects={projects} moveOnly={editor.moveOnly} onClose={() => setEditor(undefined)} onSave={save} />}
    <ConfirmDialog open={Boolean(deleteTarget)} title={deleteTarget?.kind === "project" ? "حذف پروژه" : "حذف گفتگو"} description={deleteTarget?.kind === "project" ? "پروژهٔ «" + deleteTarget.title + "» حذف می‌شود. گفتگوهایش به بخش بدون پروژه و پروژه‌های زیرمجموعه‌اش به سطح اصلی منتقل می‌شوند." : "گفتگوی «" + (deleteTarget?.title ?? "") + "» برای همیشه حذف می‌شود."} confirmLabel={deleteTarget?.kind === "project" ? "حذف پروژه" : "حذف گفتگو"} pending={pendingDelete} error={error} onCancel={() => { setDeleteTarget(undefined); setError(""); }} onConfirm={() => void remove()} />
  </>;
}

