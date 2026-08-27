# 🎨 Gdje Večeras — Dizajn sistem

> Verzija 1.0 · nastao primjenom ui-ux-pro-max metodologije (122k ⭐)
> AI pravila: `.claude/skills/gdjeveceras-ui/SKILL.md` (automatski čita svaki AI agent)

## Brend u jednoj rečenici

**Tamna noć + neon roza** — aplikacija za noćni izlazak: skoro crna pozadina (`#050505`), jarko roza akcent (`#FF006E`), bijeli tekst, crni uppercase naslovi sa širim razmakom.

## Tokeni

| Token | Vrijednost | Upotreba |
|---|---|---|
| Pozadina | `#050505` (`bg-background`) | stranica |
| Elevated | `#0D0D0F` (`bg-elevated`) | izdignute površine |
| Površina | `#121216` (`bg-surface`) | kartice, inputi |
| Kartica | `#18181D` (`bg-card`) | paneli, modali |
| **Primarna** | **`#FF006E`** (`bg-primary`, `text-primary`) | CTA dugmad, akcenti, aktivna stanja |
| Primary hover | `#FF2D86` (`bg-primary-hover`) | hover CTA |
| Tekst | `#FFFFFF` (`text-text`) | naslovi i tijelo |
| Muted | `#A7A7B0` (`text-muted`) | sekundarni tekst, labeli |
| Border | `#232329` (`border-border`) | obrubi i razdjelnici |
| Akcent | `#F5C518` (`bg-accent`) | POPULARNO bedževi |

## Tipografija

- **Fontovi:** Manrope (naslovi, display) + Inter (tekst) — učitani u `layout.tsx`
- **Naslovi:** `font-black uppercase tracking-tight` (32–48px)
- **Tijelo:** 14–16px, line-height 1.5
- **Mikro-labeli:** min. **10px** `font-black uppercase tracking-widest` — nikad manje!
- Stilski hijerarhija: veličina + boja + tracking, ne samo boja

## Ikone

- **Lucide React** svugdje (već instaliran) — nikad emoji kao strukturne ikone
- Veličine: 14–18px (inline), 20–24px (navigacija), 32px+ (hero)
- Ista stroke debljina u istom sloju

## Komponente — recepti

| Komponenta | Recept |
|---|---|
| Dugme CTA | `bg-primary text-white font-black rounded-xl uppercase tracking-widest py-4 hover:opacity-90` |
| Dugme sekundarno | `bg-white/5 border border-white/10` |
| Kartica | `bg-card border border-white/5 rounded-2xl` |
| Bedž | `bg-primary/90 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em]` |
| Input | `bg-surface border border-border rounded-xl focus:border-primary py-3 px-4` |
| Sekcija | `max-w-7xl mx-auto px-4 py-16` |

## Mobilna pravila (PWA!)

1. Dodirne mete **≥ 44×44px** — klasa `touch-target`
2. Icon-only dugmad → **obavezno `aria-label`**
3. Donja navigacija ≤ 5 stavki
4. Hover nije jedini feedback (mobilni nemaju hover) — uvijek `active:` stanje

## Animacije

- Mikro (srce, dugme): 100–150ms, `active:scale-125`
- Kretanje (modali, stranice): 200–300ms
- Bedževi koji "žive": `animate-pulse` (UŽIVO) — rijetko i namjenski

## Accessibility minimum

- Focus ring: globalni pink outline (`*:focus-visible` u globals.css) — nikad ne uklanjati
- Kontrast teksta ≥ 4.5:1 na tamnim površinama
- Alt tekst na sadržajnim slikama

## Checklist prije objave

- [ ] 375px širina — bez horizontalnog skrola
- [ ] Nema teksta ispod 10px
- [ ] Sva icon-only dugmad imaju aria-label
- [ ] Loading/error stanja pokrivena
- [ ] Focus vidljiv sa tastature
