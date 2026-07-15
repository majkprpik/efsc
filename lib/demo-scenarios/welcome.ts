// "Welcome to Orbit" walkthrough — a self-running, narrated product tour.
//
// Run it by visiting:  /?demo=1&scenario=welcome
//
// Three segments follow the shape of the business: a tender is tracked, won,
// and becomes a project.
//
//   seg1  Dashboard  — the four counters, and what the app is for
//   seg2  Natječaji  — filter to active, open one, show body/amount/deadline
//   seg3  Projekti   — open one, show progress, and the link back to its tender
//
// Audio is pre-rendered (scripts/make-narration.py) rather than synthesized at
// runtime: recordings must not have a fetch gap before the first spoken word,
// and segment durations have to be identical on every take for the highlight
// choreography below to stay in sync.
//
// Recording: run at 1440x900 or wider, and let each segment finish — the timing
// constants are tuned against the generated audio, not against the clock.

const BASE = "/narration/welcome";

type Word = { word: string; start: number; end: number };
type Timing = { duration: number; words: Word[] };

function post(payload: Record<string, unknown>) {
  window.postMessage({ __demo: true, ...payload }, "*");
}

function navigate(to: string) {
  post({ kind: "app", id: "navigate", args: { to } });
}

function scrollTo(target: string) {
  post({ kind: "app", id: "scroll-to", args: { target } });
}

function spotlight(selector: string, ms: number, padding = 10) {
  post({ kind: "demo", method: "spotlight", selector, padding, ms });
}

function callout(
  selector: string,
  text: string,
  placement: "top" | "bottom" | "left" | "right",
  ms: number,
) {
  post({ kind: "demo", method: "callout", selector, text, placement, ms });
}

function clear() {
  post({ kind: "demo", method: "clear" });
}

// --- Skip control ------------------------------------------------------------
// Pressing S (or clicking the Skip button) abandons the current segment and
// jumps to the next. Everything that waits — sleeps, audio, element polling —
// hangs off this token, because a skip that only stopped the audio would still
// sit through the segment's remaining sleeps in silence.

let skipToken = { skipped: false };
let aborted = false;

function skipSegment() {
  skipToken.skipped = true;
}

/**
 * Hard stop, exported for the launcher's Stop button. Navigating away drops the
 * bridge and its overlays, but this module keeps running — without this the
 * voice-over would carry on playing over a tour that visually ended.
 */
export function abort() {
  aborted = true;
  skipToken.skipped = true;
  for (const { audio } of Object.values(preloaded)) {
    audio.pause();
    audio.currentTime = 0;
  }
  clearCaptions();
  controls?.remove();
  controls = null;
  // Stopping while the start veil is still up must release boot()'s await on it,
  // or the run stays parked forever and blocks the next start.
  dismissStartVeil();
}

class Skipped extends Error {
  constructor() {
    super("segment skipped");
  }
}

/** Rejects with Skipped if the current segment is abandoned while waiting. */
function sleep(ms: number) {
  const token = skipToken;
  return new Promise<void>((res, rej) => {
    if (token.skipped) return rej(new Skipped());
    const t = window.setTimeout(() => {
      window.clearInterval(poll);
      res();
    }, ms);
    const poll = window.setInterval(() => {
      if (token.skipped) {
        window.clearTimeout(t);
        window.clearInterval(poll);
        rej(new Skipped());
      }
    }, 80);
  });
}

/**
 * Poll for an element. Every step that follows a navigation or a click needs
 * this — React has to commit before the node exists, and a server-rendered route
 * may still be streaming in.
 */
async function waitFor(
  target: string,
  timeoutMs = 10000,
): Promise<HTMLElement | null> {
  const sel = target.startsWith("[") ? target : `[data-tour="${target}"]`;
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) return el;
    await sleep(150); // throws Skipped if the segment is abandoned
  }
  console.warn("[tour] timed out waiting for", sel);
  return null;
}

async function click(target: string) {
  const el = await waitFor(target);
  el?.click();
  return el;
}

