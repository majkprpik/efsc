// "Finance" walkthrough.
//
//   /financije?demo=1&scenario=financije
//
//   seg1  The four totals, one at a time
//   seg2  The transactions behind them
//
// Server-rendered page with nothing to click, so this tour highlights and
// narrates only.
//
// Sleep constants are cues lifted from the generated narration timing, noted per
// step. Re-run scripts/make-narration.py and they must be re-checked.

import {
  callout,
  clear,
  playSegment,
  runTour,
  scrollTo,
  sleep,
  spotlight,
  waitFor,
} from "./engine";

export { abortTour as abort } from "./engine";

async function seg1() {
  await waitFor("fin-stat-row");
  await sleep(400);

  const audio = playSegment("seg1");

  // The narration walks the four cards in order, so the spotlight does too.
  // Cues: invoiced 3.5s, paid 5.4s, cost 8.6s, overdue 10.3s, "that last number
  // is the one worth watching" 13.1s.
  spotlight("fin-stat-row", 3200, 6);
  await sleep(3400);

  clear();
  spotlight("fin-prihodi", 1900);
  await sleep(1950);

  clear();
  spotlight("fin-naplaceno", 3100);
  callout("fin-naplaceno", "Actually paid", "bottom", 3100);
  await sleep(3200);

  clear();
  spotlight("fin-troskovi", 1600);
  await sleep(1700);

  clear();
  spotlight("fin-dospjelo", 7900);
  callout("fin-dospjelo", "Overdue — earned but not collected", "bottom", 7900);

  await audio;
}

async function seg2() {
  await waitFor("fin-transakcije");
  await sleep(300);

  const audio = playSegment("seg2");

  // Cues: "each line carries the date" at 3.6s, "tied to a client" at 10.0s.
  scrollTo("fin-transakcije");
  spotlight("fin-transakcije", 3300, 6);
  await sleep(3600);

  clear();
  spotlight("fin-transakcije", 6100, 6);
  callout("fin-transakcije", "Date, client, and whether it is settled or late", "top", 6100);
  await sleep(6400);

  clear();
  spotlight("fin-transakcije", 7800, 6);
  callout(
    "fin-transakcije",
    "Each line also shows on that client's own page",
    "top",
    7800,
  );

  await audio;
}

export async function boot() {
  await runTour({
    narrationBase: "/narration/financije",
    startPath: "/financije",
    segments: [
      { id: "seg1", run: seg1 },
      { id: "seg2", run: seg2 },
    ],
  });
}
