// "Work" walkthrough — the task board and the deadline list.
//
//   /taskovi?demo=1&scenario=rad
//
//   seg1  Taskovi — three columns, what a card carries, priority
//   seg2  Rokovi  — today, and everything colored by urgency
//
// Both pages are server-rendered and have nothing to click, so this tour only
// highlights and narrates. That is the honest shape of these pages: they are
// meant to be read, not operated.
//
// Sleep constants are cues lifted from the generated narration timing, noted per
// step. Re-run scripts/make-narration.py and they must be re-checked.

import {
  callout,
  clear,
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
  await waitFor("task-board");
  await sleep(400);

  const audio = playSegment("seg1");

  // Cues: "three columns" at 3.1s, "each card names the project" at 8.6s, "the
  // badge on the right is the priority" at 13.9s.
  await sleep(3100);
  spotlight("task-board", 5300, 6);
  callout("task-board", "To do, in progress, done", "bottom", 5300);
  await sleep(5500);

  clear();
  // Any column can be empty on real data; highlight the first card that exists.
  const card =
    ["task-card-todo-0", "task-card-doing-0", "task-card-done-0"].find(exists) ??
    "task-board";
  scrollTo(card);
  spotlight(card, 5100);
  callout(card, "Project, assignee, due date", "right", 5100);
  await sleep(5300);

  clear();
  spotlight(card, 4400);
  callout(card, "Priority — urgent ones in red", "right", 4400);

  await audio;
}

async function seg2() {
  navigate("/rokovi?demo=1&scenario=rad");
  await waitFor("rok-banner");
  await sleep(600);

  const audio = playSegment("seg2");

  // Cues: "everything is listed against today" at 5.9s, "red inside three days"
  // at 10.9s, "read at a glance" at 18.2s.
  spotlight("rok-banner", 5300);
  callout("rok-banner", "Today", "bottom", 5300);
  await sleep(5600);

  clear();
  spotlight("rok-list", 5000, 6);
  await sleep(5200);

  clear();
  // The urgency colors depend on the current date, so point at the list as a
  // whole rather than betting on a given row being red.
  spotlight("rok-list", 9500, 6);
  callout(
    "rok-list",
    "Red inside three days, amber inside fifteen, grey once passed",
    "top",
    9500,
  );

  await audio;
}

export async function boot() {
  await runTour({
    narrationBase: "/narration/rad",
    startPath: "/taskovi",
    segments: [
      { id: "seg1", run: seg1 },
      { id: "seg2", run: seg2 },
    ],
  });
}
