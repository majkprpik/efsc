"use client";

import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LocaleToggle } from "@/components/LocaleToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useT } from "@/lib/i18n/client";
import { useProfile } from "@/components/ProfileContext";
import { TourLauncher } from "@/components/TourLauncher";

/**
 * Account and app controls, in the header. They used to sit stacked in the
 * sidebar footer, which pushed the nav up and left the top bar mostly empty.
 */
export function TopBarActions() {
  const t = useT();
  const profile = useProfile();
  if (!profile) return null;

  return (
    <div className="flex items-center gap-2">
      <TourLauncher />
      <LocaleToggle />
      <ThemeToggle />

      <div className="mx-0.5 h-5 w-px bg-border" />

      <div className="flex items-center gap-2">
        <div className="hidden text-right leading-tight sm:block">
          <div className="truncate text-xs font-medium">{profile.name}</div>
          <div className="truncate text-[10px] text-muted-foreground">{profile.email}</div>
        </div>
        <Avatar className="size-7">
          <AvatarFallback className="text-[10px]">{profile.initials}</AvatarFallback>
        </Avatar>
      </div>

      <form action="/auth/signout" method="post">
        <button
          type="submit"
          title={t.nav.odjava}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}
