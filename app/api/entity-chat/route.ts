import { NextResponse } from "next/server";
import { getLocale } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeam } from "@/lib/auth-guard";
import { getOpenAI, CHAT_MODEL } from "@/lib/openai";
import {
  buildEntityContext,
  ENTITY_LABEL,
  isEntityKind,
  isUuid,
  requiresId,
} from "@/lib/entity-context";
import type { ChatCompletionMessageParam } from "openai/resources/index";

type Body = {
  entityKind: string;
  entityId: string | null;
  message: string;
};

const MAX_HISTORY = 30; // last N messages sent to the model

/** Validate (kind, id): returns null if valid, or an error string. */
function validate(kind: unknown, id: unknown): string | null {
  if (!isEntityKind(kind)) return "Nepoznat tip entiteta.";
  if (requiresId(kind)) {
    if (!isUuid(id)) return "Neispravan ID entiteta.";
  } else if (id !== null && id !== undefined && !isUuid(id)) {
    return "Neispravan ID entiteta.";
  }
  return null;
}

/** Load stored history for an entity (shared per item). */
export async function GET(req: Request) {
  const supabase = await createClient();
  // Interni chat — klijenti s portala nemaju pristup.
  if (!(await requireTeam())) {
    return NextResponse.json({ error: "Neautoriziran." }, { status: 401 });
  }

  const url = new URL(req.url);
  const entityKind = url.searchParams.get("entityKind");
  const entityId = url.searchParams.get("entityId");
  if (validate(entityKind, entityId)) return NextResponse.json({ messages: [] });

  let q = supabase
    .from("chat_messages")
    .select("role, content, author_name")
    .eq("entity_kind", entityKind!)
    .order("created_at", { ascending: true });
  q = entityId ? q.eq("entity_id", entityId) : q.is("entity_id", null);
  const { data } = await q;
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(req: Request) {
  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json(
      { error: "OpenAI ključ nije postavljen (OPENAI_API_KEY). Dodaj ga u .env.local / Vercel." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  // Interni chat — klijenti s portala nemaju pristup.
  const claims = await requireTeam();
  if (!claims) return NextResponse.json({ error: "Neautoriziran." }, { status: 401 });

  const { entityKind, entityId, message } = (await req.json()) as Body;
  const validationError = validate(entityKind, entityId);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  if (!message?.trim()) return NextResponse.json({ error: "Nedostaje poruka." }, { status: 400 });

  const kind = entityKind as Body["entityKind"] & keyof typeof ENTITY_LABEL;
  const id = entityId ?? null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", claims.sub)
    .single();

  // Load existing history (NOT yet including this new message)
  let histQuery = supabase
    .from("chat_messages")
    .select("role, content")
    .eq("entity_kind", kind)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY);
  histQuery = id ? histQuery.eq("entity_id", id) : histQuery.is("entity_id", null);
  const { data: hist } = await histQuery;
  const history = (hist ?? []).reverse();

  const context = await buildEntityContext(kind, id);
  // The assistant answers in whatever language the UI is set to.
  const locale = await getLocale();
  const lang = locale === "en" ? "engleskom" : "hrvatskom";
  const systemContent =
    `Ti si asistent u alatu za vođenje EU projekata (ESFC). Odgovaraš na ${lang}, sažeto i konkretno, ` +
    `na temelju podataka o ${ENTITY_LABEL[kind]} niže. Ako nešto nije u podacima, reci da nemaš tu informaciju.\n\n` +
    `--- PODACI ---\n${context}`;

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: message },
  ];

  // Start the completion BEFORE persisting anything — if OpenAI rejects
  // (bad key, rate limit), we return an error and leave no orphan user message.
  let stream;
  try {
    stream = await openai.chat.completions.create({ model: CHAT_MODEL, stream: true, messages });
  } catch (e) {
    return NextResponse.json({ error: `AI greška: ${(e as Error).message}` }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let full = "";
      let failed = false;
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            full += delta;
            controller.enqueue(encoder.encode(delta));
          }
        }
      } catch (e) {
        failed = true;
        controller.enqueue(encoder.encode(`\n[Greška: ${(e as Error).message}]`));
      }
      // Persist user + assistant only on a clean, non-empty response — so the
      // stored history never contains an error string or a dangling question.
      if (!failed && full.trim()) {
        await supabase.from("chat_messages").insert([
          {
            entity_kind: kind,
            entity_id: id,
            role: "user",
            content: message,
            author_id: claims.sub,
            author_name: profile?.name ?? null,
          },
          { entity_kind: kind, entity_id: id, role: "assistant", content: full },
        ]);
      }
      controller.close();
    },
  });

  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
