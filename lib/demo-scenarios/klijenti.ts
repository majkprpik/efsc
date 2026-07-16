// "Clients" walkthrough.
//
//   /klijenti?demo=1&scenario=klijenti
//
//   seg1  The list, the tags, and filtering by them
//   seg2  One client: their projects, tenders, and invoices in one place
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
  await waitFor("klijent-tags");
  await sleep(400);

  const audio = playSegment("seg1");

  // Cues: "each client carries the contact details ... tags" at 4.0s, "those
  // tags double as filters" at 9.9s.
  spotlight("klijent-row-0", 3400);
  await sleep(3700);

  clear();
  spotlight("klijent-tags", 5600);
  callout("klijent-tags", "Tags describe the kind of work a client does", "bottom", 5600);
  await sleep(5900);

  clear();
  // Tags are derived from the data, not a fixed list, so target the first one by
  // index rather than by name. With no tags in the data there is nothing to
  // filter by and the click is skipped.
  if (exists("klijent-tag-0")) {
    await click("klijent-tag-0");
    await sleep(700);
    spotlight("klijent-tags", 5500);
    callout("klijent-tags", "Filtering the list down to one kind", "bottom", 5500);
    await sleep(4000);
    // Restore the full list so the tour doesn't leave the page filtered.
    await click("klijent-tag-svi");
  }

  await audio;
}

async function seg2() {
  await waitFor("klijent-row-0");

  // Selection already defaults to the first row, so opening row 0 would be a
  // visual no-op — click the second client if there is one.
  const target = exists("klijent-row-1") ? "klijent-row-1" : "klijent-row-0";
  await click(target);
  await sleep(700);

  const audio = playSegment("seg2");

  // Cues: "their projects" at 4.1s, "the tenders" at 7.6s, "and their finances"
  // at 9.9s.
  spotlight("klijent-header", 3600);
  await sleep(3900);

  clear();
  scrollTo("klijent-projekti");
  spotlight("klijent-projekti", 3300);
  callout("klijent-projekti", "Every project for this client", "top", 3300);
  await sleep(3600);

  clear();
  if (exists("klijent-natjecaji")) {
    scrollTo("klijent-natjecaji");
    spotlight("klijent-natjecaji", 2100);
    callout("klijent-natjecaji", "Tenders they were entered into", "top", 2100);
  }
  await sleep(2400);

  clear();
  if (exists("klijent-financije")) {
    scrollTo("klijent-financije");
    spotlight("klijent-financije", 8000);
    callout("klijent-financije", "Invoices, and who still owes what", "top", 8000);
  }

  await audio;
}

export async function boot() {
  await runTour({
    narrationBase: "/narration/klijenti",
    startPath: "/klijenti",
    segments: [
      { id: "seg1", run: seg1 },
      { id: "seg2", run: seg2 },
    ],
  });
}
