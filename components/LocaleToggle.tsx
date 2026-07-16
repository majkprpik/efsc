"use client";

import { useTransition } from "react";
import { setLocale } from "@/lib/i18n/actions";
import { useLocale } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** HR | EN switch. The copy is rendered server-side, so this round-trips. */
export function LocaleToggle() {
  const locale = useLocale();
  const [pending, start] = useTransition();

  return (
    <div
      className={cn(
        "flex h-8 items-center rounded-md border p-0.5 text-[11px] font-medium",
        pending && "opacity-60",
      )}
    >
      {(["hr", "en"] as const).map((l) => (
        <button
          key={l}
          disabled={pending}
          onClick={() => start(() => setLocale(l))}
          title={l === "hr" ? "Hrvatski" : "English"}
          className={cn(
            "flex h-full items-center rounded px-1.5 uppercase transition",
            l === locale
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
