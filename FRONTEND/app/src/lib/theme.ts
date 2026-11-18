import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "system" | "light" | "dark";
const KEY = "cw-theme";

function readMode(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* storage can be unavailable (private mode) */
  }
  return "system";
}

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function applyTheme(mode: ThemeMode): void {
  const dark = mode === "dark" || (mode === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
}

/** Call once before first render to avoid a flash of the wrong theme. */
export function initTheme(): void {
  applyTheme(readMode());
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(readMode);

  const setMode = useCallback((next: ThemeMode) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
    setModeState(next);
  }, []);

  useEffect(() => {
    applyTheme(mode);
    if (mode !== "system" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const isDark = mode === "dark" || (mode === "system" && systemPrefersDark());
  const toggle = useCallback(() => setMode(isDark ? "light" : "dark"), [isDark, setMode]);

  return { mode, isDark, setMode, toggle };
}
