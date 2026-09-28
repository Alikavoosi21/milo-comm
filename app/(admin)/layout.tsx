import { ConversationSidebar } from "@/components/sidebar/conversation-sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="app-shell"><ConversationSidebar mode="admin" />{children}</div>;
}