"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
interface ThemeContextValue {
  theme: Theme;
  status: string;
  toggle(): Promise<void>;
}
const ThemeContext = createContext<ThemeContextValue>({ theme: "light", status: "", async toggle() {} });

function preferredTheme(): Theme {
  const saved = localStorage.getItem("milo-theme");
  if (saved === "light" || saved === "dark") return saved;
  return "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("milo-theme");
    const initial = preferredTheme();
    document.documentElement.dataset.theme = initial; document.documentElement.classList.toggle("dark", initial === "dark");
    queueMicrotask(() => setTheme(initial));
    if (saved) return;
    fetch("/api/preferences")
      .then((response) => response.json())
      .then((value) => {
        if (value.theme === "light" || value.theme === "dark") {
          setTheme(value.theme);
          document.documentElement.dataset.theme = value.theme; document.documentElement.classList.toggle("dark", value.theme === "dark");
        }
      })
      .catch(() => {});
  }, []);

  async function toggle() {
    const previous = theme;
    const next = previous === "light" ? "dark" : "light";
    setTheme(next);
    setStatus("در حال ذخیره تنظیمات…");
    localStorage.setItem("milo-theme", next);
    document.documentElement.dataset.theme = next; document.documentElement.classList.toggle("dark", next === "dark");
    try {
      const response = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: next }),
      });
      if (!response.ok) throw new Error();
      setStatus("تنظیمات ذخیره شد");
    } catch {
      setTheme(previous);
      localStorage.setItem("milo-theme", previous);
      document.documentElement.dataset.theme = previous; document.documentElement.classList.toggle("dark", previous === "dark");
      setStatus("ذخیره تنظیمات انجام نشد؛ دوباره تلاش کنید.");
    }
  }

  return <ThemeContext.Provider value={{ theme, status, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
