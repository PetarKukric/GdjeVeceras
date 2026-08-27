---
name: gdjeveceras-ui
description: "Dizajn sistem i UI/UX pravila za Gdje Večeras (nightlife PWA). Koristi ovaj skill za SVAKU izmjenu UI-ja: stranice, komponente, boje, tipografija, animacije, ikone, forme. Bazirano na ui-ux-pro-max metodologiji (prioritetna lista 1-10) prilagođenoj ovom proizvodu."
---

# Gdje Večeras — UI/UX Skill (dizajn inteligencija)

**Proizvod:** nightlife/events PWA (mobile-first), tamna tema, roza akcent.
**Stack:** Next.js 15 (App Router) + Tailwind CSS 4 + lucide-react ikone + Leaflet mape.

## Dizajn tokeni (koristi UVIJEK ove, nikad raw hex u komponentama)

| Token | Vrijednost | Namjena |
|---|---|---|
| `background` | `#020106` | pozadina stranice (skoro crna) |
| `surface` | tamnija površina | kartice, polja |
| `card` | tamna površina | paneli, modali |
| `primary` | `#FF0080` (roza) | CTA, akcenti, aktivna stanja |
| `primary-hover` | svjetlija roza | hover CTA |
| `accent` | žarka | "POPULARNO" bedževi |
| `text` | bijela | glavni tekst |
| `muted` | siva | sekundarni tekst (kontrast ≥ 4.5:1 na dark površinama!) |

## Prioritetna lista pravila (redoslijed važnosti)

### 1. Accessibility (KRITIČNO)
- Kontrast teksta ≥ 4.5:1 na tamnim površinama; 3:1 samo za veliki tekst/ikone
- **Svako icon-only dugme MORA imati `aria-label`** (+ `aria-pressed` za toggle)
- Focus ringovi se NIKAD ne uklanjaju (postoji globalni `*:focus-visible` pink outline)
- Slike sa sadržajem: `alt`; dekorativne: `alt=""`

### 2. Touch & Interaction (KRITIČNO — mobilna PWA!)
- Minimalna dodirna meta **44×44px** (koristi klasu `touch-target`)
- Razmak između akcija ≥ 8px
- Svaka akcija ima vidljiv feedback (transition/active:scale)
- Hover NIJE jedini način interakcije (mobilni nemaju hover)

### 3. Tipografija
- Tijelo teksta: 14–16px; sekundarni: 12–14px
- **MIKRO-LABELI (bedževi, uppercase oznake): minimum 10px — NIKAD 8px ili 9px**
- Line-height 1.5 za pasuse; uppercase + tracking-widest za labele
- Fontovi: Manrope (naslovi) + Inter (tekst) — već u layout.tsx

### 4. Layout & Responsive
- Mobile-first (`sm:`, `md:`, `lg:` breakpointovi)
- Bez horizontalnog skrolanja; bez fiksnih px širina kontejnera
- Donja navigacija ≤ 5 stavki (BottomNav)
- Vertikalni ritam sekcija: 16/24/32/48/64

### 5. Boje & Stil
- Jedan vizuelni jezik: tamne površine + roza akcent + bijeli tekst
- Bez miješanja stilova (sve flat/moderno, bez skeuomorfizma)
- **SVG ikone (lucide), NIKAD emoji kao strukturne ikone**
- Ista debljina strokea u istom sloju (1.5–2px)

### 6. Animacije
- Trajanje po udaljenosti: mikro 100–150ms, kretanje 200–300ms
- `transition-all` + `active:scale` pattern (već ustaljen)
- Animacija prenosi značenje (npr. srce skače kad se doda favorite)

### 7. Forme & Feedback
- Vidljivi labeli (placeholder NIJE label)
- Greška prikazana UZ polje, ne samo na vrhu
- Loading stanja: `Loader2` spinner + disabled dugme

### 8. Navigacija
- Predvidljiv "Nazad"; duboki linkovi rade (slug URL-ovi)
- Aktivna stanja jasna (pink highlight)

## Anti-patterns (NIKAD)
- ❌ `text-[8px]` / `text-[9px]` — premalo za čitanje
- ❌ Icon-only `<button>` bez `aria-label`
- ❌ Raw hex boje u komponentama (`#FF0080` → koristi `text-primary`)
- ❌ Emoji kao ikone u navigaciji/dugmadima
- ❌ `outline: none` / skrivanje focus ringova
- ❌ Dugmad manja od 44px bez proširene hit površine
- ❌ Siva-na-sivi tekst bez provjere kontrasta
- ❌ Jedno trajanje animacije za sve

## Pre-delivery checklist (prije svakog UI predaje)
- [ ] Testirano na 375px širini (mali telefon)
- [ ] Sva dodirna meta ≥ 44px
- [ ] Sva icon-only dugmad imaju aria-label
- [ ] Nema teksta ispod 10px
- [ ] Kontrast muted teksta čitljiv na tamnoj pozadini
- [ ] Loading i error stanja pokriveni
- [ ] Focus vidljiv na tastaturi

## 21st MCP (Magic) — pravila korišćenja

Ako je dostupan 21st MCP server (vidi `docs/MCP-21ST.md`):
- Koristi `search`/`get_inspiration` za STRUKTURU i animacijske pattern-e
- Nakon preuzimanja/generisanja komponente, **obavezno je prestilizuj**
  na naše tokene (primary #FF0080, bg-card, border-white/5, uppercase
  naslovi, min 10px font) — nikad ne ostavljaj default plavo/shadcn stil
- Nepoznate pakete koje komponenta zahtijeva (framer-motion i sl.)
  prvo provjeri u package.json pa instaliraj

## Reference
- Izvorna metodologija: ui-ux-pro-max skill (github.com/nextlevelbuilder/ui-ux-pro-max-skill)
- 21st MCP: github.com/21st-dev/magic-mcp · ključ i setup: docs/MCP-21ST.md
- Ljudska verzija ovog dokumenta: `docs/DESIGN-SYSTEM.md`
