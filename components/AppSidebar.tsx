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
  Share2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { RowPending } from "@/components/RowPending";
import { sectionOf } from "@/components/shared";
import { useT } from "@/lib/i18n/client";

type Item = {
  href: string;
  /** key into t.nav */
  label: keyof ReturnType<typeof useT>["nav"];
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: string;
};

const SECTIONS: { title: keyof ReturnType<typeof useT>["nav"]; items: Item[] }[] = [
  { title: "pregled", items: [{ href: "/", label: "dashboard", icon: LayoutDashboard }] },
  {
    title: "poslovanje",
    items: [
      { href: "/klijenti", label: "klijenti", icon: Users, badgeKey: "klijenti" },
      { href: "/potencijalni", label: "potencijalni", icon: UserPlus, badgeKey: "potencijalni" },
      { href: "/natjecaji", label: "natjecaji", icon: Trophy, badgeKey: "natjecaji" },
      { href: "/projekti", label: "projekti", icon: Folder, badgeKey: "projekti" },
    ],
  },
  {
    title: "rad",
    items: [
      { href: "/taskovi", label: "taskovi", icon: ListChecks },
      { href: "/rokovi", label: "rokovi", icon: Clock },
      { href: "/portal-admin", label: "portal", icon: Share2 },
    ],
  },
  { title: "analitika", items: [{ href: "/financije", label: "financije", icon: Coins }] },
];

export function AppSidebar({ counts }: { counts: Record<string, number> }) {
  const pathname = usePathname();
  const t = useT();

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
            <SidebarGroupLabel>{t.nav[section.title]}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const active =
                    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  const badge = item.badgeKey ? counts[item.badgeKey] : undefined;
                  return (
                    <SidebarMenuItem key={item.href} data-section={sectionOf(item.href)?.key}>
                      <SidebarMenuButton
                        isActive={active}
                        data-tour={`nav-${item.label}`}
                        render={
                          <Link href={item.href}>
                            <Icon className="size-4" />
                            <span>{t.nav[item.label]}</span>
                            <RowPending />
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

    </Sidebar>
  );
}
