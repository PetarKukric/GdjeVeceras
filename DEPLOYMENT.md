# 🚀 Kako objaviti Gdje Večeras (sajt → aplikacija)

Ovaj vodič te vodi kroz cijeli postupak: od lokalnog projekta do live sajta
koji se na telefonu instalira kao aplikacija (PWA).

---

## Korak 1 — GitHub (repozitorij)

1. Napravi nalog na https://github.com (ako nemaš)
2. Napravi novi repo (npr. `bl-events`)
3. U PowerShell-u, u folderu projekta:

```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TVOJ-USERNAME/bl-events.git
git push -u origin main
```

---

## Korak 2 — Turso (baza u oblaku, besplatno)

SQLite baza lokalno ne radi na serveru — Turso je SQLite u oblaku.

**Najlakši put (bez instalacije, sve preko web preglednika):**

1. Otvori https://turso.tech → **Sign up** (najlakše preko GitHub dugmeta)
2. U dashboard-u klikni **Create Database**:
   - Ime: `bl-events`
   - Region: **Frankfurt (fra)** ako se nudi
3. Otvori kreiranu bazu i kopiraj:
   - **URL** — izgleda kao `libsql://bl-events-tvoj-username.turso.io`
   - **Token** — nađi opciju za kreiranje tokena (baza → settings/API tokens) → Create
4. Sačuvaj oboje u Notepad — token se prikazuje **samo jednom**!

**Alternativa preko CLI-ja (PowerShell):**

```powershell
winget install tursodatabase.turso
turso auth login
turso db create bl-events
turso db show bl-events          # -> URL (libsql://...)
turso db tokens create bl-events # -> auth token (čuvaj ga!)
```

Zapiši `URL` i `token` — trebat će ti za Vercel (Korak 3).

---

## Korak 3 — Vercel (hosting, besplatan)

1. Registruj se na https://vercel.com (preko GitHub naloga)
2. **Add New → Project → Import** → izaberi svoj `bl-events` repo
3. Prije deploy-a, dodaj **Environment Variables**:

| Ime | Vrijednost |
|---|---|
| `DATABASE_URL` | `libsql://bl-events-....turso.io` (iz Turso-a) |
| `DATABASE_AUTH_TOKEN` | token iz Turso-a |
| `JWT_SECRET` | SNAŽAN nasumičan ključ (npr. `openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | `https://tvoj-domen.vercel.app` |
| `ADMIN_EMAIL` | `gdjevecerasbusiness@gmail.com` |
| `EMAIL_HOST` | npr. `smtp.resend.com` |
| `EMAIL_PORT` | `587` |
| `EMAIL_USER` | `resend` |
| `EMAIL_PASS` | API ključ sa Resend-a |
| `EMAIL_FROM` | `gdjevecerasbusiness@gmail.com` (mora biti verifikovan na Resend-u) |
| `BLOB_READ_WRITE_TOKEN` | iz Vercel → Storage → Blob (za upload slika) |

> ⚠️ **Važno za Gmail:** uključi **2FA (dvofaktorsku autentifikaciju)** na
> `gdjevecerasbusiness@gmail.com` — na taj email stižu jednokratne admin lozinke.

4. Build komanda (Project Settings → Build Command):

```
prisma generate && node prisma/push-turso.js && next build
```

> ℹ️ **Zašto ne `prisma db push`?** Prisma 6.3 ne podržava `libsql://` URL-ove u CLI
> komandama. `push-turso.js` radi istu stvar preko driver adaptera koji aplikacija
> već koristi — sigurno radi sa Turso bazom (i idempotentno je, može se pokretati
> više puta).

5. Klikni **Deploy**. Nakon minut-dva sajt je live! 🎉

### Admin prijava (email-OTP)

Admin **nema trajnu lozinku**. Na login stranici uneseš email
`gdjevecerasbusiness@gmail.com` i bilo koju lozinku → na email stigne **nova
nasumična lozinka** (važi 15 min, jednokratna). Uneseš je i prijavljen si.
Obični korisnici imaju klasičnu lozinku + opciju „Zaboravljena lozinka".

---

## Korak 4 — Email (Resend, besplatno)

1. Registruj se na https://resend.com
2. **API Keys → Create API Key** → kopiraj ga (to je `EMAIL_PASS`)
3. Verifikuj svoj domen (Resend → Domains) ili koristi test domen
4. U `EMAIL_FROM` stavi adresu sa svog (verifikovanog) domena

Bez ovoga: email radi u terminal modu — verifikacioni link se ispisuje u
logovima (dobro za testiranje, ne za prave korisnike).

---

## Korak 5 — Seed na produkcijskoj bazi (obavezno!)

Seed **kreira SAMO admin nalog** (bez demo podataka — ni lokalno ni u produkciji):

```powershell
# Lokalno, privremeno prebaci .env na Turso URL + DATABASE_AUTH_TOKEN (korak 2), pa:
npm run seed
# Zatim vrati DATABASE_URL na file:./dev.db
```

> ℹ️ Šema na Turso bazi se postavlja automatski pri svakom deploy-u (build komanda),
> tako da seed samo dodaje admin nalog. Seed radi direktno sa Turso URL-om.

Admin: `gdjevecerasbusiness@gmail.com` — prijava preko **jednokratne lozinke na email**
(vidi „Admin prijava" iznad). Nema demo lozinke ni demo podataka. 🔒

> Demo podatke (lokale, događaje, test korisnika) možeš dobiti samo eksplicitno,
> ako ikad zatrebaju za razvoj: `SEED_DEMO=true npm run seed`

---

## Korak 5b — Vercel Blob (upload slika, obavezno!)

1. Na Vercelu: **Storage → Create Database → Blob** → Create
2. Kopiraj `BLOB_READ_WRITE_TOKEN` u env varijable (već je u tabeli)
3. Gotovo — uploadovi slika (live feed, galerija lokala) idu u Blob

Bez ovoga: upload radi samo lokalno (disk), na Vercelu bi failovao.

---

## Korak 6 — Instaliraj kao aplikaciju na telefon

1. Otvori sajt u Chrome-u na telefonu
2. **⋮ meni → "Dodaj na početni ekran"** (Add to Home Screen)
3. Na iPhone-u: Safari → Share → **Add to Home Screen**

Sajt se sada otvara kao prava aplikacija: fullscreen, svoja ikonica,
brže učitavanje i djelimičan offline rad.

> Napomena: PWA (service worker) se aktivira u produkcijskom modu.
> Lokalno ga testiraš sa: `npm run build` pa `npm start`.

---

## Korak 7 (opciono) — Prava aplikacija na Google Play (APK)

Kad sajt bude live, mogu pripremiti **Capacitor** omot:

1. Isti kod se omota u Android ljusku → dobiješ `.apk` fajl
2. Napraviš **Google Play Console** nalog ($25 jednokratno)
3. Upload-uješ APK i objaviš

iOS (App Store) dodatno traži Apple Developer nalog (~$99/godišnje) i Mac za build.

---

## Česta pitanja

### 🔐 Sigurnost — checklist

| Stavka | Status | Napomena |
|---|---|---|
| API ključevi skriveni | ✅ | Sve tajne su u Vercel Environment Variables; `.env*` je u `.gitignore`-u i nikad nije komitovan |
| Token baze (Turso) | ⚠️ | Koristi **token samo te baze** (database-scoped), NE platform-in token. Sve DB konekcije su server-side — token nikad ne ide u browser |
| `JWT_SECRET` | ⚠️ | **Obavezan u produkciji** — bez njega prijava odbija da radi (nasumičan dug niz, npr. `openssl rand -base64 32`) |
| Lozinke | ✅ | bcrypt (10 rundi); reset/verifikacioni tokeni se čuvaju u bazi samo kao SHA-256 hash |
| Git istorija | ✅ | Skenirana — nema komitovanih tajni. Ako IKAD slučajno komituješ tajnu: odmah **rotiraj** (novi token) — brisanje iz istorije ne pomaže ako je neko već klonirao |

**Koliko košta?** Vercel + Turso + Resend imaju besplatne planove koji su
sasvim dovoljni za početak (stotine korisnika).

**Šta ako se sajt ne učita nakon deploy-a?** Najčešće je kriv `DATABASE_URL`
— provjeri da je `libsql://` format i da token nema razmake.

**Da li gubim lokalne podatke?** Ne — lokalni `prisma/dev.db` ostaje tvoj.
Produkcija koristi zasebnu Turso bazu.
