"use client";

import { useEffect, useState } from "react";
import { diffWords } from "diff";
import { X, RotateCcw, Save, Sparkles, User, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useT, useLocale } from "@/lib/i18n/client";
import {
  listVersions,
  getVersionContent,
  saveNamedVersion,
  restoreVersion,
  type VersionRow,
} from "@/app/(app)/projekti/actions";

/**
 * Version history drawer — "git for people who aren't devs". Lists every stored
 * version (silent auto-snapshots + named checkpoints) newest first, shows who
 * changed what and when, diffs any version against the current content, and
 * restores. `current` is what's live in the editor right now.
 */
export function VersionHistory({
  projectId,
  current,
  onClose,
  onRestored,
}: {
  projectId: string;
  current: string;
  onClose: () => void;
  onRestored: (content: string) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const [versions, setVersions] = useState<VersionRow[] | null>(null);
  const [selected, setSelected] = useState<VersionRow | null>(null);
  const [selectedContent, setSelectedContent] = useState<string | null>(null);
  const [saveName, setSaveName] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const r = await listVersions(projectId);
    setVersions(r.versions);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function openVersion(v: VersionRow) {
    setSelected(v);
    if (v.isCurrent) {
      setSelectedContent(current);
      return;
    }
    setSelectedContent(null);
    const r = await getVersionContent(v.id);
    setSelectedContent("content" in r ? r.content : "");
  }

  async function doSaveNamed() {
    const name = saveName.trim();
    if (!name || busy) return;
    setBusy(true);
    const r = await saveNamedVersion(projectId, name);
    setBusy(false);
    if ("error" in r && r.error) return toast.error(r.error);
    setSaveName("");
    toast.success(t.canvas.verzijaSpremljena);
    refresh();
  }

  async function doRestore(v: VersionRow) {
    setBusy(true);
    const r = await restoreVersion(projectId, v.id);
    setBusy(false);
    if ("error" in r && r.error) return toast.error(r.error);
    if ("content" in r && typeof r.content === "string") {
      onRestored(r.content);
      toast.success(t.canvas.vraceno);
      setSelected(null);
      setSelectedContent(null);
      refresh();
    }
  }

  function stamp(iso: string) {
    return new Date(iso).toLocaleString(locale, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="flex h-full w-[340px] shrink-0 flex-col border-l bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="text-sm font-semibold">{t.canvas.povijestNaslov}</div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      {/* Save named checkpoint */}
      <form
        className="flex gap-2 border-b p-3"
        onSubmit={(e) => {
          e.preventDefault();
          doSaveNamed();
        }}
      >
        <Input
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder={t.canvas.nazivVerzije}
          className="h-8 text-xs"
        />
        <Button type="submit" size="sm" disabled={busy || !saveName.trim()} title={t.canvas.spremiVerziju}>
          <Save className="size-3.5" />
        </Button>
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {versions === null ? (
          <div className="flex h-24 items-center justify-center text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : versions.length <= 1 ? (
          <>
            <VersionItem v={versions[0]} selected={false} onOpen={openVersion} t={t} stamp={stamp} />
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">{t.canvas.nemaVerzija}</p>
          </>
        ) : (
          versions.map((v) => (
            <VersionItem
              key={v.id}
              v={v}
              selected={selected?.id === v.id}
              onOpen={openVersion}
              t={t}
              stamp={stamp}
            />
          ))
        )}
      </div>

      {/* Diff of the selected version vs. current */}
      {selected && !selected.isCurrent && (
        <div className="flex max-h-[45%] min-h-0 flex-col border-t">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t.canvas.usporedbaSTrenutnom}
            </span>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => doRestore(selected)}>
              <RotateCcw className="mr-1 size-3.5" />
              {t.canvas.vrati}
            </Button>
          </div>
          <div className="doc-prose min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap p-4 text-xs leading-relaxed">
            {selectedContent === null ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <VersionDiff older={selectedContent} current={current} identicalLabel={t.canvas.identicno} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VersionItem({
  v,
  selected,
  onOpen,
  t,
  stamp,
}: {
  v: VersionRow;
  selected: boolean;
  onOpen: (v: VersionRow) => void;
  t: ReturnType<typeof useT>;
  stamp: (iso: string) => string;
}) {
  return (
    <button
      onClick={() => onOpen(v)}
      className={cn(
        "flex w-full items-start gap-2.5 border-b px-4 py-2.5 text-left hover:bg-muted/50",
        selected && "bg-muted",
      )}
    >
      <span
        className={cn(
          "mt-1 size-2 shrink-0 rounded-full",
          v.isCurrent ? "bg-green-500" : "bg-muted-foreground/40",
        )}
        style={v.isCurrent ? { background: "var(--section)" } : undefined}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">
            {v.isCurrent ? t.canvas.trenutna : v.label || stamp(v.createdAt)}
          </span>
          {!v.isCurrent && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded px-1 py-px text-[10px]",
                v.source === "ai"
                  ? "bg-violet-500/15 text-violet-600 dark:text-violet-300"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {v.source === "ai" ? <Sparkles className="size-2.5" /> : <User className="size-2.5" />}
              {v.source === "ai" ? t.canvas.verzijaAi : t.canvas.verzijaRucno}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {v.isCurrent ? t.canvas.sada : stamp(v.createdAt)}
          {v.authorName ? ` · ${v.authorName}` : ""}
        </span>
      </span>
      {selected && <Check className="mt-1 size-3.5 shrink-0 text-muted-foreground" />}
    </button>
  );
}

/** Word-level diff of an older version against the current content. */
function VersionDiff({
  older,
  current,
  identicalLabel,
}: {
  older: string;
  current: string;
  identicalLabel: string;
}) {
  if (older === current) {
    return <span className="text-muted-foreground">{identicalLabel}</span>;
  }
  const parts = diffWords(older, current);
  return (
    <>
      {parts.map((p, i) => (
        <span
          key={i}
          className={cn(
            p.added && "rounded bg-green-500/15 text-green-700 dark:text-green-300",
            p.removed && "rounded bg-red-500/15 text-red-700 line-through dark:text-red-300",
          )}
        >
          {p.value}
        </span>
      ))}
    </>
  );
}
