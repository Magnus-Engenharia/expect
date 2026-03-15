"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

export const ThemeToggle = () => {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className="text-muted-foreground transition-none hover:text-foreground"
      aria-label="Toggle theme"
    >
      {mounted && (resolvedTheme === "dark" ? <Sun size={14} /> : <Moon size={14} />)}
    </button>
  );
};
