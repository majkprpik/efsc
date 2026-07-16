// "Welcome to Orbit" walkthrough.
//
//   /?demo=1&scenario=welcome
//
// Three segments follow the shape of the business: a tender is tracked, won,
// and becomes a project.
//
//   seg1  Dashboard  — the four counters, and what the app is for
//   seg2  Natječaji  — filter to active, open one, show body/amount/deadline
//   seg3  Projekti   — open one, show progress, and the link back to its tender
//
// Sleep constants are cues lifted from the generated narration timing, noted per
// step. Re-run scripts/make-narration.py and they must be re-checked.

import {
  callout,
  clear,
  click,
  exists,
  navigate,
  playSegment,
  runTour,
  scrollTo,
  sleep,
  spotlight,
  waitFor,
} from "./engine";

export { abortTour as abort } from "./engine";

async function seg1() {
  await waitFor("stat-row");

  // The audio promise is held, not awaited, so the spotlight can move while the
  // same sentence plays. Cues: counters described at 5.9s, "the last counter ...
  // turns red" at 14.7s.
  const audio = playSegment("seg1");

  spotlight("stat-row", 14000, 8);
  await sleep(14300);

  clear();
  spotlight("stat-rokovi", 7000);
  callout("stat-rokovi", "Deadlines falling due this week", "bottom", 7000);

  await audio;
}

async function seg2() {
  navigate("/natjecaji?demo=1&scenario=welcome");
  await waitFor("nat-filters");
  await sleep(600);

  const audio = playSegment("seg2");

  // Cues: "filtering down to the active ones" at 2.5s, terms read out from ~8s,
  // "the application deadline" at 16.3s. Filtering and opening are local state,
  // so the detail panel fills in with no server round-trip.
  spotlight("nat-filters", 4200);
  await sleep(2500);
  await click("nat-filter-aktivan");
  await sleep(2000);

  clear();
  await click("nat-row-0");
  await sleep(800);

  scrollTo("nat-meta");
  spotlight("nat-meta", 10500);
  callout(
    "nat-meta",
    "Awarding body, total amount, co-financing rate",
    "bottom",
    10500,
  );
  await sleep(11000);

  clear();
  spotlight("nat-info", 5000);
  callout("nat-info", "Application deadline", "top", 5000);

  await audio;
}

async function seg3() {
  navigate("/projekti?demo=1&scenario=welcome");
  await waitFor("proj-row-0");
  await sleep(600);

  const audio = playSegment("seg3");

  // Cues: the project's own fields at 3.2s, the link back to the tender at 10.1s.
  await click("proj-row-0");
  await sleep(2600);

  spotlight("proj-info", 7000);
  callout("proj-info", "Progress, deadline, document checklist", "bottom", 7000);
  await sleep(7200);

  clear();
  // The point of the whole tour: it closes the loop back to where the project
  // came from. Skipped when the dummy project has no tender.
  if (exists("proj-natjecaj-link")) {
    scrollTo("proj-natjecaj-link");
    spotlight("proj-natjecaj-link", 7000);
    callout(
      "proj-natjecaj-link",
      "Every project links back to the tender it came from",
      "bottom",
      7000,
    );
  }

  await audio;
}

export async function boot() {
  await runTour({
    narrationBase: "/narration/welcome",
    startPath: "/",
    segments: [
      { id: "seg1", run: seg1 },
      { id: "seg2", run: seg2 },
      { id: "seg3", run: seg3 },
    ],
  });
}