// --- Karaoke captions --------------------------------------------------------
// A caption strip that lights up each word in time with the voice-over. Driven
// off audio.currentTime rather than a timer, so it cannot drift.

let captionRoot: HTMLDivElement | null = null;

function ensureCaptionRoot(): HTMLDivElement {
  if (captionRoot) return captionRoot;
  const el = document.createElement("div");
  el.id = "__orbit_tour_captions";
  el.style.cssText = [
    "position:fixed",
    "left:50%",
    "bottom:36px",
    "transform:translateX(-50%)",
    "max-width:min(86vw,900px)",
    "padding:14px 22px",
    "background:rgba(20,22,28,0.94)",
    "border:1px solid #22d3ee",
    "border-radius:12px",
    "box-shadow:0 8px 32px rgba(0,0,0,.5)",
    "font:500 18px/1.5 -apple-system,system-ui,sans-serif",
    "color:rgba(255,255,255,0.45)",
    "text-align:center",
    "z-index:2147483647",
    "pointer-events:none",
  ].join(";");
  document.body.appendChild(el);
  captionRoot = el;
  return el;
}

function clearCaptions() {
  captionRoot?.remove();
  captionRoot = null;
}

function renderCaption(words: Word[], activeIdx: number) {
  const root = ensureCaptionRoot();
  root.innerHTML = "";
  words.forEach((w, i) => {
    const span = document.createElement("span");
    span.textContent = w.word + " ";
    if (i < activeIdx) span.style.color = "rgba(255,255,255,0.85)";
    else if (i === activeIdx) {
      span.style.color = "#22d3ee";
      span.style.fontWeight = "700";
    }
    root.appendChild(span);
  });
}

// --- Narration ---------------------------------------------------------------

const preloaded: Record<string, { audio: HTMLAudioElement; timing: Timing }> =
  {};

function preloadSegment(id: string) {
  if (preloaded[id]) return;
  const audio = new Audio(`${BASE}/${id}.wav`);
  audio.preload = "auto";
  audio.load();
  preloaded[id] = { audio, timing: { duration: 0, words: [] } };
  fetch(`${BASE}/${id}.json`)
    .then((r) => r.json())
    .then((t) => {
      preloaded[id].timing = t;
    })
    .catch(() => {});
}

/** Plays one segment with synced captions. Resolves when the audio ends. */
async function playSegment(id: string): Promise<void> {
  if (!preloaded[id]) preloadSegment(id);
  let timing = preloaded[id].timing;
  if (!timing.words.length) {
    try {
      timing = await fetch(`${BASE}/${id}.json`).then((r) => r.json());
    } catch {
      timing = { duration: 0, words: [] };
    }
  }

  const audio = preloaded[id].audio;
  const token = skipToken;

  // Re-runs (skipping back into a segment) start from the top.
  audio.currentTime = 0;

  await new Promise<void>((resolve) => {
    let raf = 0;
    const tick = () => {
      if (token.skipped) {
        audio.pause();
        finish();
        return;
      }
      const t = audio.currentTime;
      let active = -1;
      for (let i = 0; i < timing.words.length; i++) {
        if (timing.words[i].start <= t) active = i;
        else break;
      }
      renderCaption(timing.words, active);
      raf = requestAnimationFrame(tick);
    };
    const finish = () => {
      cancelAnimationFrame(raf);
      resolve();
    };
    audio.addEventListener("ended", finish, { once: true });
    audio.addEventListener("error", finish, { once: true });
    audio
      .play()
      .then(() => {
        raf = requestAnimationFrame(tick);
      })
      .catch(() => {
        // Autoplay blocked despite the gesture — show captions statically so the
        // run still completes rather than hanging forever. Still poll the skip
        // token, otherwise Skip does nothing in this branch.
        renderCaption(timing.words, timing.words.length - 1);
        const deadline = performance.now() + (timing.duration || 6) * 1000;
        const poll = window.setInterval(() => {
          if (token.skipped || performance.now() >= deadline) {
            window.clearInterval(poll);
            finish();
          }
        }, 80);
      });
  });
}

