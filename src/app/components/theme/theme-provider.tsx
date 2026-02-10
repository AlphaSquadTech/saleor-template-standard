"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";

type Theme =
  | "asphalt"
  | "racing-red"
  | "chrome"
  | "sunset"
  | "forest-green"
  | "ocean-blue";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

const VALID_THEMES: Theme[] = [
  "asphalt",
  "racing-red",
  "chrome",
  "sunset",
  "forest-green",
  "ocean-blue",
];

function getThemeFromEnv(): Theme {
  const envTheme = process.env.NEXT_PUBLIC_THEME_PALETTE as Theme;
  return VALID_THEMES.includes(envTheme) ? envTheme : "asphalt";
}

export function ThemeProvider({
  children,
  defaultTheme,
  storageKey = "ui-theme",
}: ThemeProviderProps) {
  const fallbackTheme = defaultTheme || getThemeFromEnv();
  const [theme, setThemeState] = useState<Theme>(fallbackTheme);

  useEffect(() => {
    const root = document.documentElement;
    const storedTheme = localStorage.getItem(storageKey) as Theme | null;

    const resolvedTheme = VALID_THEMES.includes(storedTheme as Theme)
      ? (storedTheme as Theme)
      : fallbackTheme;

    root.setAttribute("data-theme", resolvedTheme);
    setThemeState(resolvedTheme);
  }, [storageKey, fallbackTheme]);

  const setTheme = (newTheme: Theme) => {
    if (!VALID_THEMES.includes(newTheme)) return;

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);
  };

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
