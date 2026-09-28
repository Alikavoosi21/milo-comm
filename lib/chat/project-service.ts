import { randomUUID } from "node:crypto";
import { persistStore, store } from "@/lib/db/repositories";
import type { ChatProject } from "@/lib/types";

export function listProjects(ownerId: string): ChatProject[] {
  return [...store.projects.values()]
    .filter((project) => project.ownerId === ownerId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function createProject(ownerId: string, input: Pick<ChatProject, "title" | "icon" | "color"> & { parentProjectId?: string | null }): ChatProject {
  const now = new Date().toISOString();
  const parentProjectId = input.parentProjectId;
  if (parentProjectId && store.projects.get(parentProjectId)?.ownerId !== ownerId) throw new Error("پروژهٔ مقصد پیدا نشد.");
  const project = { ...input, parentProjectId: parentProjectId ?? null, id: randomUUID(), ownerId, createdAt: now, updatedAt: now };
  store.projects.set(project.id, project);
  persistStore();
  return project;
}

export function patchProject(ownerId: string, id: string, input: Partial<Pick<ChatProject, "title" | "icon" | "color" | "parentProjectId">>) {
  const project = store.projects.get(id);
  if (!project || project.ownerId !== ownerId) return undefined;
  if (input.parentProjectId) {
    let next: string | null | undefined = input.parentProjectId;
    while (next) {
      if (next === id) throw new Error("نمی‌توان پروژه را به خودش یا زیرمجموعه‌اش منتقل کرد.");
      const parent: ChatProject | undefined = store.projects.get(next);
      if (!parent || parent.ownerId !== ownerId) throw new Error("پروژهٔ مقصد پیدا نشد.");
      next = parent.parentProjectId;
    }
  }
  Object.assign(project, input, { updatedAt: new Date().toISOString() });
  persistStore();
  return project;
}

export function deleteProject(ownerId: string, id: string) {
  const project = store.projects.get(id);
  if (!project || project.ownerId !== ownerId) return false;
  for (const conversation of store.conversations.values()) {
    if (conversation.ownerId === ownerId && conversation.projectId === id) {
      conversation.projectId = null;
      conversation.revision += 1;
      conversation.updatedAt = new Date().toISOString();
    }
  }
  for (const child of store.projects.values()) {
    if (child.ownerId === ownerId && child.parentProjectId === id) {
      child.parentProjectId = null;
      child.updatedAt = new Date().toISOString();
    }
  }
  store.projects.delete(id);
  persistStore();
  return true;
}
