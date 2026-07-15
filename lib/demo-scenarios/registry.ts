// The list of walkthroughs available in the app.
//
// Adding a tour means: write lib/demo-scenarios/<id>.ts exporting boot(),
// add its narration under public/narration/<id>/, and add a row here. The
// launcher menu and the bridge both read from this list, so nothing else needs
// touching.

export type TourDef = {
  id: string;
  /** Shown in the launcher menu. */
  label: string;
  /** One-line description of what the tour covers. */
  blurb: string;
  /** Route the tour must start from. */
  start: string;
  /** Number of segments, so the launcher can offer per-segment entry points. */
  segments: number;
  /** Rough runtime in seconds, shown in the menu. */
  seconds: number;
  load: () => Promise<{ boot: () => Promise<void>; abort: () => void }>;
};

export const TOURS: TourDef[] = [
  {
    id: "welcome",
    label: "Welcome to Orbit",
    blurb: "Dashboard, tenders, and how a project links back to its tender.",
    start: "/",
    segments: 3,
    seconds: 61,
    load: () => import("./welcome"),
  },
];

export function findTour(id: string | null): TourDef | undefined {
  return TOURS.find((t) => t.id === id);
}

/** Builds the URL that starts a tour (optionally at a given segment). */
export function tourUrl(
  tour: TourDef,
  opts: { seg?: number; hud?: boolean } = {},
): string {
  const params = new URLSearchParams({ demo: "1", scenario: tour.id });
  if (opts.seg && opts.seg > 1) params.set("seg", String(opts.seg));
  if (opts.hud === false) params.set("hud", "0");
  return `${tour.start}?${params}`;
}
