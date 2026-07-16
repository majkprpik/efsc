// Shared machinery for the narrated walkthroughs.
//
// A scenario file supplies only its segments — the choreography — and calls
// runTour(). Everything a tour needs to survive contact with a real browser
// lives here: audio preloading, karaoke captions, the autoplay unlock, skip,
// stop, and the waits.
//
// Audio is pre-rendered (scripts/make-narration.py) rather than synthesized at
// runtime: recordings must not have a fetch gap before the first spoken word,
// and segment durations have to be identical on every take, or the sleep()
// constants in each scenario drift out of sync with the voice.
//
// Recording: run at 1440x900 or wider. Some panels are hidden below the md
// breakpoint, and getBoundingClientRect() on a hidden element returns zeros —
// the bridge would draw a degenerate overlay over nothing.

import { TOUR_ENDED } from "./registry";

type Word = { word: string; start: number; end: number };
type Timing = { duration: number; words: Word[] };

export type Segment = { id: string; run: () => Promise<void> };

// --- Bridge channel ----------------------------------------------------------

function post(payload: Record<string, unknown>) {
  window.postMessage({ __demo: true, ...payload }, "*");
}

/** Route change. Must go through the bridge — it holds the App Router. */
export function navigate(to: string) {
  post({ kind: "app", id: "navigate", args: { to } });
}

export function scrollTo(target: string) {
  post({ kind: "app", id: "scroll-to", args: { target } });
}

export function spotlight(selector: string, ms: number, padding = 10) {
  post({ kind: "demo", method: "spotlight", selector, padding, ms });
}

export function callout(
  selector: string,
  text: string,
  placement: "top" | "bottom" | "left" | "right",
  ms: number,
) {
  post({ kind: "demo", method: "callout", selector, text, placement, ms });
}

export function clear() {
  post({ kind: "demo", method: "clear" });
}

// --- Skip / stop -------------------------------------------------------------
// Pressing S abandons the current segment; Stop abandons the whole run. Both
// hang off this token, because stopping only the audio would still leave the
// segment sitting through its remaining sleeps in silence.

let skipToken = { skipped: false };
let aborted = false;

export function skipSegment() {
  skipToken.skipped = true;
}

class Skipped extends Error {
  constructor() {
    super("segment skipped");
  }
}

/** Rejects with Skipped if the current segment is abandoned while waiting. */
export function sleep(ms: number) {
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
 * Poll for an element. Every step after a navigation or a click needs this —
 * React has to commit before the node exists, and a server-rendered route may
 * still be streaming in.
 */
export async function waitFor(
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

export async function click(target: string) {
  const el = await waitFor(target);
  el?.click();
  return el;
}

/** True when the element exists — for steps that depend on optional data. */
export function exists(target: string): boolean {
  const sel = target.startsWith("[") ? target : `[data-tour="${target}"]`;
  return !!document.querySelector(sel);
}

// --- Karaoke captions --------------------------------------------------------
// Driven off audio.currentTime rather than a timer, so they cannot drift.

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

let base = "";
const preloaded: Record<string, { audio: HTMLAudioElement; timing: Timing }> =
  {};

function preloadSegment(id: string) {
  if (preloaded[id]) return;
  const audio = new Audio(`${base}/${id}.wav`);
  audio.preload = "auto";
  audio.load();
  preloaded[id] = { audio, timing: { duration: 0, words: [] } };
  fetch(`${base}/${id}.json`)
    .then((r) => r.json())
    .then((t) => {
      preloaded[id].timing = t;
    })
    .catch(() => {});
}

/** Plays one segment with synced captions. Resolves when the audio ends. */
export async function playSegment(id: string): Promise<void> {
  if (!preloaded[id]) preloadSegment(id);
  let timing = preloaded[id].timing;
  if (!timing.words.length) {
    try {
      timing = await fetch(`${base}/${id}.json`).then((r) => r.json());
    } catch {
      timing = { duration: 0, words: [] };
    }
  }

  const audio = preloaded[id].audio;
  const token = skipToken;

  // Re-runs start from the top.
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

// --- Controls ----------------------------------------------------------------

let controls: HTMLDivElement | null = null;
let keyHandler: ((e: KeyboardEvent) => void) | null = null;

function installControls(showHud: boolean) {
  keyHandler = (e: KeyboardEvent) => {
    // Ignore while typing, so S in a search box doesn't skip the tour.
    const t = e.target as HTMLElement | null;
    if (
      t &&
      (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
    )
      return;
    if (e.key === "s" || e.key === "S") skipSegment();
  };
  window.addEventListener("keydown", keyHandler);

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

function removeControls() {
  controls?.remove();
  controls = null;
  if (keyHandler) window.removeEventListener("keydown", keyHandler);
  keyHandler = null;
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
    veil.addEventListener("click", () => dismissStartVeil());
    document.body.appendChild(veil);
  });
}

function dismissStartVeil() {
  startVeil?.remove();
  startVeil = null;
  veilResolve?.();
  veilResolve = null;
}

/**
 * Hard stop, for the launcher's Stop button. Navigating away drops the bridge
 * and its overlays, but the scenario module keeps running — without this the
 * voice-over would carry on over a tour that visually ended.
 */
export function abortTour() {
  aborted = true;
  skipToken.skipped = true;
  for (const { audio } of Object.values(preloaded)) {
    audio.pause();
    audio.currentTime = 0;
  }
  clearCaptions();
  removeControls();
  // Stopping while the start veil is still up must release the await on it, or
  // the run stays parked forever and blocks the next start.
  dismissStartVeil();
}

// --- Runner ------------------------------------------------------------------

let started = false;

function resetBetweenSegments() {
  for (const { audio } of Object.values(preloaded)) {
    audio.pause();
    audio.currentTime = 0;
  }
  clear();
  clearCaptions();
}

/**
 * Runs a tour's segments in order. Called by each scenario's boot().
 *
 * Segments navigate between routes, but the bridge lives in the layout above
 * them, so this module stays alive across route changes — the tour runs straight
 * through without needing to resume itself.
 *
 * URL knobs, for iterating without watching the whole run:
 *   &seg=2    start at segment 2 (segments before it are not played)
 *   &hud=0    hide the Skip control (use when recording)
 */
export async function runTour(opts: {
  narrationBase: string;
  segments: Segment[];
  /** Route the first segment reads; later segments navigate for themselves. */
  startPath: string;
}) {
  // Guards a double mount racing two copies of the same run. Cleared when the
  // run ends, because Stop → Start is a client-side navigation that re-enters
  // boot() without re-evaluating the module.
  if (started) return;
  started = true;
  aborted = false;
  base = opts.narrationBase;

  const params = new URLSearchParams(window.location.search);
  const total = opts.segments.length;
  const from = Math.min(
    Math.max(parseInt(params.get("seg") || "1", 10) || 1, 1),
    total,
  );
  const showHud = params.get("hud") !== "0";

  if (from === 1 && window.location.pathname !== opts.startPath) {
    console.log(`[tour] start from ${opts.startPath}`);
    started = false;
    return;
  }

  const queue = opts.segments.slice(from - 1);
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

  removeControls();
  started = false;
  console.log(aborted ? "[tour] stopped" : "[tour] done");
  // The URL still says ?demo=1, so nothing else can tell the launcher the run
  // is over — without this it would offer "Stop" forever.
  window.dispatchEvent(new CustomEvent(TOUR_ENDED));
}
