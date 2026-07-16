"use client";

import { useEffect, useRef, useState } from "react";

/** One change block: text removed, text added, and trailing unchanged text after it. */
export type AnimBlock = { id: number; removed: string; added: string; after: string };

/**
 * Plays a "delete then type" animation over the diff blocks: each removed span
 * is struck through and faded, then its added replacement types in character by
 * character. Unchanged text is always fully shown. When the timeline finishes
 * (or the user skips), onDone fires and the parent swaps in the static
 * accept/reject review.
 *
 * Timing is driven by a single rAF loop with a fixed chars-per-second budget,
 * so speed is smooth and frame-rate independent. new Date()/Date.now() are fine
 * here — this is browser code (the ban is only for workflow scripts).
 */
const CHARS_PER_SEC = 220; // reveal speed
const DELETE_FRACTION = 0.4; // deletes run faster than typing

export function DiffAnimator({
  leading,
  blocks,
  onDone,
  skipLabel,
}: {
  leading: string;
  blocks: AnimBlock[];
  onDone: () => void;
  skipLabel: string;
}) {
  // Global progress in "character units" across the whole timeline.
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  // Total timeline length: each block costs (removed * deleteWeight) + added chars.
  const total = blocks.reduce(
    (sum, b) => sum + b.removed.length * DELETE_FRACTION + b.added.length,
    0,
  );

  useEffect(() => {
    let start: number | null = null;
    function frame(ts: number) {
      if (start === null) start = ts;
      const elapsed = (ts - start) / 1000;
      const p = elapsed * CHARS_PER_SEC;
      setProgress(p);
      if (p >= total) {
        finish();
        return;
      }
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    onDone();
  }

  // Keep the currently-animating block in view.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [
    // recompute active index only occasionally to avoid scroll spam
    Math.floor(progress / 8),
  ]);

  // Walk blocks, consuming the progress budget to decide how much of each
  // block's delete/type is currently revealed.
  let budget = progress;
  let activeAssigned = false;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end border-b px-4 py-2.5">
        <button
          onClick={finish}
          className="rounded-md border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
        >
          {skipLabel}
        </button>
      </div>
      <div
        ref={scrollRef}
        className="doc-prose min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap p-6 text-sm leading-relaxed"
      >
        {leading}
        {blocks.map((b) => {
          const deleteCost = b.removed.length * DELETE_FRACTION;
          const addCost = b.added.length;

          // How far through this block are we?
          const deleteProg = Math.max(0, Math.min(deleteCost, budget));
          const afterDelete = budget - deleteCost;
          const addProg = Math.max(0, Math.min(addCost, afterDelete));
          const blockActive = budget > 0 && budget < deleteCost + addCost;

          // deletion: fraction struck through (0→1)
          const deleteRatio = deleteCost > 0 ? deleteProg / deleteCost : 1;
          // typing: how many chars of the addition are visible
          const typedChars = Math.floor(addProg);
          const typed = b.added.slice(0, typedChars);

          budget -= deleteCost + addCost;

          const attachActiveRef = blockActive && !activeAssigned;
          if (attachActiveRef) activeAssigned = true;

          return (
            <span key={b.id} ref={attachActiveRef ? activeRef : undefined}>
              {b.removed && (
                <span
                  className={
                    deleteRatio >= 1
                      ? "text-muted-foreground/40 line-through"
                      : "bg-red-500/15 text-red-700 line-through dark:text-red-300"
                  }
                  style={{ opacity: deleteRatio >= 1 ? 0.4 : 1 }}
                >
                  {b.removed}
                </span>
              )}
              {typed && (
                <span className="bg-green-500/15 text-green-700 dark:text-green-300">
                  {typed}
                  {blockActive && addProg < addCost && (
                    <span className="animate-pulse text-green-600">▍</span>
                  )}
                </span>
              )}
              {b.after}
            </span>
          );
        })}
      </div>
    </div>
  );
}
