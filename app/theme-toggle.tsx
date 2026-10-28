"use client";

import { useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const EVENT = "themechange";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

function getTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function setTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.add("theme-transition");
  root.dataset.theme = theme;
  syncThemeColor();
  try {
    localStorage.setItem("theme", theme);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
  window.setTimeout(() => root.classList.remove("theme-transition"), 250);
}

/** Match the browser/status bar color to the page background. */
function syncThemeColor() {
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", bg));
}

export function ThemeToggle() {
  // The server can't know the theme, so it renders nothing and the client fills in after hydration.
  const theme = useSyncExternalStore<Theme | null>(subscribe, getTheme, () => null);
  const next: Theme = theme === "dark" ? "light" : "dark";

  // Metadata <meta name="theme-color"> tags may land after the inline theme script ran.
  useEffect(() => {
    if (theme) syncThemeColor();
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={theme ? `Switch to ${next} theme` : "Toggle theme"}
      title={theme ? `Switch to ${next} theme` : "Toggle theme"}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-fg transition active:scale-95"
    >
      {theme === "light" ? <MoonIcon /> : theme === "dark" ? <SunIcon /> : null}
    </button>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}
