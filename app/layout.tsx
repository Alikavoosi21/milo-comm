import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import { ThemeProvider } from "@/components/ui/theme-provider";
import "./globals.css";


const vazirmatn = Vazirmatn({ subsets: ["arabic", "latin"], variable: "--font-vazir" });

export const metadata: Metadata = {
  title: "MILO COMM",
  description: "دستیار هوش مصنوعی فارسی",
};

const themeScript = `try{const s=localStorage.getItem("milo-theme");const t=s==="light"||s==="dark"?s:"dark";document.documentElement.dataset.theme=t;document.documentElement.classList.toggle("dark",t==="dark")}catch{}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fa" dir="rtl" suppressHydrationWarning className="font-sans">
    <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
    <body className={vazirmatn.variable}><ThemeProvider>{children}</ThemeProvider></body>
  </html>;
}
