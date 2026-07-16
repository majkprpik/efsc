"use client";

// Sidebar entry point for the narrated walkthroughs.
//
// Starting a tour is a full navigation to the tour URL rather than a client-side
// state flip: the scenario expects a fresh page (its module-level `started` guard
// dies with the page), and this keeps a running tour shareable and reloadable.
//
// While a tour is running the same button becomes Stop, which navigates back to
// the plain route — dropping ?demo=1 unmounts the bridge and takes every overlay
// with it.

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PlayCircle, Square, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TOUR_ENDED, TOURS, findTour, tourUrl } from "@/lib/demo-scenarios/registry";
import { useT } from "@/lib/i18n/client";

export function TourLauncher() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const t = useT();
  const scenario = params.get("scenario");
  const url = params.toString();
  const inTourUrl = params.get("demo") === "1" && !!scenario;

  // A finished tour leaves its own URL behind, so the URL alone cannot say
  // whether a run is still going; the scenario announces the end itself.
  const [ended, setEnded] = useState(false);
  useEffect(() => {
    const onEnd = () => setEnded(true);
    window.addEventListener(TOUR_ENDED, onEnd);
    return () => window.removeEventListener(TOUR_ENDED, onEnd);
  }, []);

  // Starting another tour navigates, which is what clears the ended state.
  useEffect(() => setEnded(false), [url]);

  const running = inTourUrl && !ended;

  // Navigating away unmounts the bridge (and its overlays), but the scenario
  // module lives on and would keep narrating; abort() silences it first.
  const stop = async () => {
    const tour = findTour(scenario);
    if (tour) (await tour.load()).abort();
    router.push(pathname);
  };

  if (running) {
    return (
      <button
        onClick={stop}
        title={t.nav.zaustaviTutorial}
        className="flex h-8 items-center gap-1.5 rounded-md border px-2 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
      >
        <Square className="size-4 shrink-0 fill-current" />
        <span className="hidden lg:inline">{t.nav.zaustaviTutorial}</span>
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            title={t.nav.pokreniTutorial}
            className="flex h-8 items-center gap-1.5 rounded-md border px-2 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <PlayCircle className="size-4 shrink-0" />
            <span className="hidden lg:inline">{t.nav.pokreniTutorial}</span>
            <ChevronRight className="size-3.5 opacity-50" />
          </button>
        }
      />
      <DropdownMenuContent side="bottom" align="end" className="w-64">
        {/* Every DropdownMenuLabel is a Base UI Menu.GroupLabel and throws
            unless it sits inside a Menu.Group — a plain wrapper is not enough. */}
        {TOURS.map((tour) => (
          <DropdownMenuGroup key={tour.id}>
            <DropdownMenuLabel className="flex items-baseline justify-between gap-2">
              <span>{tour.label}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {tour.seconds}s
              </span>
            </DropdownMenuLabel>
            <div className="px-1.5 pb-1.5 text-xs text-muted-foreground">
              {tour.blurb}
            </div>
            <DropdownMenuItem onClick={() => router.push(tourUrl(tour))}>
              <PlayCircle className="size-4" />
              Pokreni od početka
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Skoči na dio
            </DropdownMenuLabel>
            {Array.from({ length: tour.segments }, (_, i) => i + 1).map((seg) => (
              <DropdownMenuItem
                key={seg}
                onClick={() => router.push(tourUrl(tour, { seg }))}
              >
                <span className="w-4 text-center text-xs tabular-nums text-muted-foreground">
                  {seg}
                </span>
                {SEGMENT_LABELS[tour.id]?.[seg - 1] ?? `Dio ${seg}`}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Kept next to the launcher rather than in the registry: these are labels for
// humans picking a starting point, not something the scenarios themselves use.
const SEGMENT_LABELS: Record<string, string[]> = {
  welcome: ["Dashboard", "Natječaji", "Projekti"],
  klijenti: ["Lista i tagovi", "Kartica klijenta"],
  potencijalni: ["Lista", "AI sažetak i bilješke"],
  rad: ["Taskovi", "Rokovi"],
  financije: ["Brojke", "Transakcije"],
};
