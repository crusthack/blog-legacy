"use client";

import { useEffect } from "react";

export default function PrintColorScheme() {
  useEffect(() => {
    const root = document.documentElement;
    const query = window.matchMedia("(prefers-color-scheme: dark)");

    const syncScreenColorScheme = () => {
      const isDark =
        root.classList.contains("dark") ||
        root.dataset.theme === "dark" ||
        root.dataset.colorMode === "dark" ||
        query.matches;

      root.dataset.printColorScheme = isDark ? "dark" : "light";
    };

    query.addEventListener("change", syncScreenColorScheme);
    syncScreenColorScheme();

    return () => {
      query.removeEventListener("change", syncScreenColorScheme);
      delete root.dataset.printColorScheme;
    };
  }, []);

  return null;
}