// --- Controls HUD ------------------------------------------------------------
// A small fixed control strip so a segment can be skipped while iterating,
// instead of sitting through the whole ~60s run to check one highlight. Hidden
// with &hud=0 when recording the real screencast.

let controls: HTMLDivElement | null = null;

function installControls(showHud: boolean) {
  window.addEventListener("keydown", (e) => {
    // Ignore while typing, so S in a search box doesn't skip the tour.
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (e.key === "s" || e.key === "S") skipSegment();
  });

  if (!showHud) return;

  const hud = document.createElement("div");
  controls = hud;
  hud.style.cssText = [
    "position:fixed",
    "right:16px",
    "top:16px",
    "display:flex",
    "gap:8px",
    "align-items:center",
    "padding:8px 10px",
    "background:rgba(20,22,28,0.9)",
    "border:1px solid rgba(255,255,255,.14)",
    "border-radius:10px",
    "font:500 12px/1 -apple-system,system-ui,sans-serif",
    "color:rgba(255,255,255,.75)",
    "z-index:2147483647",
  ].join(";");

  const label = document.createElement("span");
  label.textContent = "tour";
  hud.appendChild(label);

  const btn = document.createElement("button");
  btn.textContent = "Skip ›";
  btn.style.cssText = [
    "padding:5px 10px",
    "background:#22d3ee",
    "color:#08121a",
    "border:0",
    "border-radius:6px",
    "font:600 12px/1 -apple-system,system-ui,sans-serif",
    "cursor:pointer",
  ].join(";");
  btn.addEventListener("click", skipSegment);
  hud.appendChild(btn);

  const hint = document.createElement("span");
  hint.textContent = "or press S";
  hint.style.opacity = "0.5";
  hud.appendChild(hint);

  document.body.appendChild(hud);
}

let startVeil: HTMLDivElement | null = null;
let veilResolve: (() => void) | null = null;

/**
 * Browsers refuse to play audio until the page has been interacted with. The
 * click on this veil is that interaction — without it narration silently fails.
 * Resolves on click, or when abort() tears the veil down.
 */
function waitForStartGesture(): Promise<void> {
  return new Promise<void>((resolve) => {
    const veil = document.createElement("div");
    startVeil = veil;
    veilResolve = resolve;
    veil.style.cssText = [
      "position:fixed",
      "inset:0",
      "display:flex",
      "flex-direction:column",
      "align-items:center",
      "justify-content:center",
      "gap:14px",
      "background:rgba(8,10,14,0.82)",
      "backdrop-filter:blur(2px)",
      "cursor:pointer",
      "z-index:2147483647",
      "font:600 22px/1.4 -apple-system,system-ui,sans-serif",
      "color:#fff",
      "text-align:center",
    ].join(";");
    veil.innerHTML =
      '<div style="font-size:40px">▶︎</div>' +
      "<div>Click anywhere to start the walkthrough</div>" +
      '<div style="font:400 14px/1.4 -apple-system,system-ui;color:#22d3ee">Make sure your screen recorder is running</div>';
    veil.addEventListener("click", () => {
      dismissStartVeil();
    });
    document.body.appendChild(veil);
  });
}

function dismissStartVeil() {
  startVeil?.remove();
  startVeil = null;
  veilResolve?.();
  veilResolve = null;
}

// --- Segments ----------------------------------------------------------------

async function runSeg1() {
  clear();
  await waitFor("stat-row");

  // Start the audio and choreograph highlights against it. The promise is held,
  // not awaited, so the spotlight can move while the same sentence plays.
  //
  // Cues below are lifted from seg1.json: the counters are described at 5.9s,
  // and "the last counter ... turns red" lands at 14.7s.
  const audio = playSegment("seg1");

  spotlight("stat-row", 14000, 8);
  await sleep(14300);

  clear();
  spotlight("stat-rokovi", 7000);
  callout("stat-rokovi", "Deadlines falling due this week", "bottom", 7000);

  await audio;
  clear();
}

