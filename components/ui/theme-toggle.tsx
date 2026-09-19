"use client";

import { useTheme } from "./theme-provider";

export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const { theme, toggle } = useTheme();
  const label = theme === "light" ? "فعال‌کردن حالت تاریک" : "فعال‌کردن حالت روشن";
  return <button className={showLabel ? "theme-setting-button" : "icon-button"} type="button" onClick={() => void toggle()} aria-label={label}>
    <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
    {showLabel && <span>{label}</span>}
  </button>;
}
