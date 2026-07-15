import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOpenAI, CHAT_MODEL } from "@/lib/openai";
import { docKindFromName, extractText } from "@/lib/extract";
import type { ChatCompletionMessageParam } from "openai/resources/index";

const BUCKET = "orbit-docs";
const MAX_CHARS = 120_000; // safety cap on document text sent to the model

type Body = {
  docKind: "project" | "natjecaj";
  docId: string;
  storagePath: string;
  fileName: string;
  messages: { role: "user" | "assistant"; content: string }[];
};

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

  const body = (await req.json()) as Body;
  const { docKind, docId, storagePath, fileName, messages } = body;
  if (!storagePath || !fileName) {
    return NextResponse.json({ error: "Nedostaju podaci o dokumentu." }, { status: 400 });
  }

  const kind = docKindFromName(fileName);

  // Build the document context (cached text, or a vision image URL)
  let systemContent = "";
  let imageUrl: string | null = null;

  if (kind === "image") {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 600);
    imageUrl = signed?.signedUrl ?? null;
    systemContent =
      `Ti si asistent koji odgovara ISKLJUČIVO na temelju priloženog dokumenta (slika/sken) "${fileName}". ` +
      `Ako informacija nije u dokumentu, jasno reci da je nema. Odgovaraj na hrvatskom.`;
  } else {
    // Try cache first
    let text = "";
    const { data: cached } = await supabase
      .from("document_text")
      .select("content")
      .eq("doc_kind", docKind)
      .eq("doc_id", docId)
      .maybeSingle();

    if (cached?.content) {
      text = cached.content;
    } else {
      const { data: file, error: dlErr } = await supabase.storage
        .from(BUCKET)
        .download(storagePath);
      if (dlErr || !file) {
        return NextResponse.json({ error: "Ne mogu dohvatiti dokument." }, { status: 404 });
      }
      const buf = Buffer.from(await file.arrayBuffer());
      text = await extractText(buf, kind);
      // cache (fire and forget errors)
      await supabase
        .from("document_text")
        .upsert(
          { doc_kind: docKind, doc_id: docId, content: text, char_count: text.length },
          { onConflict: "doc_kind,doc_id" },
        );
    }

    const clipped = text.slice(0, MAX_CHARS);
    systemContent =
      `Ti si asistent koji odgovara ISKLJUČIVO na temelju sadržaja dokumenta "${fileName}". ` +
      `Ako informacija nije u dokumentu, jasno reci da je nema. Odgovaraj sažeto, na hrvatskom.\n\n` +
      `--- SADRŽAJ DOKUMENTA ---\n${clipped}${text.length > MAX_CHARS ? "\n[...skraćeno...]" : ""}`;
  }

  const history: ChatCompletionMessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // For images, attach the image to the last user message
  if (imageUrl && history.length > 0) {
    const last = history[history.length - 1];
    if (last.role === "user") {
      history[history.length - 1] = {
        role: "user",
        content: [
          { type: "text", text: String(last.content) },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      };
    }
  }

  const stream = await openai.chat.completions.create({
    model: CHAT_MODEL,
    stream: true,
    messages: [{ role: "system", content: systemContent }, ...history],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) controller.enqueue(encoder.encode(delta));
        }
      } catch (e) {
        controller.enqueue(encoder.encode(`\n[Greška: ${(e as Error).message}]`));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
