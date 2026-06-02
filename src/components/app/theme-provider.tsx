"use client";

import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
};

const THEME_STORAGE_KEY = "steadycut-theme";
const THEME_TRANSITION_SUPPRESSION_STYLE_ID =
  "steadycut-theme-transition-suppression";

let themeTransitionSuppressionTimeout: number | null = null;

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [preference, setPreferenceState] =
    useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  const applyPreference = useCallback((nextPreference: ThemePreference) => {
    const nextResolvedTheme = resolveTheme(nextPreference);
    const root = document.documentElement;

    suppressThemeTransitions();
    root.classList.toggle("dark", nextResolvedTheme === "dark");
    root.dataset.theme = nextPreference;
    root.style.colorScheme = nextResolvedTheme;

    return nextResolvedTheme;
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedPreference = readStoredThemePreference();

      setPreferenceState(storedPreference);
      setResolvedTheme(applyPreference(storedPreference));
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [applyPreference]);

  useEffect(() => {
    if (preference !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      setResolvedTheme(applyPreference("system"));
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [applyPreference, preference]);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextPreference);
    setPreferenceState(nextPreference);
    setResolvedTheme(applyPreference(nextPreference));
  }, [applyPreference]);

  const toggleTheme = useCallback(() => {
    setPreference(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setPreference]);

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme,
      setPreference,
      toggleTheme,
    }),
    [preference, resolvedTheme, setPreference, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider.");
  }

  return context;
}

function readStoredThemePreference(): ThemePreference {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  return isThemePreference(storedTheme) ? storedTheme : "system";
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== "system") {
    return preference;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function suppressThemeTransitions() {
  if (!document.getElementById(THEME_TRANSITION_SUPPRESSION_STYLE_ID)) {
    const style = document.createElement("style");

    style.id = THEME_TRANSITION_SUPPRESSION_STYLE_ID;
    style.appendChild(
      document.createTextNode(
        "*, *::before, *::after { transition: none !important; }"
      )
    );
    document.head.appendChild(style);
  }

  document.body.getBoundingClientRect();

  if (themeTransitionSuppressionTimeout !== null) {
    window.clearTimeout(themeTransitionSuppressionTimeout);
  }

  themeTransitionSuppressionTimeout = window.setTimeout(() => {
    document.getElementById(THEME_TRANSITION_SUPPRESSION_STYLE_ID)?.remove();
    themeTransitionSuppressionTimeout = null;
  }, 120);
}
