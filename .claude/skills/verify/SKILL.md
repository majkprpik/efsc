---
name: verify
description: Drive the efos app (Next.js + Supabase, Croatian UI) in a browser to verify a change works end-to-end.
---

# Verificiranje efos aplikacije

Aplikacija je iza logina, pa svaka provjera znači: pokreni app → prijavi se → odvezi flow → provjeri bazu.

## Pokretanje

Next 16 dopušta **samo jedan dev server po direktoriju**. Korisnik obično već ima
jedan na `http://localhost:3000` — pokušaj pokrenuti drugi padne s
"Another next dev server is already running" (i drugi port ne pomaže).

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login   # 200 = koristi postojeci
```

Radi na postojećem serveru; nemoj ubijati korisnikov proces.
Dev log je u `.next/dev/logs/next-development.log` (JSON po retku).

## Login

Demo kredencijali su **predpopunjeni** na `/login` — samo klikni Prijava:

```js
await page.goto("http://localhost:3000/login");
await page.getByRole("button", { name: /prijav/i }).first().click();
await page.waitForURL((u) => !u.pathname.includes("/login"));
```

`ana@esfc.hr` / `orbit1234` je member nalog (inicijali AK). `ivan@nexus.hr` je client (portal).

### Portal (`/portal`) — magic link, nema lozinke

`/portal/login` šalje samo magic link, pa `signInWithPassword` ne pomaže, a
service-role ključa nema lokalno (u `.env.local` je samo publishable). Ne
postavljaj lozinku Ivanu — to je trajna izmjena demo baze zbog jednog testa.

Umjesto toga: zatraži OTP i pročitaj token iz `auth.users` (isti onaj koji bi
stigao mailom), pa otvori pravi `/auth/confirm`:

```bash
curl -s -X POST "$URL/auth/v1/otp" -H "apikey: $PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"ivan@nexus.hr","create_user":false}'
```

```sql
select recovery_token from auth.users where email = 'ivan@nexus.hr';
```

```js
await page.goto(`http://localhost:3000/auth/confirm?token_hash=${TOKEN}&type=magiclink&next=/portal`);
```

Token je jednokratan — za svaku novu sesiju ponovi OTP poziv. Drži klijenta i
tim u odvojenim `launchPersistentContext` profilima; dijeljeni profil pomiješa
sesije jer oba koriste isti auth cookie.

## Browser

Playwright nije u projektu, ali chromium je u `~/Library/Caches/ms-playwright/`.
Instaliraj ga u scratchpad, ne u projekt:

```bash
cd "$SCRATCHPAD" && npm init -y && npm i playwright@1.61.1
```

## Provjera podataka

Aplikacija piše u remote Supabase (projekt `efos`, id `ffysjqruxqskmstuzhgp`) — koristi
`mcp__supabase__execute_sql` za provjeru da je zapis stvarno sletio. UI toast nije dokaz.

Testne podatke označi jedinstvenim STAMP-om pa ih obriši i iz baze i iz storagea
(bucket `orbit-docs`; storage se čisti preko supabase-js s login-om, ne SQL-om).

## Gotchas

- **Base UI `nativeButton` warning** iz `ClientPanel`/`PortalAdminView` postoji i
  na čistom `main` — nije regresija. Provjeri stashanjem prije nego ga prijaviš.
- Upload polja na portalu su `input[type=file]`: prvo N su stavke checkliste
  redom, **zadnji je dropzone**. Nisu unutar kartice sa `hasText` — hvataj ih
  preko `.nth(i)`, ne filterom po tekstu.
- **`useT is not defined`** u dev logu je obično stale Turbopack HMR nakon što se
  `lib/i18n/dictionaries.ts` mijenja dok server radi. Provjeri hard reloadom na
  čistom kontekstu — ako stranice vrate 200 bez pageerrora, nije regresija.
- Detalj projekta je dugačak; novododane stavke znaju biti ispod ruba ekrana.
  Koristi `scrollIntoViewIfNeeded()` prije `isVisible()`.
- Brojanje imena dokumenta u DOM-u daje 2 pojave po dokumentu (redak + DocDialog
  trigger). Za provjeru duplikata gledaj bazu, ne DOM.
- Mape: `natjecaji.nat_folder_path` (`_dokumentacija_natjecaja/`) drži dokumente
  samog natječaja; `folder_path` je roditelj u kojem su klijentske podmape projekata.
  `LIKE folder_path || '%'` je istinit za oba — ne koristi ga za razlikovanje.
