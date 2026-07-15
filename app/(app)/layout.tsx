import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/AppSidebar";
import { DemoBridge } from "@/components/DemoBridge";
import { SectionShell } from "@/components/SectionShell";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ini } from "@/lib/ui";

/**
 * Sidebar counts are four aggregate queries that would otherwise block every
 * navigation. Streaming them lets the page render immediately; the badges fill
 * in a beat later.
 */
async function SidebarWithCounts({
  profile,
}: {
  profile: { name: string; email: string; initials: string };
}) {
  const supabase = await createClient();
  const [klijenti, potencijalni, natjecaji, projekti] = await Promise.all([
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "inactive"]),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("status", "potencijalni"),
    supabase.from("natjecaji").select("id", { count: "exact", head: true }),
    supabase.from("projects").select("id", { count: "exact", head: true }),
  ]);

  return (
    <AppSidebar
      counts={{
        klijenti: klijenti.count ?? 0,
        potencijalni: potencijalni.count ?? 0,
        natjecaji: natjecaji.count ?? 0,
        projekti: projekti.count ?? 0,
      }}
      profile={profile}
    />
  );
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // getClaims() verifies the JWT locally — no round-trip to the Auth server.
  // The proxy already rejects anonymous requests; this guards the layout itself.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email")
    .eq("id", claims.sub)
    .single();

  const email = profile?.email || claims.email || "";
  const name = profile?.name || email.split("@")[0] || "Korisnik";
  const profileProps = { name, email, initials: ini(name) };

  return (
    <SidebarProvider>
      <Suspense
        fallback={<AppSidebar counts={{}} profile={profileProps} />}
      >
        <SidebarWithCounts profile={profileProps} />
      </Suspense>
      <SidebarInset className="overflow-hidden">
        <SectionShell>{children}</SectionShell>
      </SidebarInset>
      {/* Inert unless ?demo=1. Suspense is required: useSearchParams would
          otherwise opt every route in this layout into client-side rendering. */}
      <Suspense fallback={null}>
        <DemoBridge />
      </Suspense>
    </SidebarProvider>
  );
}
