"use client";

import { useState } from "react";
import type { ChatProject, Conversation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { iconChoices, WorkspaceIcon } from "./workspace-icon";

export type WorkspaceEditorValue = { title: string; icon: string; color: string; projectId: string | null; parentProjectId: string | null };

export function WorkspaceEditor({ kind, target, projects, moveOnly = false, onClose, onSave }: {
  kind: "project" | "conversation";
  target?: ChatProject | Conversation;
  projects: ChatProject[];
  moveOnly?: boolean;
  onClose(): void;
  onSave(value: WorkspaceEditorValue): Promise<void>;
}) {
  const [title, setTitle] = useState(target?.title ?? "");
  const [icon, setIcon] = useState(target?.icon ?? (kind === "project" ? "folder" : "message"));
  const [color, setColor] = useState(target?.color ?? "#fb956c");
  const [projectId, setProjectId] = useState(kind === "conversation" ? (target as Conversation | undefined)?.projectId ?? null : null);
  const [parentProjectId, setParentProjectId] = useState(kind === "project" ? (target as ChatProject | undefined)?.parentProjectId ?? null : null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!moveOnly && !title.trim()) { setError("نام نمی‌تواند خالی باشد."); return; }
    setPending(true); setError("");
    try {
      await onSave({ title: title.trim(), icon, color, projectId, parentProjectId });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ذخیره انجام نشد.");
    } finally { setPending(false); }
  }

  const heading = moveOnly ? `انتقال ${kind === "project" ? "پروژه" : "گفتگو"}` : target ? `ویرایش ${kind === "project" ? "پروژه" : "گفتگو"}` : "پروژهٔ جدید";
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <DialogContent dir="rtl" className="workspace-editor-dialog" showCloseButton={false}>
      <DialogHeader><DialogTitle>{heading}</DialogTitle><DialogDescription>{moveOnly ? "مقصد گفتگو را انتخاب کنید." : "نام، آیکون و رنگ را برای پیدا کردن سریع‌تر انتخاب کنید."}</DialogDescription></DialogHeader>
      <form onSubmit={(event) => void submit(event)} className="workspace-editor-form">
        {!moveOnly && <><label htmlFor="workspace-name">نام {kind === "project" ? "پروژه" : "گفتگو"}</label><Input id="workspace-name" value={title} maxLength={80} autoFocus onChange={(event) => setTitle(event.target.value)} placeholder={kind === "project" ? "مثلاً پژوهش بازار" : "نام گفتگو"} />
          <span className="workspace-field-label">آیکون بر اساس موضوع</span><div className="workspace-icon-grid" role="group" aria-label="انتخاب آیکون">{iconChoices.map((choice) => <button type="button" key={choice.id} className={icon === choice.id ? "selected" : ""} aria-pressed={icon === choice.id} title={choice.label} onClick={() => setIcon(choice.id)}><WorkspaceIcon icon={choice.id} color={color} /><span>{choice.label}</span></button>)}</div>
          <label htmlFor="workspace-color">رنگ آیکون</label><div className="workspace-color-row"><input id="workspace-color" type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="انتخاب رنگ آیکون" /><span dir="ltr">{color}</span></div></>}
        {kind === "conversation" && <><label htmlFor="workspace-project">پروژه</label><select id="workspace-project" value={projectId ?? ""} onChange={(event) => setProjectId(event.target.value || null)}><option value="">بدون پروژه</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.title}</option>)}</select></>}
        {kind === "project" && <><label htmlFor="workspace-parent-project">پروژهٔ مادر</label><select id="workspace-parent-project" value={parentProjectId ?? ""} onChange={(event) => setParentProjectId(event.target.value || null)}><option value="">سطح اصلی</option>{projects.filter((project) => project.id !== target?.id).map((project) => <option value={project.id} key={project.id}>{project.title}</option>)}</select></>}
        {error && <p className="workspace-editor-error" role="alert">{error}</p>}
        <DialogFooter className="workspace-editor-footer"><Button type="button" variant="outline" onClick={onClose} disabled={pending}>انصراف</Button><Button type="submit" disabled={pending || (!moveOnly && !title.trim())}>{pending ? "در حال ذخیره…" : moveOnly ? "انتقال" : "ذخیره"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
