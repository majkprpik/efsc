"use client";

import { CheckCircle2, Circle, FileText } from "lucide-react";
import { PortalUploadButton, PortalDropzone, AiBadge } from "@/components/PortalUpload";
import { PortalSubmit } from "@/components/PortalSubmit";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/client";
import { shortDate } from "@/lib/ui";

export type ChecklistItem = {
  id: string;
  name: string;
  description: string | null;
  required: boolean;
  uploaded: boolean;
  uploaded_at: string | null;
  original_name: string | null;
  ai_status: string | null;
  ai_note: string | null;
};

/**
 * Klijentova lista dokumenata. Dijele je pravi portal i timski pregled
 * (/portal-admin/pregled), pa je `readOnly` jedina razlika između njih —
 * inače bi se prikazi razišli čim se jedan promijeni.
 */
export function PortalChecklist({
  items,
  readOnly = false,
  submittedAt = null,
}: {
  items: ChecklistItem[];
  readOnly?: boolean;
  submittedAt?: string | null;
}) {
  const t = useT();
  const required = items.filter((i) => i.required);
  const done = required.filter((i) => i.uploaded).length;
  const pct = required.length ? Math.round((done / required.length) * 100) : 100;
  const extra = items.filter((i) => !i.required);

  return (
    <>
      {required.length > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-baseline justify-between">
              <div className="text-sm font-medium">{t.portal.dostavljeno}</div>
              <div className="text-sm text-muted-foreground">
                {done} / {required.length}
              </div>
            </div>
            <Progress value={pct} />
          </CardContent>
        </Card>
      )}

      {!readOnly && (
        <PortalSubmit
          submittedAt={submittedAt}
          allDone={required.length > 0 && done === required.length}
        />
      )}

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t.portal.nemaTrazenih}
          </CardContent>
        </Card>
      ) : (
        <>
          <h2 className="mb-3 text-sm font-medium">{t.portal.potrebniDokumenti}</h2>
          <div className="mb-8 flex flex-col gap-2">
            {required.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-start gap-3 py-4">
                  {item.uploaded ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600 dark:text-green-500" />
                  ) : (
                    <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground/40" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{item.name}</div>
                    {item.description && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    )}
                    {item.uploaded && item.original_name && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <FileText className="size-3" />
                        <span className="truncate">{item.original_name}</span>
                        {item.uploaded_at && <span>· {shortDate(item.uploaded_at)}</span>}
                      </div>
                    )}
                    <AiBadge status={item.ai_status} note={item.ai_note} />
                  </div>

                  {readOnly ? (
                    <Badge variant="secondary">
                      {item.uploaded ? t.portal.dostavljenoStatus : t.portal.cekaStatus}
                    </Badge>
                  ) : (
                    <PortalUploadButton
                      requestId={item.id}
                      label={item.uploaded ? t.portal.zamijeni : t.portal.uploadaj}
                      variant={item.uploaded ? "outline" : "default"}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {extra.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-medium">{t.portal.ostaloDostavljeno}</h2>
          <div className="mb-8 flex flex-col gap-2">
            {extra.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-center gap-3 py-3">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1 truncate text-sm">{item.name}</div>
                  <Badge variant="secondary">{t.portal.dodatno}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {!readOnly && <PortalDropzone />}
    </>
  );
}
