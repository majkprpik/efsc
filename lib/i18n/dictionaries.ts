/**
 * UI copy in both languages. Document *contents* are never translated — they
 * are whatever the file says — and the AI answers in the active language
 * because the prompt carries it, not because anything here is translated.
 */

export const LOCALES = ["hr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "hr";
export const LOCALE_COOKIE = "orbit-locale";

export function isLocale(v: string | undefined): v is Locale {
  return v === "hr" || v === "en";
}

const hr = {
  nav: {
    pregled: "Pregled",
    poslovanje: "Poslovanje",
    rad: "Rad",
    analitika: "Analitika",
    dashboard: "Dashboard",
    klijenti: "Klijenti",
    potencijalni: "Potencijalni",
    natjecaji: "Natječaji",
    projekti: "Projekti",
    taskovi: "Taskovi",
    rokovi: "Rokovi",
    financije: "Financije",
    odjava: "Odjava",
    portal: "Portal",
  },
  common: {
    ucitavanje: "Učitavanje…",
    nemaPodataka: "Nema podataka",
    otvori: "otvori",
    preuzmi: "Preuzmi",
    zatvori: "Zatvori",
    spremi: "Spremi",
    odustani: "Odustani",
    svi: "svi",
    klijent: "Klijent",
    rok: "Rok",
    iznos: "Iznos",
    status: "Status",
    napredak: "Napredak",
    dokumentacija: "Dokumentacija",
    kompletno: "kompletno",
    dodaj: "Dodaj",
  },
  statusi: {
    Aktivan: "Aktivan",
    "U pripremi": "U pripremi",
    Kasni: "Kasni",
    Završen: "Završen",
    aktivan: "aktivan",
    zatvoren: "zatvoren",
    arhiva: "arhiva",
    potencijalni: "potencijalni",
    active: "aktivan",
    inactive: "neaktivan",
  } as Record<string, string>,
  prioritet: { h: "hitno", m: "visok", l: "nizak" },
  projekti: {
    naslov: "Projekti",
    prazno: "Nema projekata",
    odaberi: "Odaberi projekt",
    filteri: { svi: "svi", Aktivan: "aktivni", "U pripremi": "priprema", Kasni: "kasni", Završen: "završeni" } as Record<string, string>,
    podNatjecajem: "Projekti pod natječajem",
    taskovi: "Taskovi",
    nemaDokumenata: "Nema dokumenata",
    povuciDatoteku: "Povuci datoteku ili",
    klikniUpload: "klikni za upload",
  },
  natjecaji: {
    naslov: "Natječaji",
    prazno: "Nema natječaja",
    odaberi: "Odaberi natječaj",
    filteri: { svi: "svi", aktivan: "aktivni", zatvoren: "zatvoreni", arhiva: "arhiva" } as Record<string, string>,
    rokPrijave: "Rok prijave",
    klijenata: "Klijenata",
    projekata: "Projekata",
    dokumentiNatjecaja: "Dokumenti natječaja",
    sufinanciranje: "sufinanciranje",
    kratica: { klijenata: "kl." },
    dokumentacija: "Dokumentacija",
    izvori: {
      naslov: "Praćenje izvora",
      prazno: "Nema nalaza s izvora",
      zadnjaProvjera: "Zadnja provjera",
      novihNalaza: { one: "novi nalaz", few: "nova nalaza", many: "novih nalaza" },
      provjeriSad: "Provjeri sad",
      otvoriIzvornik: "Otvori izvornik",
      vrste: {
        rok: "izmjena roka",
        dokumentacija: "nova dokumentacija",
        pojasnjenje: "pojašnjenje",
        spomen: "spomen",
      } as Record<string, string>,
      prijeSati: "prije {n} h",
      prijeDana: "prije {n} d",
      izvorJavlja: "izvor javlja",
    },
  },
  dokument: {
    nijeUploadano: "nije uploadano",
    klikniPregled: "klikni za pregled i AI chat",
    nemaPregleda: "Za ovaj tip dokumenta nema pregleda u browseru.",
    pregledNijeUspio: "Pregled nije uspio",
    ispitajKrozAi: "Sadržaj možeš ispitati kroz AI chat desno ili preuzeti datoteku.",
    neMoguUcitati: "Ne mogu učitati dokument.",
    praznaDatoteka: "Prazna datoteka.",
    nepodrzanTip: "Nepodržan tip datoteke.",
    neMoguDohvatiti: "Ne mogu dohvatiti datoteku.",
    tipovi: { pdf: "PDF", docx: "Word", xlsx: "Excel", txt: "Tekst", csv: "CSV", slika: "Slika" } as Record<string, string>,
  },
  chat: {
    naslov: "AI asistent",
    oDokumentu: "AI o dokumentu",
    /** {file} → naziv datoteke */
    pitajODokumentu: "Pitaj bilo što o dokumentu {file}.",
    prijedloziDokument: [
      "Sažmi ovaj dokument",
      "Koji su ključni rokovi?",
      "Koji su uvjeti prihvatljivosti?",
    ],
    pitajBiloSto: "Pitaj bilo što o ovoj stavci.",
    placeholder: "Pitaj AI…",
    uIzradi: "AI asistent — još u izradi, otvori na desktopu.",
    greska: "Greška.",
  },
  upload: {
    uspjeh: "Dokument uploadan ✓",
    nedostajeDatoteka: "Nedostaje datoteka.",
    nijeUspio: "Upload nije uspio",
  },
  klijenti: {
    naslov: "Klijenti",
    prazno: "Nema klijenata",
    odaberi: "Odaberi klijenta",
    natjecajiSekcija: "Natječaji",
    projektiSekcija: "Projekti",
  },
  potencijalni: {
    naslov: "Potencijalni",
    prazno: "Nema potencijalnih",
    odaberi: "Odaberi priliku",
    aiSazetak: "AI sažetak ideje",
    biljeske: "Bilješke",
    nemaBiljeski: "Nema bilješki",
  },
  taskovi: {
    naslov: "Taskovi",
    prazno: "Nema taskova",
    kolone: { todo: "Za uraditi", doing: "U tijeku", done: "Završeno" } as Record<string, string>,
  },
  rokovi: {
    naslov: "Rokovi",
    prazno: "Nema rokova",
    proslo: "prošlo",
    /** {n} → broj dana */
    zaDana: "za {n}d.",
    danas: "danas",
    koji_se_blize: "Rokovi koji se bliže",
    dani: ["nedjelja", "ponedjeljak", "utorak", "srijeda", "četvrtak", "petak", "subota"],
    mjeseci: [
      "siječnja", "veljače", "ožujka", "travnja", "svibnja", "lipnja",
      "srpnja", "kolovoza", "rujna", "listopada", "studenog", "prosinca",
    ],
  },
  login: {
    podnaslov: "projektni hub · esfc.hr",
    ime: "Ime i prezime (za registraciju)",
    imePlaceholder: "Ana Kovač",
    email: "E-mail",
    lozinka: "Lozinka",
    demoNapomena: "Demo pristup je predpopunjen — samo klikni Prijava.",
    prijava: "Prijava",
    registracija: "Registracija",
  },
  financije: {
    naslov: "Financije",
    ukupnoPrihodi: "Ukupno prihodi",
    naplaceno: "Naplaćeno",
    troskovi: "Troškovi",
    dospjelo: "Dospjelo (kasni)",
    transakcije: "Transakcije",
    prazno: "Nema stavki",
  },
  portal: {
    podnaslov: "Orbit · esfc.hr",
    /** {email} → e-mail prijavljenog korisnika */
    prijavljenKao: "Prijavljen kao {email}",
    odjava: "Odjava",
    dostavljeno: "Dostavljeno",
    sveJeTu: "Sve je tu — javi nam kad si gotov.",
    nemaTrazenih: "Trenutno nema traženih dokumenata. Javit ćemo se kad nešto zatreba.",
    potrebniDokumenti: "Potrebni dokumenti",
    ostaloDostavljeno: "Ostalo dostavljeno",
    dodatno: "dodatno",
    uploadaj: "Uploadaj",
    zamijeni: "Zamijeni",
    saljem: "Šaljem…",
    cekaStatus: "Čeka",
    dostavljenoStatus: "Dostavljeno",
    dokumentZaprimljen: "Dokument zaprimljen",
    /** {file} → naziv datoteke */
    datotekaZaprimljena: "{file} zaprimljen",
    povuciDokumente: "Povuci dokumente ovdje ili klikni za odabir",
    neMorasPogadjati: "Ne moraš pogađati kamo spada — sami ćemo ga svrstati.",
    nedostajeDatoteka: "Nedostaje datoteka.",
    prevelikaDatoteka: "Datoteka je veća od 25 MB.",
    nemasPristup: "Nemaš pristup.",
    nepoznataStavka: "Nepoznata stavka.",
    /** {msg} → poruka iz storagea */
    uploadNijeUspio: "Upload nije uspio: {msg}",
    predajem: "Predajem…",
    predajDokumentaciju: "Gotov sam s dostavom",
    predano: "Dostava predana",
    /** {date} → datum predaje */
    predanoDatum: "Predano {date} — javit ćemo se ako nešto zatreba.",
    predanoMozesJos: "Ako se sjetiš još nečega, slobodno pošalji — predaju ćemo osvježiti.",
    ponistiPredaju: "Poništi predaju",
    predajaPonistena: "Predaja poništena",
    predajaNijeUspjela: "Predaja nije uspjela. Pokušaj ponovno.",
    /** {items} → popis stavki koje fale */
    josNedostaje: "Još nedostaje: {items}",
    chatNaslov: "Pomoć",
    chatPodnaslov: "Pitaj o dokumentaciji",
    chatUvod: "Ne znaš što je neki dokument ili gdje ga nabaviti? Pitaj.",
    chatPlaceholder: "Napiši pitanje…",
    chatGreska: "Greška u komunikaciji s AI-em.",
    chatPrijedlozi: [
      "Što je točno ovaj dokument?",
      "Gdje mogu nabaviti ove papire?",
      "Što mi još nedostaje?",
    ],
    chatOtvori: "Otvori pomoć",
    chatZatvori: "Zatvori",
  },
};

const en: typeof hr = {
  nav: {
    pregled: "Overview",
    poslovanje: "Business",
    rad: "Work",
    analitika: "Analytics",
    dashboard: "Dashboard",
    klijenti: "Clients",
    potencijalni: "Leads",
    natjecaji: "Tenders",
    projekti: "Projects",
    taskovi: "Tasks",
    rokovi: "Deadlines",
    financije: "Finances",
    odjava: "Sign out",
    portal: "Portal",
  },
  common: {
    ucitavanje: "Loading…",
    nemaPodataka: "No data",
    otvori: "open",
    preuzmi: "Download",
    zatvori: "Close",
    spremi: "Save",
    odustani: "Cancel",
    svi: "all",
    klijent: "Client",
    rok: "Deadline",
    iznos: "Amount",
    status: "Status",
    napredak: "Progress",
    dokumentacija: "Documents",
    kompletno: "complete",
    dodaj: "Add",
  },
  statusi: {
    Aktivan: "Active",
    "U pripremi": "In preparation",
    Kasni: "Overdue",
    Završen: "Completed",
    aktivan: "open",
    zatvoren: "closed",
    arhiva: "archived",
    potencijalni: "lead",
    active: "active",
    inactive: "inactive",
  },
  prioritet: { h: "urgent", m: "high", l: "low" },
  projekti: {
    naslov: "Projects",
    prazno: "No projects",
    odaberi: "Select a project",
    filteri: { svi: "all", Aktivan: "active", "U pripremi": "preparation", Kasni: "overdue", Završen: "completed" },
    podNatjecajem: "Projects under this tender",
    taskovi: "Tasks",
    nemaDokumenata: "No documents",
    povuciDatoteku: "Drop a file or",
    klikniUpload: "click to upload",
  },
  natjecaji: {
    naslov: "Tenders",
    prazno: "No tenders",
    odaberi: "Select a tender",
    filteri: { svi: "all", aktivan: "open", zatvoren: "closed", arhiva: "archived" },
    rokPrijave: "Application deadline",
    klijenata: "Clients",
    projekata: "Projects",
    dokumentiNatjecaja: "Tender documents",
    sufinanciranje: "co-financing",
    kratica: { klijenata: "cl." },
    dokumentacija: "Documentation",
    izvori: {
      naslov: "Source monitoring",
      prazno: "No findings from sources",
      zadnjaProvjera: "Last checked",
      novihNalaza: { one: "new finding", few: "new findings", many: "new findings" },
      provjeriSad: "Check now",
      otvoriIzvornik: "Open source",
      vrste: {
        rok: "deadline change",
        dokumentacija: "new documentation",
        pojasnjenje: "clarification",
        spomen: "mention",
      },
      prijeSati: "{n} h ago",
      prijeDana: "{n} d ago",
      izvorJavlja: "source reports",
    },
  },
  dokument: {
    nijeUploadano: "not uploaded",
    klikniPregled: "click to preview and chat with AI",
    nemaPregleda: "This file type has no in-browser preview.",
    pregledNijeUspio: "Preview failed",
    ispitajKrozAi: "You can ask the AI about it on the right, or download the file.",
    neMoguUcitati: "Could not load the document.",
    praznaDatoteka: "Empty file.",
    nepodrzanTip: "Unsupported file type.",
    neMoguDohvatiti: "Could not fetch the file.",
    tipovi: { pdf: "PDF", docx: "Word", xlsx: "Excel", txt: "Text", csv: "CSV", slika: "Image" },
  },
  chat: {
    naslov: "AI assistant",
    oDokumentu: "AI about this document",
    pitajODokumentu: "Ask anything about {file}.",
    prijedloziDokument: [
      "Summarise this document",
      "What are the key deadlines?",
      "What are the eligibility criteria?",
    ],
    pitajBiloSto: "Ask anything about this item.",
    placeholder: "Ask the AI…",
    uIzradi: "AI assistant — still in progress, open on desktop.",
    greska: "Something went wrong.",
  },
  upload: {
    uspjeh: "Document uploaded ✓",
    nedostajeDatoteka: "No file provided.",
    nijeUspio: "Upload failed",
  },
  klijenti: {
    naslov: "Clients",
    prazno: "No clients",
    odaberi: "Select a client",
    natjecajiSekcija: "Tenders",
    projektiSekcija: "Projects",
  },
  potencijalni: {
    naslov: "Leads",
    prazno: "No leads",
    odaberi: "Select a lead",
    aiSazetak: "AI summary of the idea",
    biljeske: "Notes",
    nemaBiljeski: "No notes",
  },
  taskovi: {
    naslov: "Tasks",
    prazno: "No tasks",
    kolone: { todo: "To do", doing: "In progress", done: "Done" },
  },
  rokovi: {
    naslov: "Deadlines",
    prazno: "No deadlines",
    proslo: "passed",
    zaDana: "in {n}d",
    danas: "today",
    koji_se_blize: "Upcoming deadlines",
    dani: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    mjeseci: [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ],
  },
  login: {
    podnaslov: "project hub · esfc.hr",
    ime: "Full name (for sign-up)",
    imePlaceholder: "Ana Kovač",
    email: "E-mail",
    lozinka: "Password",
    demoNapomena: "Demo credentials are pre-filled — just click Sign in.",
    prijava: "Sign in",
    registracija: "Sign up",
  },
  financije: {
    naslov: "Finances",
    ukupnoPrihodi: "Total income",
    naplaceno: "Invoiced",
    troskovi: "Costs",
    dospjelo: "Overdue",
    transakcije: "Transactions",
    prazno: "No entries",
  },
  portal: {
    podnaslov: "Orbit · esfc.hr",
    prijavljenKao: "Signed in as {email}",
    odjava: "Sign out",
    dostavljeno: "Delivered",
    sveJeTu: "Everything's here — let us know when you're done.",
    nemaTrazenih: "No documents requested right now. We'll be in touch when something's needed.",
    potrebniDokumenti: "Required documents",
    ostaloDostavljeno: "Also delivered",
    dodatno: "extra",
    uploadaj: "Upload",
    zamijeni: "Replace",
    saljem: "Sending…",
    cekaStatus: "Pending",
    dostavljenoStatus: "Delivered",
    dokumentZaprimljen: "Document received",
    datotekaZaprimljena: "{file} received",
    povuciDokumente: "Drag documents here, or click to choose",
    neMorasPogadjati: "No need to guess where it belongs — we'll sort it out.",
    nedostajeDatoteka: "No file selected.",
    prevelikaDatoteka: "The file is larger than 25 MB.",
    nemasPristup: "You don't have access.",
    nepoznataStavka: "Unknown item.",
    uploadNijeUspio: "Upload failed: {msg}",
    predajem: "Submitting…",
    predajDokumentaciju: "I'm done delivering",
    predano: "Delivery submitted",
    predanoDatum: "Submitted {date} — we'll be in touch if anything's needed.",
    predanoMozesJos: "If you think of anything else, send it over — we'll refresh the submission.",
    ponistiPredaju: "Undo submission",
    predajaPonistena: "Submission undone",
    predajaNijeUspjela: "Submission failed. Please try again.",
    josNedostaje: "Still missing: {items}",
    chatNaslov: "Help",
    chatPodnaslov: "Ask about the documents",
    chatUvod: "Not sure what a document is or where to get it? Just ask.",
    chatPlaceholder: "Type your question…",
    chatGreska: "Something went wrong talking to the AI.",
    chatPrijedlozi: [
      "What exactly is this document?",
      "Where do I get these papers?",
      "What am I still missing?",
    ],
    chatOtvori: "Open help",
    chatZatvori: "Close",
  },
};

export const dictionaries = { hr, en };
export type Dictionary = typeof hr;

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export type PluralForms = { one: string; few: string; many: string };

/**
 * Croatian needs three forms — 1 nalaz / 2 nalaza / 5 nalaza — and the rule
 * isn't "n === 1": 21 takes `one`, 11 takes `many`. Intl knows the rules, so
 * we don't hand-roll them. English maps its two forms onto the same shape.
 */
export function plural(locale: Locale, n: number, forms: PluralForms): string {
  const rule = new Intl.PluralRules(locale).select(n);
  if (rule === "one") return forms.one;
  if (rule === "few") return forms.few;
  return forms.many;
}

/**
 * Status values live in the database in Croatian ("Aktivan", "Kasni", …) —
 * they're data, not copy. Translate on display and leave the rows alone.
 * Unknown values pass through, so a new status shows up as-is rather than
 * disappearing.
 */
export function tStatus(status: string, locale: Locale): string {
  return getDictionary(locale).statusi[status] ?? status;
}
