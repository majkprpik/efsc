"use client";

// Demo bridge — overlay engine for self-running, narrated walkthroughs.
//
// Mounted in the app layout but inert unless the URL carries ?demo=1, so it
// costs nothing in normal use. Scenarios drive it with window.postMessage:
//
//   kind: 'demo'  -> draws a primitive (highlight, spotlight, callout, toast)
//   kind: 'app'   -> calls a function from the registry (navigate, scroll-to)
//
// The registry channel exists for things an overlay cannot do itself. In this
// app that matters most for navigation: App Router routes must change via
// router.push(), so the scenario asks the bridge (which holds the router) to do
// it rather than touching history directly.
//
// Overlays are pointerEvents:'none' and self-expire on their own timers, so the
// real UI stays clickable underneath and nothing leaks between segments.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { toast as sonnerToast } from "sonner";
import { findTour } from "@/lib/demo-scenarios/registry";

type DemoFn = (args?: Record<string, unknown>) => void;
const registry = new Map<string, DemoFn>();

export function registerDemo(id: string, fn: DemoFn): void {
  registry.set(id, fn);
}

type Base = { id: number; ms: number; rect: DOMRect };
type Overlay =
  | (Base & { kind: "highlight"; color: string; dim: boolean; padding: number })
  | (Base & {
      kind: "callout";
      text: string;
      placement: "top" | "bottom" | "left" | "right";
    });

const ACCENT = "#22d3ee";
const PANEL_BG = "rgba(20,22,28,0.94)";

let overlayId = 0;

/**
 * Bare tokens are shorthand for the data-tour attribute; anything that looks
 * like real CSS is passed through. This keeps scenarios readable ('nav-projekti'
 * rather than '[data-tour="nav-projekti"]') while still allowing an escape hatch.
 */
function resolveSelector(target: string): string {
  if (!target) return "";
  if (
    target.startsWith("[") ||
    target.startsWith(".") ||
    target.startsWith("#") ||
    target.includes(" ") ||
    target.includes(":")
  ) {
    return target;
  }
  return `[data-tour="${target}"]`;
}

function rectFor(selector: string): DOMRect | null {
  try {
    return document.querySelector(selector)?.getBoundingClientRect() ?? null;
  } catch {
    return null;
  }
}

function Layer({
  overlay,
  onExpire,
}: {
  overlay: Overlay;
  onExpire: () => void;
}) {
  useEffect(() => {
    const t = window.setTimeout(onExpire, overlay.ms);
    return () => window.clearTimeout(t);
  }, [overlay, onExpire]);

  if (overlay.kind === "highlight") {
    const { rect, color, dim, padding } = overlay;
    return (
      <div
        style={{
          position: "fixed",
          left: rect.left - padding,
          top: rect.top - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
          border: `2px solid ${color}`,
          borderRadius: 10,
          // The dim is a single huge outward shadow — the element's own box
          // punches the hole, so no mask or clip-path is needed.
          boxShadow: dim ? "0 0 0 9999px rgba(0,0,0,0.55)" : "none",
          pointerEvents: "none",
          transition: "all 0.25s ease",
          zIndex: 2147483646,
        }}
      />
    );
  }

  const { rect, text, placement } = overlay;
  const offset = 12;
  const style: React.CSSProperties = {
    position: "fixed",
    background: PANEL_BG,
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    lineHeight: 1.4,
    maxWidth: 280,
    border: `1px solid ${ACCENT}`,
    boxShadow: "0 8px 32px rgba(0,0,0,.45)",
    pointerEvents: "none",
    zIndex: 2147483647,
  };
  if (placement === "top") {
    style.left = rect.left + rect.width / 2;
    style.top = rect.top - offset;
    style.transform = "translate(-50%, -100%)";
  } else if (placement === "bottom") {
    style.left = rect.left + rect.width / 2;
    style.top = rect.bottom + offset;
    style.transform = "translateX(-50%)";
  } else if (placement === "left") {
    style.left = rect.left - offset;
    style.top = rect.top + rect.height / 2;
    style.transform = "translate(-100%, -50%)";
  } else {
    style.left = rect.right + offset;
    style.top = rect.top + rect.height / 2;
    style.transform = "translateY(-50%)";
  }
  return <div style={style}>{text}</div>;
}

function handleDemo(
  data: Record<string, any>,
  setOverlays: React.Dispatch<React.SetStateAction<Overlay[]>>,
) {
  const { method } = data;

  if (method === "toast") {
    sonnerToast(data.text || "", { duration: data.ms || 4000 });
    return;
  }
  if (method === "clear") {
    setOverlays([]);
    sonnerToast.dismiss();
    return;
  }

  const rect = rectFor(resolveSelector(data.selector || data.target));
  if (!rect) return;
  const id = ++overlayId;

  if (method === "highlight" || method === "spotlight") {
    setOverlays((curr) => [
      ...curr,
      {
        id,
        kind: "highlight",
        rect,
        ms: data.ms ?? 4000,
        color: data.color || ACCENT,
        dim: method === "spotlight" || !!data.dim,
        padding: data.padding ?? 8,
      },
    ]);
  } else if (method === "callout") {
    setOverlays((curr) => [
      ...curr,
      {
        id,
        kind: "callout",
        rect,
        ms: data.ms ?? 4000,
        text: data.text || "",
        placement: data.placement || "bottom",
      },
    ]);
  }
}

function Bridge() {
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  // Navigation and scrolling live here because they need the router and the
  // live DOM; scenarios reach them through the 'app' channel.
  useEffect(() => {
    registerDemo("navigate", (args) => {
      const to = args?.to as string;
      if (to) router.push(to);
    });
    registerDemo("scroll-to", (args) => {
      const sel = resolveSelector((args?.target as string) || "");
      document
        .querySelector(sel)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [router]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data;
      if (!data || data.__demo !== true) return;
      if (data.kind === "demo") {
        handleDemo(data, setOverlays);
      } else if (data.kind === "app") {
        const fn = registry.get(data.id);
        if (fn) {
          try {
            fn(data.args || {});
          } catch (err) {
            console.error("[demo-bridge] app error:", err);
          }
        } else {
          console.warn("[demo-bridge] not registered:", data.id);
        }
      }
    }
    window.addEventListener("message", onMessage);
    console.log("[demo-bridge] mounted");
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      {overlays.map((o) => (
        <Layer
          key={o.id}
          overlay={o}
          onExpire={() =>
            setOverlays((curr) => curr.filter((x) => x.id !== o.id))
          }
        />
      ))}
    </>,
    document.body,
  );
}

/**
 * Gate. Kept separate from Bridge so the hooks above only ever run in demo mode.
 * Callers must wrap this in <Suspense> — useSearchParams opts the whole route
 * into client-side rendering otherwise.
 */
export function DemoBridge() {
  const params = useSearchParams();
  const enabled = params.get("demo") === "1";
  const scenario = params.get("scenario");

  useEffect(() => {
    if (!enabled || !scenario) return;
    const tour = findTour(scenario);
    if (!tour) {
      console.warn("[demo-bridge] unknown scenario:", scenario);
      return;
    }
    // Loaded on demand so scenario code never lands in the main bundle.
    tour.load().then((m) => m.boot());
  }, [enabled, scenario]);

  if (!enabled) return null;
  return <Bridge />;
}
