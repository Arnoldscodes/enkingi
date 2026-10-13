import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "enkingi-theme";
const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, updateTheme] = useState<Theme>("light");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const initial = stored === "dark" ? "dark" : "light";
      updateTheme(initial);
      document.documentElement.classList.toggle("dark", initial === "dark");
    } catch {
      document.documentElement.classList.remove("dark");
    }
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = event.newValue === "dark" ? "dark" : "light";
      updateTheme(next);
      document.documentElement.classList.toggle("dark", next === "dark");
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const setTheme = (next: Theme) => {
    updateTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Keep switching available when storage is blocked. */ }
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme requires ThemeProvider");
  return context;
}