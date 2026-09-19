import { ConversationSidebar } from "@/components/sidebar/conversation-sidebar";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <div className="app-shell"><ConversationSidebar />{children}</div>;
}
