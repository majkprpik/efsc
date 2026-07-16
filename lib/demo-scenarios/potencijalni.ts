// "Leads" walkthrough.
//
//   /potencijalni?demo=1&scenario=potencijalni
//
//   seg1  The list, ordered by last contact
//   seg2  One lead: the AI summary, and the notes it was written from
//
// Sleep constants are cues lifted from the generated narration timing, noted per
// step. Re-run scripts/make-narration.py and they must be re-checked.

import {
  callout,
  clear,
  click,
  exists,
  playSegment,
  runTour,
  scrollTo,
  sleep,
  spotlight,
  waitFor,
} from "./engine";

export { abortTour as abort } from "./engine";

async function seg1() {
  await waitFor("pot-row-0");
  await sleep(400);

  const audio = playSegment("seg1");

  // Cues: "the list is ordered by the date of last contact" at 5.0s, "each lead
  // records who ... brought them in" at 11.5s.
  await sleep(5000);
  spotlight("pot-row-0", 6200);
  callout("pot-row-0", "Ordered by last contact — the coldest drift into view", "right", 6200);
  await sleep(6400);

  clear();
  spotlight("pot-info", 5000);
  callout("pot-info", "Who brought them in, and when we last spoke", "bottom", 5000);

  await audio;
}

async function seg2() {
  await waitFor("pot-row-0");

  // Selection already defaults to the first row, so open a different lead — and
  // prefer one that actually has an AI summary, since it is the point of this
  // segment and the field is optional.
  for (const row of ["pot-row-1", "pot-row-2", "pot-row-0"]) {
    if (!exists(row)) continue;
    await click(row);
    await sleep(600);
    if (exists("pot-saz")) break;
  }

  const audio = playSegment("seg2");

  // Cues: the AI summary is described from 0.3s, "the notes themselves" at 9.8s.
  if (exists("pot-saz")) {
    scrollTo("pot-saz");
    spotlight("pot-saz", 9000);
    callout("pot-saz", "Written by the assistant from the notes below", "bottom", 9000);
  }
  await sleep(9500);

  clear();
  scrollTo("pot-biljeske");
  spotlight("pot-biljeske", 7500);
  callout("pot-biljeske", "A running thread between the team and the assistant", "top", 7500);

  await audio;
}

export async function boot() {
  await runTour({
    narrationBase: "/narration/potencijalni",
    startPath: "/potencijalni",
    segments: [
      { id: "seg1", run: seg1 },
      { id: "seg2", run: seg2 },
    ],
  });
}
