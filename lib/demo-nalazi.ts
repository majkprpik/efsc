/**
 * Dummy nalazi s vanjskih izvora — placeholder dok se ne spoji pravo praćenje.
 * Deterministički se vežu na natječaj po indeksu da svaki natječaj ima nešto za pokazati.
 */

export type NalazVrsta = "rok" | "dokumentacija" | "pojasnjenje" | "spomen";

export type Nalaz = {
  id: string;
  vrsta: NalazVrsta;
  naslov: string;
  izvor: string;
  /** Koliko je sati prošlo od objave — UI to pretvara u "prije 2 d". */
  prijeSati: number;
  url: string;
  sazetak: string;
  /** Samo za vrstu "rok": novi datum koji izvor javlja. */
  noviRok?: string;
};

const POOL: Omit<Nalaz, "id">[] = [
  {
    vrsta: "rok",
    naslov: "Izmjena natječajne dokumentacije — produljen rok za prijavu",
    izvor: "fondovieu.gov.hr",
    prijeSati: 5,
    url: "https://fondovieu.gov.hr",
    sazetak:
      "Objavljena je izmjena kojom se rok za podnošenje projektnih prijedloga produljuje. Ostali uvjeti natječaja ostaju nepromijenjeni.",
    noviRok: "30.09.2026.",
  },
  {
    vrsta: "dokumentacija",
    naslov: "Objavljen pročišćeni tekst Uputa za prijavitelje (v2.1)",
    izvor: "strukturnifondovi.hr",
    prijeSati: 29,
    url: "https://strukturnifondovi.hr",
    sazetak:
      "Nova verzija Uputa sadrži izmijenjeni obrazac proračuna i pojašnjene kriterije prihvatljivosti troškova osoblja.",
  },
  {
    vrsta: "pojasnjenje",
    naslov: "Odgovori na pitanja prijavitelja — treći krug",
    izvor: "fondovieu.gov.hr",
    prijeSati: 52,
    url: "https://fondovieu.gov.hr",
    sazetak:
      "Nadležno tijelo objavilo je 14 novih odgovora. Ključno: troškovi vanjskih usluga priznaju se do 30% ukupne vrijednosti projekta.",
  },
  {
    vrsta: "spomen",
    naslov: "Rasprava o kriterijima bodovanja u grupi prijavitelja",
    izvor: "EU fondovi — Telegram",
    prijeSati: 8,
    url: "https://t.me",
    sazetak:
      "Više prijavitelja javlja da se bodovanje inovativnosti tumači strože nego prošli ciklus. Nije službeni izvor — provjeriti kod nadležnog tijela.",
  },
  {
    vrsta: "spomen",
    naslov: "Najava informativne radionice za prijavitelje",
    izvor: "Poduzetnički portal",
    prijeSati: 74,
    url: "https://poduzetnistvo.gov.hr",
    sazetak:
      "Online radionica s pregledom prijavnog obrasca i najčešćih grešaka. Prijava je besplatna, broj mjesta ograničen.",
  },
  {
    vrsta: "dokumentacija",
    naslov: "Dodan obrazac izjave o povezanim poduzećima",
    izvor: "EU Funding & Tenders Portal",
    prijeSati: 96,
    url: "https://ec.europa.eu/info/funding-tenders",
    sazetak:
      "Uz prijavu je od sada obavezan i obrazac izjave o povezanim i partnerskim poduzećima za utvrđivanje statusa MSP-a.",
  },
];

/** Vraća stabilan skup nalaza za dani natječaj. */
export function nalaziZaNatjecaj(natjecajId: string, status: string): Nalaz[] {
  // Zatvoreni i arhivirani natječaji rijetko imaju svježe objave.
  if (status === "arhiva") return [];

  const seed = natjecajId
    .split("")
    .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);

  const broj = status === "zatvoren" ? 1 + (seed % 2) : 2 + (seed % 3);
  const pocetak = seed % POOL.length;

  return Array.from({ length: broj }, (_, i) => {
    const nalaz = POOL[(pocetak + i) % POOL.length];
    return { ...nalaz, id: `${natjecajId}-nalaz-${i}` };
  }).sort((a, b) => a.prijeSati - b.prijeSati);
}

/** Nalazi noviji od 24 h broje se kao "novi" u traci iznad feeda. */
export function brojNovih(nalazi: Nalaz[]): number {
  return nalazi.filter((n) => n.prijeSati < 24).length;
}

/** Prvi nalaz koji javlja pomak roka — veže se na info box gore. */
export function pomakRoka(nalazi: Nalaz[]): Nalaz | undefined {
  return nalazi.find((n) => n.vrsta === "rok" && n.noviRok);
}
