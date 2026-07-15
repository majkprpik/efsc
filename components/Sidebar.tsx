"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: number;
  badgeColor?: "gold" | "red" | "blue";
};

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Pregled",
    items: [{ href: "/", label: "Dashboard", icon: "ti-layout-dashboard" }],
  },
  {
    title: "Poslovanje",
    items: [
      { href: "/klijenti", label: "Klijenti", icon: "ti-users" },
      { href: "/potencijalni", label: "Potencijalni", icon: "ti-user-plus", badgeColor: "blue" },
      { href: "/natjecaji", label: "Natječaji", icon: "ti-trophy", badgeColor: "red" },
      { href: "/projekti", label: "Projekti", icon: "ti-folder" },
    ],
  },
  {
    title: "Rad",
    items: [
      { href: "/taskovi", label: "Taskovi", icon: "ti-checklist" },
      { href: "/rokovi", label: "Rokovi", icon: "ti-clock" },
    ],
  },
  {
    title: "Analitika",
    items: [{ href: "/financije", label: "Financije", icon: "ti-coin" }],
  },
];

export function Sidebar({
  counts,
  profile,
}: {
  counts: Record<string, number>;
  profile: { name: string; email: string; initials: string };
}) {
  const pathname = usePathname();

  const badgeFor = (href: string): number | undefined => {
    if (href === "/klijenti") return counts.klijenti;
    if (href === "/potencijalni") return counts.potencijalni;
    if (href === "/natjecaji") return counts.natjecaji;
    if (href === "/projekti") return counts.projekti;
    return undefined;
  };

  return (
    <aside className="flex h-screen w-[230px] flex-shrink-0 flex-col border-r border-b bg-bg2">
      <div className="border-b border-b px-[18px] pb-[18px] pt-[22px]">
        <div className="font-serif text-[22px] text-gold">Orbit</div>
        <div className="mt-0.5 text-[10px] uppercase tracking-[1.5px] text-t3">
          projektni hub · esfc.hr
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="px-2.5 pb-1 pt-2.5 text-[10px] uppercase tracking-[1.5px] text-t3">
              {section.title}
            </div>
            {section.items.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const badge = badgeFor(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-[var(--rs)] px-2.5 py-2.5 text-[13px] transition ${
                    active
                      ? "bg-[var(--gb)] text-gold"
                      : "text-t2 hover:bg-bg3 hover:text-t"
                  }`}
                >
                  <i className={`ti ${item.icon} text-base`} />
                  {item.label}
                  {badge !== undefined && (
                    <span
                      className={`ml-auto rounded-full px-[7px] py-0.5 text-[10px] font-medium ${
                        item.badgeColor === "red"
                          ? "bg-[var(--rb)] text-red"
                          : item.badgeColor === "blue"
                            ? "bg-[var(--bb)] text-blue"
                            : "bg-[var(--gb)] text-gold"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-2.5 border-t border-b p-3.5">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gb)] text-xs font-medium text-gold">
          {profile.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium">{profile.name}</div>
          <div className="truncate text-[11px] text-t3">{profile.email}</div>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            title="Odjava"
            className="flex h-7 w-7 items-center justify-center rounded-[var(--rs)] border border-b2 text-t2 transition hover:bg-bg3 hover:text-t"
          >
            <i className="ti ti-logout text-sm" />
          </button>
        </form>
      </div>
    </aside>
  );
}
