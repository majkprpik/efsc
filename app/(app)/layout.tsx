import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { ini } from "@/lib/ui";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, klijenti, potencijalni, natjecaji, projekti] =
    await Promise.all([
      supabase.from("profiles").select("name, email").eq("id", user.id).single(),
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

  const name = profile?.name || user.email?.split("@")[0] || "Korisnik";
  const email = profile?.email || user.email || "";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        counts={{
          klijenti: klijenti.count ?? 0,
          potencijalni: potencijalni.count ?? 0,
          natjecaji: natjecaji.count ?? 0,
          projekti: projekti.count ?? 0,
        }}
        profile={{ name, email, initials: ini(name) }}
      />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