async function runSeg2() {
  clear();
  clearCaptions();

  navigate("/natjecaji?demo=1&scenario=welcome");
  await waitFor("nat-filters");
  await sleep(600);

  const audio = playSegment("seg2");

  // Cues from seg2.json: "filtering down to the active ones" at 2.5s, the terms
  // are read out from ~8s, and "the application deadline" lands at 16.3s.
  //
  // Filtering and opening are both local state, so the detail panel fills in
  // instantly with no server round-trip.
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
  clear();
}

async function runSeg3() {
  clear();
  clearCaptions();

  navigate("/projekti?demo=1&scenario=welcome");
  await waitFor("proj-row-0");
  await sleep(600);

  const audio = playSegment("seg3");

  // Cues from seg3.json: the project's own fields are described at 3.2s, and the
  // link back to the tender at 10.1s.
  await click("proj-row-0");
  await sleep(2600);

  spotlight("proj-info", 7000);
  callout("proj-info", "Progress, deadline, document checklist", "bottom", 7000);
  await sleep(7200);

  clear();
  // The tender link is the point of the whole tour: it closes the loop back to
  // where the project came from. Skipped when the dummy project has no tender.
  if (document.querySelector('[data-tour="proj-natjecaj-link"]')) {
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
  clear();
  clearCaptions();
}

// --- Entry point -------------------------------------------------------------

let started = false;

const SEGMENTS: { id: string; run: () => Promise<void> }[] = [
  { id: "seg1", run: runSeg1 },
  { id: "seg2", run: runSeg2 },
  { id: "seg3", run: runSeg3 },
];

/** Leaves no audio playing and no overlay behind before the next segment. */
function resetBetweenSegments() {
  for (const { audio } of Object.values(preloaded)) {
    audio.pause();
    audio.currentTime = 0;
  }
  clear();
  clearCaptions();
}

/**
 * Called by DemoBridge once, on mount, when ?demo=1&scenario=welcome is present.
 *
 * Segments navigate between routes, but the bridge lives in the layout above
 * them, so the module stays alive across route changes — the tour runs straight
 * through without needing to resume itself. The module-level `started` flag is
 * therefore the only re-entry guard needed; it dies with the page, so a reload
 * always gets a fresh run.
 *
 * URL knobs, for iterating without watching the whole ~60s run:
 *   &seg=2    start at segment 2 (segments before it are not played)
 *   &hud=0    hide the Skip control (use when recording)
 */
export async function boot() {
  // Guards against a double mount racing two copies of the same run. It is
  // cleared when the run ends, because Stop → Start is a client-side navigation
  // that re-enters boot() without ever re-evaluating this module.
  if (started) return;
  started = true;
  aborted = false;

  const params = new URLSearchParams(window.location.search);
  const from = Math.min(Math.max(parseInt(params.get("seg") || "1", 10) || 1, 1), SEGMENTS.length);
  const showHud = params.get("hud") !== "0";

  // seg1 reads the dashboard; later segments navigate there themselves, so they
  // can be entered from whatever page is currently open.
  if (from === 1 && window.location.pathname !== "/") {
    console.log("[tour] start from the dashboard: /?demo=1&scenario=welcome");
    started = false;
    return;
  }

  const queue = SEGMENTS.slice(from - 1);
  queue.slice(0, 2).forEach((s) => preloadSegment(s.id));

  installControls(showHud);
  await waitForStartGesture();

  for (let i = 0; i < queue.length; i++) {
    if (aborted) break;
    skipToken = { skipped: false };
    const next = queue[i + 1];
    if (next) preloadSegment(next.id);

    try {
      await queue[i].run();
    } catch (e) {
      if (e instanceof Skipped) {
        console.log(`[tour] ${queue[i].id} ${aborted ? "aborted" : "skipped"}`);
      } else {
        console.error(`[tour] ${queue[i].id} failed:`, e);
      }
    } finally {
      resetBetweenSegments();
    }
  }

  controls?.remove();
  controls = null;
  started = false;
  console.log(aborted ? "[tour] stopped" : "[tour] done");
}
