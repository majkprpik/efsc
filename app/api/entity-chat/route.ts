import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOpenAI, CHAT_MODEL } from "@/lib/openai";
import { buildEntityContext, ENTITY_LABEL, type EntityKind } from "@/lib/entity-context";
import type { ChatCompletionMessageParam } from "openai/resources/index";

type Body = {
  entityKind: EntityKind;
  entityId: string | null;
  message: string;
};

const MAX_HISTORY = 30; // last N messages sent to the model

/** Load stored history for an entity (shared per item). */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Neautoriziran." }, { status: 401 });

  const url = new URL(req.url);
  const entityKind = url.searchParams.get("entityKind");
  const entityId = url.searchParams.get("entityId");
  if (!entityKind) return NextResponse.json({ messages: [] });

  let q = supabase
    .from("chat_messages")
    .select("role, content, author_name")
    .eq("entity_kind", entityKind)
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Neautoriziran." }, { status: 401 });

  const { entityKind, entityId, message } = (await req.json()) as Body;
  if (!entityKind || !message?.trim()) {
    return NextResponse.json({ error: "Nedostaje poruka." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  // 1. persist the user message
  await supabase.from("chat_messages").insert({
    entity_kind: entityKind,
    entity_id: entityId,
    role: "user",
    content: message,
    author_id: user.id,
    author_name: profile?.name ?? null,
  });

  // 2. load history (shared per item)
  let histQuery = supabase
    .from("chat_messages")
    .select("role, content")
    .eq("entity_kind", entityKind)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY);
  histQuery = entityId ? histQuery.eq("entity_id", entityId) : histQuery.is("entity_id", null);
  const { data: hist } = await histQuery;
  const history = (hist ?? []).reverse();

  // 3. entity context → system prompt
  const context = await buildEntityContext(entityKind, entityId);
  const systemContent =
    `Ti si asistent u alatu za vođenje EU projekata (ESFC). Odgovaraš na hrvatskom, sažeto i konkretno, ` +
    `na temelju podataka o ${ENTITY_LABEL[entityKind]} niže. Ako nešto nije u podacima, reci da nemaš tu informaciju.\n\n` +
    `--- PODACI ---\n${context}`;

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  const stream = await openai.chat.completions.create({
    model: CHAT_MODEL,
    stream: true,
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let full = "";
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            full += delta;
            controller.enqueue(encoder.encode(delta));
          }
        }
      } catch (e) {
        const msg = `\n[Greška: ${(e as Error).message}]`;
        full += msg;
        controller.enqueue(encoder.encode(msg));
      }
      // 4. persist the assistant reply
      if (full.trim()) {
        await supabase.from("chat_messages").insert({
          entity_kind: entityKind,
          entity_id: entityId,
          role: "assistant",
          content: full,
        });
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
