import { PersianRagPrototype } from "./prototype";
import styles from "./prototype.module.css";

type PrototypePageProps = {
  searchParams: Promise<{ variant?: string; screen?: string }>;
};

export default async function PersianRagPrototypePage({ searchParams }: PrototypePageProps) {
  if (process.env.NODE_ENV === "production") return null;
  const params = await searchParams;
  const variant = params.variant === "b" ? "b" : "a";
  const screen = ["chat", "sources", "strategy", "usage"].includes(params.screen ?? "")
    ? params.screen as "chat" | "sources" | "strategy" | "usage"
    : "chat";

  return <PersianRagPrototype initialVariant={variant} initialScreen={screen} styles={styles} />;
}
