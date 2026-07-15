import "server-only";
import { getOpenAI, CHAT_MODEL } from "@/lib/openai";

export type RequestItem = { id: string; name: string; description: string | null };

export type MatchResult = {
  /** id stavke s liste, ili null ako AI ne zna kamo spada */
  requestId: string | null;
  /** ok = dokument izgleda potpun; issue = nešto fali/ne štima */
  status: "ok" | "issue" | "unknown";
  /** kratka poruka klijentu na hrvatskom */
  note: string;
};

/**
 * Odredi kojoj stavci s checkliste uploadani dokument odgovara i je li potpun.
 *
 * Namjerno NE odlučuje ništa neopozivo: rezultat je prijedlog koji tim vidi u
 * Orbitu. AI koji sam sebi potvrdi da je dokumentacija u redu je gori od
 * praznog polja, jer krivu prijavu nitko ne pogleda dvaput.
 */
export async function matchDocument(
  fileName: string,
  text: string,
  items: RequestItem[],
): Promise<MatchResult> {
  const openai = getOpenAI();
  if (!openai || items.length === 0) {
    return { requestId: null, status: "unknown", note: "" };
  }

  const lista = items
    .map((i) => `- id=${i.id} | ${i.name}${i.description ? ` — ${i.description}` : ""}`)
    .join("\n");

  // Duge dokumente režemo: za prepoznavanje tipa dokumenta prvih par tisuća
  // znakova nosi gotovo sve (naslov, zaglavlje, tablica), a puni tekst bi bio
  // desetak puta skuplji po uploadu.
  const excerpt = text.slice(0, 6000);

  // Model nema pojam o današnjem datumu i bez ovoga tekuću godinu prijavljuje
  // kao "datum iz budućnosti" — lažni alarm na svakoj svježoj potvrdi.
  const danas = new Date().toISOString().slice(0, 10);

  try {
    const res = await openai.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Ti si asistent u konzultantskoj firmi za EU fondove. Dobiješ naziv i tekst " +
            "dokumenta koji je klijent uploadao, te listu traženih dokumenata. " +
            "Odredi kojoj stavci dokument odgovara.\n\n" +
            `Današnji datum je ${danas}. Datumi u dokumentu koji su prije današnjeg ` +
            "datuma su prošlost i sasvim su normalni — ne prijavljuj ih kao problem.\n\n" +
            "Vrati JSON: {\"requestId\": string|null, \"status\": \"ok\"|\"issue\"|\"unknown\", \"note\": string}\n\n" +
            "Pravila:\n" +
            "- requestId mora biti točan id s liste, ili null ako nijedna ne odgovara.\n" +
            "- Ako nisi siguran, requestId=null i status=\"unknown\". Bolje ne pogoditi nego pogriješiti.\n" +
            "- status=\"issue\" SAMO ako u tekstu vidiš konkretan nedostatak: izričito " +
            "nedostaje potpis/pečat, prazna obavezna polja, ili je dokument stariji od " +
            "roka navedenog u opisu stavke.\n" +
            "- Ako nemaš dokaz za problem, status=\"ok\" i note=\"\". Ne nagađaj nedostatke.\n" +
            "- note: jedna kratka rečenica na hrvatskom, direktno klijentu. Bez uvoda. " +
            "Prazan string kad je sve u redu.",
        },
        {
          role: "user",
          content: `Tražena dokumentacija:\n${lista}\n\nUploadana datoteka: ${fileName}\n\nTekst dokumenta:\n${excerpt}`,
        },
      ],
    });

    const raw = res.choices[0]?.message?.content;
    if (!raw) return { requestId: null, status: "unknown", note: "" };

    const parsed = JSON.parse(raw) as Partial<MatchResult>;

    // Model može halucinirati id koji ne postoji — provjeri da je stvarno s liste.
    const valid = items.some((i) => i.id === parsed.requestId);

    return {
      requestId: valid ? parsed.requestId! : null,
      status:
        parsed.status === "ok" || parsed.status === "issue" ? parsed.status : "unknown",
      note: typeof parsed.note === "string" ? parsed.note.slice(0, 300) : "",
    };
  } catch {
    // AI je pomoć, ne uvjet — upload mora proći i kad OpenAI padne.
    return { requestId: null, status: "unknown", note: "" };
  }
}
