import React from 'react';
import { BottomNav } from '@/components/layout/BottomNav';
import { ShieldCheck } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      <main className="flex-grow max-w-3xl mx-auto w-full px-4 py-16 space-y-10">
        <div className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight">Uslovi korištenja</h1>
          <p className="text-muted text-xs font-bold uppercase tracking-[0.2em]">Posljednje ažuriranje: avgust 2026.</p>
        </div>

        <div className="space-y-8 text-muted text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-white font-black uppercase tracking-tight text-lg">1. Opšte odredbe</h2>
            <p>
              Platforma <b className="text-white">Gdje Večeras</b> (u daljem tekstu: Platforma) služi za objavljivanje i
              pregled događaja, lokala i rezervacija. Korištenjem Platforme prihvatate ove Uslove korištenja.
              Ako se ne slažete sa Uslovima, molimo vas da ne koristite Platformu.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-white font-black uppercase tracking-tight text-lg">2. Nalozi i registracija</h2>
            <p>
              Za rezervacije, komentare i čuvanje događaja potrebna je registracija. Dužni ste dati tačne podatke i
              čuvati povjerljivost svog naloga. Odgovorni ste za sve aktivnosti koje se odvijaju pod vašim nalogom.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-white font-black uppercase tracking-tight text-lg">3. Objavljivanje sadržaja</h2>
            <p>
              Vlasnici lokala mogu objavljivati događaje i informacije o lokalima. Zabranjeno je objavljivati:
              netačne ili obmanjujuće informacije, sadržaj koji krši tuđa autorska prava, uvredljiv, diskriminišući
              ili nezakonit sadržaj. Platforma zadržava pravo uklanjanja takvog sadržaja bez prethodne najave.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-white font-black uppercase tracking-tight text-lg">4. Rezervacije</h2>
            <p>
              Rezervacije predstavljaju zahtjev prema vlasniku lokala i podložne su njegovoj potvrdi. Platforma nije
              ugovorna strana u rezervaciji i ne garantuje dostupnost. Otkazivanje rezervacije moguće je do početka
              događaja. Cijene, raspored i uslovi mogu se promijeniti od strane organizatora.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-white font-black uppercase tracking-tight text-lg">5. Plaćanja i promocije</h2>
            <p>
              Sve funkcionalnosti sajta su trenutno besplatne za korisnike i vlasnike lokala.
              automatski. Uplata je povratna isključivo u slučajevima predviđenim zakonom.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-white font-black uppercase tracking-tight text-lg">6. Ograničenje odgovornosti</h2>
            <p>
              Platforma se pruža „takva kakva jeste&quot;. Ne garantujemo tačnost, potpunost ili dostupnost objavljenih
              informacija. Platforma nije odgovorna za štetu nastalu korištenjem ili nemogućnošću korištenja usluge,
              niti za ponašanje korisnika ili organizatora događaja.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-white font-black uppercase tracking-tight text-lg">7. Izmjene uslova</h2>
            <p>
              Zadržavamo pravo izmjene ovih Uslova. O značajnim izmjenama obavijestićemo korisnike objavom na
              Platformi. Nastavak korištenja nakon izmjena smatra se prihvatanjem novih Uslova.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-white font-black uppercase tracking-tight text-lg">8. Kontakt</h2>
            <p>
              Za sva pitanja u vezi sa Uslovima kontaktirajte nas na: <b className="text-white">gdjevecerasbusiness@gmail.com</b>
            </p>
          </section>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
