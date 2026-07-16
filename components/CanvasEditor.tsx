"use client";

import { useEffect, useRef, useState } from "react";
import { diffWords, type Change } from "diff";
import { Sparkles, Loader2, Check, X, Eye, Pencil, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { loadCanvas, saveCanvas } from "@/app/(app)/projekti/actions";
import { DiffAnimator } from "@/components/DiffAnimator";
import { VersionHistory } from "@/components/VersionHistory";

/** Strip a leading/trailing ```markdown code fence the model sometimes wraps around output. */
function stripFence(s: string): string {
  const m = s.match(/^```[a-z]*\n([\s\S]*?)\n```$/i);
  return m ? m[1] : s;
}

/** A run of changed text (a removed span, its added replacement, or both). */
type Block = { id: number; removed: string; added: string };

/** Group jsdiff parts into: leading unchanged text, then alternating change blocks. */
function toBlocks(parts: Change[]): { unchanged: string; blocks: { block: Block; after: string }[] } {
  let leading = "";
  const blocks: { block: Block; after: string }[] = [];
  let i = 0;
  let id = 0;

  // consume leading unchanged
  while (i < parts.length && !parts[i].added && !parts[i].removed) {
    leading += parts[i].value;
    i++;
  }
  while (i < parts.length) {
    let removed = "";
    let added = "";
    while (i < parts.length && (parts[i].added || parts[i].removed)) {
      if (parts[i].removed) removed += parts[i].value;
      else added += parts[i].value;
      i++;
    }
    let after = "";
    while (i < parts.length && !parts[i].added && !parts[i].removed) {
      after += parts[i].value;
      i++;
    }
    blocks.push({ block: { id: id++, removed, added }, after });
  }
  return { unchanged: leading, blocks };
}

export function CanvasEditor({ projectId }: { projectId: string }) {
  const t = useT();
  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Diff-review state: the AI proposal, its blocks, and per-block decisions.
  const [proposal, setProposal] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [decisions, setDecisions] = useState<Record<number, "accept" | "reject">>({});
  const [showHistory, setShowHistory] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    setProposal(null);
    loadCanvas(projectId).then((r) => {
      if (!active) return;
      if ("content" in r) setContent(r.content ?? "");
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [projectId]);

  // Debounced autosave on manual edits (not while reviewing a proposal).
  function onEdit(value: string) {
    setContent(value);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist(value, "user"), 800);
  }

  async function persist(value: string, source: "user" | "ai") {
    setSaving(true);
    const r = await saveCanvas(projectId, value, source);
    setSaving(false);
    if ("error" in r && r.error) setError(r.error);
  }

  async function runAi() {
    const inst = instruction.trim();
    if (!inst || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/canvas-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, content, instruction: inst }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: t.canvas.greska }));
        setError(err.error ?? t.canvas.greska);
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
      }
      setInstruction("");
      setDecisions({});
      setAnimating(true);
      setProposal(stripFence(acc.trim()));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Assemble the final text from per-block decisions, then save it.
  async function applyDecisions(parts: Change[]) {
    const { unchanged, blocks } = toBlocks(parts);
    let out = unchanged;
    for (const { block, after } of blocks) {
      const decided = decisions[block.id];
      out += decided === "accept" ? block.added : block.removed;
      out += after;
    }
    setContent(out);
    setProposal(null);
    setAnimating(false);
    setDecisions({});
    await persist(out, "ai");
  }

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
      </div>
    );
  }

  // ---- Diff review mode ---------------------------------------------------
  if (proposal !== null) {
    const parts = diffWords(content, proposal);
    const { unchanged, blocks } = toBlocks(parts);
    const allDecided = blocks.every((b) => decisions[b.block.id]);

    // Play the delete/type animation once, then fall through to the static
    // accept/reject review below. Nothing to animate → skip straight to review.
    if (animating && blocks.length > 0) {
      return (
        <DiffAnimator
          leading={unchanged}
          blocks={blocks.map(({ block, after }) => ({ ...block, after }))}
          skipLabel={t.canvas.preskoci}
          onDone={() => setAnimating(false)}
        />
      );
    }

    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4" style={{ color: "var(--section)" }} />
            {t.canvas.pregledIzmjena}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setProposal(null);
                setAnimating(false);
              }}
            >
              {t.canvas.odustani}
            </Button>
            <Button size="sm" disabled={!allDecided || saving} onClick={() => applyDecisions(parts)}>
              {t.canvas.primijeni}
            </Button>
          </div>
        </div>
        <div className="doc-prose min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap p-6 text-sm leading-relaxed">
          {unchanged}
          {blocks.map(({ block, after }) => {
            const decided = decisions[block.id];
            return (
              <span key={block.id}>
                <span className="group relative inline">
                  {block.removed && (
                    <span
                      className={cn(
                        "rounded px-0.5",
                        decided === "accept"
                          ? "text-muted-foreground/40 line-through"
                          : "bg-red-500/15 text-red-700 line-through dark:text-red-300",
                        decided === "reject" && "bg-transparent no-underline",
                      )}
                    >
                      {block.removed}
                    </span>
                  )}
                  {block.added && (
                    <span
                      className={cn(
                        "rounded px-0.5",
                        decided === "reject"
                          ? "hidden"
                          : "bg-green-500/15 text-green-700 dark:text-green-300",
                        decided === "accept" && "bg-transparent",
                      )}
                    >
                      {block.added}
                    </span>
                  )}
                  <span className="ml-1 inline-flex select-none gap-0.5 align-middle">
                    <button
                      onClick={() => setDecisions((d) => ({ ...d, [block.id]: "accept" }))}
                      className={cn(
                        "inline-flex size-4 items-center justify-center rounded",
                        decided === "accept" ? "bg-green-600 text-white" : "bg-muted text-muted-foreground hover:bg-green-600 hover:text-white",
                      )}
                      title={t.canvas.prihvati}
                    >
                      <Check className="size-3" />
                    </button>
                    <button
                      onClick={() => setDecisions((d) => ({ ...d, [block.id]: "reject" }))}
                      className={cn(
                        "inline-flex size-4 items-center justify-center rounded",
                        decided === "reject" ? "bg-red-600 text-white" : "bg-muted text-muted-foreground hover:bg-red-600 hover:text-white",
                      )}
                      title={t.canvas.odbij}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                </span>
                {after}
              </span>
            );
          })}
          {blocks.length === 0 && (
            <span className="text-muted-foreground">{t.canvas.nemaIzmjena}</span>
          )}
        </div>
      </div>
    );
  }

  // ---- Edit mode ----------------------------------------------------------
  return (
    <div className="flex h-full min-w-0">
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {saving ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> {t.canvas.spremam}
            </>
          ) : (
            t.canvas.spremljeno
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={showHistory ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowHistory((h) => !h)}
          >
            <History className="size-4" />
            <span className="ml-1.5">{t.canvas.povijest}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPreview((p) => !p)}>
            {preview ? <Pencil className="size-4" /> : <Eye className="size-4" />}
            <span className="ml-1.5">{preview ? t.canvas.uredi : t.canvas.pregled}</span>
          </Button>
        </div>
      </div>

      {preview ? (
        <div className="doc-prose min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap p-6 text-sm leading-relaxed">
          {content || <span className="text-muted-foreground">{t.canvas.prazno}</span>}
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => onEdit(e.target.value)}
          placeholder={t.canvas.prazno}
          className="min-h-0 flex-1 resize-none bg-transparent p-6 text-sm leading-relaxed outline-none"
        />
      )}

      {error && <div className="border-t bg-red-500/10 px-4 py-2 text-xs text-red-600">{error}</div>}

      <form
        className="flex gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          runAi();
        }}
      >
        <Input
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder={t.canvas.uputaPlaceholder}
          disabled={busy}
          className="bg-card"
        />
        <Button type="submit" size="sm" disabled={busy || !instruction.trim()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          <span className="ml-1.5">{t.canvas.aiIzmijeni}</span>
        </Button>
      </form>
    </div>
      {showHistory && (
        <VersionHistory
          projectId={projectId}
          current={content}
          onClose={() => setShowHistory(false)}
          onRestored={(c) => setContent(c)}
        />
      )}
    </div>
  );
}
