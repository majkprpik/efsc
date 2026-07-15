"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Trophy,
  Folder,
  ListChecks,
  Clock,
  Coins,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: string;
};

const SECTIONS: { title: string; items: Item[] }[] = [
  { title: "Pregled", items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "Poslovanje",
    items: [
      { href: "/klijenti", label: "Klijenti", icon: Users, badgeKey: "klijenti" },
      { href: "/potencijalni", label: "Potencijalni", icon: UserPlus, badgeKey: "potencijalni" },
      { href: "/natjecaji", label: "Natječaji", icon: Trophy, badgeKey: "natjecaji" },
      { href: "/projekti", label: "Projekti", icon: Folder, badgeKey: "projekti" },
    ],
  },
  {
    title: "Rad",
    items: [
      { href: "/taskovi", label: "Taskovi", icon: ListChecks },
      { href: "/rokovi", label: "Rokovi", icon: Clock },
    ],
  },
  { title: "Analitika", items: [{ href: "/financije", label: "Financije", icon: Coins }] },
];

export function AppSidebar({
  counts,
  profile,
}: {
  counts: Record<string, number>;
  profile: { name: string; email: string; initials: string };
}) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-4">
        <div className="text-xl font-semibold leading-none tracking-tight">Orbit</div>
        <div className="text-[10px] uppercase tracking-[1.5px] text-muted-foreground">
          projektni hub · esfc.hr
        </div>
      </SidebarHeader>

      <SidebarContent>
        {SECTIONS.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const active =
                    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  const badge = item.badgeKey ? counts[item.badgeKey] : undefined;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={active}
                        render={
                          <Link href={item.href}>
                            <Icon className="size-4" />
                            <span>{item.label}</span>
                          </Link>
                        }
                      />
                      {badge !== undefined && badge > 0 && (
                        <SidebarMenuBadge>{badge}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className="flex items-center gap-2.5 px-1 py-1">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">{profile.initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{profile.name}</div>
            <div className="truncate text-xs text-muted-foreground">{profile.email}</div>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              title="Odjava"
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
