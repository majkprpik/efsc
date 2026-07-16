import { NextResponse } from "next/server";
import { getLocale } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeam } from "@/lib/auth-guard";
import { getOpenAI, CHAT_MODEL } from "@/lib/openai";
import { buildEntityContext, isUuid } from "@/lib/entity-context";
import { getDocText } from "@/lib/doc-text";

const MAX_DOC_CHARS = 40_000; // per uploaded document
const MAX_TOTAL_CHARS = 120_000; // safety cap on all uploaded text sent to the model

type Body = {
  projectId: string;
  content: string; // current canvas markdown
  instruction: string; // what the team wants changed
};

/**
 * AI edit of a project's "prijava" document. Unlike the chat routes, this does
 * NOT converse — it returns the FULL revised markdown document. The client
 * diffs old vs. new locally and lets the team accept/reject per paragraph, so
 * the model never has to produce a patch format (which it reliably mangles).
 */
export async function POST(req: Request) {
  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json(
      { error: "OpenAI ključ nije postavljen (OPENAI_API_KEY). Dodaj ga u .env.local / Vercel." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  // Interna ruta — klijenti s portala nemaju pristup.
  if (!(await requireTeam())) {
    return NextResponse.json({ error: "Neautoriziran." }, { status: 401 });
  }

  const { projectId, content, instruction } = (await req.json()) as Body;
  if (!isUuid(projectId)) {
    return NextResponse.json({ error: "Neispravan projekt." }, { status: 400 });
  }
  if (!instruction?.trim()) {
    return NextResponse.json({ error: "Nedostaje uputa." }, { status: 400 });
  }

  // Project context (client, tender, tasks) + the client's uploaded documents,
  // so the AI writes the application from real source material.
  const entityContext = await buildEntityContext("projekt", projectId);

  const { data: docs } = await supabase
    .from("project_docs")
    .select("id, name, storage_path, uploaded")
    .eq("project_id", projectId)
    .eq("uploaded", true);

  let uploadedText = "";
  for (const d of docs ?? []) {
    if (!d.storage_path || uploadedText.length >= MAX_TOTAL_CHARS) continue;
    const text = await getDocText(supabase, "project", d.id, d.storage_path, d.name);
    if (!text.trim()) continue;
    const clip = text.slice(0, MAX_DOC_CHARS);
    uploadedText += `\n### ${d.name}\n${clip}${text.length > MAX_DOC_CHARS ? "\n[...skraćeno...]" : ""}\n`;
  }
  uploadedText = uploadedText.slice(0, MAX_TOTAL_CHARS);

  const locale = await getLocale();
  const lang = locale === "en" ? "engleskom" : "hrvatskom";

  const systemContent =
    `Ti si asistent koji piše i uređuje prijavu na natječaj, u Markdownu, na ${lang}. ` +
    `Dobivaš trenutni dokument, podatke o projektu i sadržaj klijentove dokumentacije. ` +
    `Primijeni korisnikovu uputu i vrati CIJELI izmijenjeni dokument. ` +
    `VAŽNO: vrati ISKLJUČIVO sadržaj dokumenta u Markdownu — bez uvoda, objašnjenja, komentara ni code-fence ograda. ` +
    `Ne dodaji rečenice o sebi, o modelu, o datumu treniranja ni bilo kakav meta-tekst — samo sadržaj prijave. ` +
    `Ne izmišljaj podatke kojih nema u izvorima; ako nešto nedostaje, ostavi jasnu oznaku tipa "[dopuniti: ...]". ` +
    `Mijenjaj samo ono što uputa traži i zadrži ostatak dokumenta nepromijenjenim.\n\n` +
    `--- PODACI O PROJEKTU ---\n${entityContext}\n\n` +
    `--- KLIJENTOVA DOKUMENTACIJA ---\n${uploadedText || "(nema ekstrahiranog teksta)"}\n\n` +
    `--- TRENUTNI DOKUMENT ---\n${content || "(prazan dokument)"}`;

  let stream;
  try {
    stream = await openai.chat.completions.create({
      model: CHAT_MODEL,
      stream: true,
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: instruction },
      ],
    });
  } catch (e) {
    return NextResponse.json({ error: `AI greška: ${(e as Error).message}` }, { status: 502 });
  }

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

  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
