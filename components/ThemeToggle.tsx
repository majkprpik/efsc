"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  function toggle() {
    const next = isDark ? "light" : "dark";

    // Diagonal reveal from bottom-right → top-left using View Transitions.
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> };
    };

    if (!doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTheme(next);
      return;
    }

    const transition = doc.startViewTransition(() => setTheme(next));
    transition.ready.then(() => {
      // radius from bottom-right corner to the farthest point (top-left)
      const w = window.innerWidth;
      const h = window.innerHeight;
      const endRadius = Math.hypot(w, h);
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${w}px ${h}px)`,
            `circle(${endRadius}px at ${w}px ${h}px)`,
          ],
        },
        {
          duration: 550,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  }

  if (!mounted) {
    return <div className="size-8" aria-hidden />;
  }

  return (
    <button
      onClick={toggle}
      title={isDark ? "Svijetla tema" : "Tamna tema"}
      className="flex size-8 items-center justify-center rounded-md border text-muted-foreground transition hover:bg-accent hover:text-foreground"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
