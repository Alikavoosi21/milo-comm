import { BookOpen, BriefcaseBusiness, ChartNoAxesColumn, Code2, FlaskConical, FolderClosed, GraduationCap, Globe2, HeartHandshake, MessageSquare, Palette, Scale } from "lucide-react";

export const iconChoices = [
  { id: "folder", label: "عمومی", Icon: FolderClosed },
  { id: "book", label: "مطالعه", Icon: BookOpen },
  { id: "briefcase", label: "کسب‌وکار", Icon: BriefcaseBusiness },
  { id: "code", label: "فناوری", Icon: Code2 },
  { id: "palette", label: "طراحی", Icon: Palette },
  { id: "heart", label: "سلامت", Icon: HeartHandshake },
  { id: "graduation", label: "آموزش", Icon: GraduationCap },
  { id: "flask", label: "پژوهش", Icon: FlaskConical },
  { id: "scale", label: "حقوق", Icon: Scale },
  { id: "chart", label: "مالی", Icon: ChartNoAxesColumn },
  { id: "globe", label: "سفر", Icon: Globe2 },
  { id: "message", label: "گفتگو", Icon: MessageSquare },
] as const;

export function WorkspaceIcon({ icon, color, size = 17 }: { icon?: string; color?: string; size?: number }) {
  const { Icon } = iconChoices.find((choice) => choice.id === icon) ?? iconChoices[11];
  return <span className="workspace-icon" style={{ color: color ?? "#fb956c", backgroundColor: `color-mix(in srgb, ${color ?? "#fb956c"} 16%, transparent)` }}><Icon size={size} strokeWidth={1.9} aria-hidden="true" /></span>;
}
