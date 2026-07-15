"use client";

import { usePathname } from "next/navigation";
import { sectionOf } from "@/components/shared";

/**
 * Tints the whole page with the current section's hue. Reads the route rather
 * than taking a prop, so every page gets it without opting in — including ones
 * added later.
 */
export function SectionShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const section = sectionOf(pathname);

  return (
    <div
      data-section={section?.key}
      className="section-page flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      {children}
    </div>
  );
}
