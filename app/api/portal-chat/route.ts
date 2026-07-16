import { NextResponse } from "next/server";
import { getLocale } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext, getTeamPortalContext } from "@/app/portal/actions";
import { getOpenAI, CHAT_MODEL } from "@/lib/openai";
import { buildPortalContext } from "@/lib/portal-context";
import type { ChatCompletionMessageParam } from "openai/resources/index";

const MAX_HISTORY = 30;

/**
 * Chat za klijente na portalu.
 *
 * Odvojeno od /api/entity-chat, koji radi requireTeam() i klijenta odbija s 401.
 * Ovdje autorizaciju daje getPortalContext(): vraća klijenta vezanog na profil,
 * pa entity_id nikad ne dolazi iz requesta i klijent ne može pitati o tuđim
 * podacima ni podmetnutim ID-em.
 */
const ENTITY_KIND = "portal";

/**
 * Čiji je ovo razgovor: klijentov vlastiti, ili ga član tima gleda iz pregleda.
 *
 * `?clientId=` prihvaćamo samo od tima — klijentu se ignorira, pa mu podmetnuti
 * ID ne otvara tuđi razgovor.
 */
async function resolve(req: Request) {
  const ctx = await getPortalContext();
  if (ctx) return { clientId: ctx.client.id, profile: ctx.profile, asTeam: false };

  const clientId = new URL(req.url).searchParams.get("clientId");
  if (!clientId) return null;

  const team = await getTeamPortalContext(clientId);
  if (!team) return null;
  return { clientId: team.client.id, profile: team.profile, asTeam: true };
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const who = await resolve(req);
  if (!who) return NextResponse.json({ messages: [] });

  const { data } = await supabase
    .from("chat_messages")
    .select("role, content, author_kind, author_name")
    .eq("entity_kind", ENTITY_KIND)
    .eq("entity_id", who.clientId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ messages: data ?? [] });
}

/**
 * Član tima piše u klijentov portal-chat.
 *
 * Ne ide AI-u: asistent odgovara klijentu na njegova pitanja, a ovo je poruka
 * tima klijentu. Zato se samo upiše u razgovor, s imenom pošiljatelja koje
 * klijent vidi — inače bi mu se u vlastitom chatu pojavio tekst koji nije napisao.
 */
export async function PUT(req: Request) {
  const supabase = await createClient();
  const who = await resolve(req);
  if (!who?.asTeam) return NextResponse.json({ error: "Neautoriziran." }, { status: 401 });

  const { message } = (await req.json()) as { message?: string };
  if (!message?.trim()) {
    return NextResponse.json({ error: "Nedostaje poruka." }, { status: 400 });
  }

  const { error } = await supabase.from("chat_messages").insert({
    entity_kind: ENTITY_KIND,
    entity_id: who.clientId,
    role: "user",
    content: message.trim(),
    author_id: who.profile.id ?? null,
    author_name: who.profile.name || who.profile.email,
    author_kind: "team",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json(
      { error: "AI trenutno nije dostupan." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const ctx = await getPortalContext();
  if (!ctx) return NextResponse.json({ error: "Neautoriziran." }, { status: 401 });

  const { message } = (await req.json()) as { message?: string };
  if (!message?.trim()) {
    return NextResponse.json({ error: "Nedostaje poruka." }, { status: 400 });
  }

  const clientId = ctx.client.id;

  const { data: hist } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("entity_kind", ENTITY_KIND)
    .eq("entity_id", clientId)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY);
  const history = (hist ?? []).reverse();

  const context = await buildPortalContext(clientId);
  const locale = await getLocale();
  const lang = locale === "en" ? "engleskom" : "hrvatskom";

  // Klijent nije naš zaposlenik: pita "što je ovo" i "gdje to nabaviti", pa
  // asistent mora znati objasniti dokument, a ne samo pročitati listu.
  const systemContent =
    `Ti si asistent na klijentskom portalu konzultantske firme za EU fondove (ESFC). ` +
    `Razgovaraš s klijentom koji prikuplja dokumentaciju. Odgovaraš na ${lang}, ` +
    `kratko, jednostavno i ljubazno — kao osoba koja pomaže, bez žargona.\n\n` +
    `Što radiš:\n` +
    `- Objasniš što je pojedini traženi dokument i čemu služi.\n` +
    `- Kažeš gdje se u Hrvatskoj obično nabavlja (npr. sudski registar, FINA, ` +
    `porezna uprava, HZMO, javni bilježnik) i otprilike kako. Ako nisi siguran ` +
    `za točnu instituciju ili postupak, reci neka provjeri s nama — nemoj izmišljati.\n` +
    `- Kažeš što je klijentu još ostalo dostaviti.\n\n` +
    `Pravila:\n` +
    `- Nikad ne izmišljaj rokove, iznose ni uvjete kojih nema u podacima niže. ` +
    `Ako te pitaju nešto čega nema, reci da nemaš tu informaciju i neka pitaju svog ` +
    `kontakt osobu u ESFC-u.\n` +
    `- Ne obećavaj da je dokumentacija prihvaćena — to potvrđuje tim, ne ti.\n` +
    `- Ne spominji interne podatke, druge klijente ni cijene.\n\n` +
    `--- PODACI O KLIJENTU ---\n${context}`;

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: message },
  ];

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
      // Kao i u entity-chatu: spremamo tek na čist odgovor, da povijest ne
      // ostane s pitanjem bez odgovora ili s tekstom greške.
      if (!failed && full.trim()) {
        await supabase.from("chat_messages").insert([
          {
            entity_kind: ENTITY_KIND,
            entity_id: clientId,
            role: "user",
            content: message,
            author_id: ctx.profile.id ?? null,
            author_name: ctx.profile.name ?? null,
          },
          { entity_kind: ENTITY_KIND, entity_id: clientId, role: "assistant", content: full },
        ]);
      }
      controller.close();
    },
  });

  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
