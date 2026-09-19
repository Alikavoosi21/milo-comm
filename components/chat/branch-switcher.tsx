"use client";

import type { ChatBranch } from "@/lib/types";

export function BranchSwitcher({ branches, activeId, onSelect }: { branches: ChatBranch[]; activeId?: string; onSelect(id: string): void }) {
  if (branches.length <= 1) return null;
  return <label className="branch-indicator">⑂ <span>مسیر گفتگو</span><select aria-label="انتخاب مسیر گفتگو" value={activeId} onChange={(event) => onSelect(event.target.value)}>{branches.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>;
}
