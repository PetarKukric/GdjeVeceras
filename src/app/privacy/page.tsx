import React from 'react';
import { BottomNav } from '@/components/layout/BottomNav';
import { Lock } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      <main className="flex-grow max-w-3xl mx-auto w-full px-4 py-16 space-y-10">
        <div className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Lock size={24} />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight">Politika privatnosti</h1>
          <p className="text-muted text-xs font-bold uppercase tracking-[0.2em]">Posljednje ažuriranje: avgust 2026.</p>
        </div>

        <div className="space-y-8 text-muted text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-white font-black uppercase tracking-tight text-lg">1. Koje podatke prikupljamo</h2>
            <p>Prikupljamo podatke koje nam sami date:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Ime, email adresa i lozinka (hash) pri registraciji</li>
              <li>Broj telefona, ime i broj osoba pri rezervaciji</li>
              <li>Sadržaj koji objavljujete: komentari, poruke, prijave</li>
              <li>Podaci o lokalu/događajima koje objavljujete kao vlasnik</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-white font-black uppercase tracking-tight text-lg">2. Kako koristimo podatke</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Za rad Platforme: prijava, rezervacije, obavještenja</li>
              <li>Za povezivanje vas sa vlasnicima lokala (rezervacije)</li>
              <li>Za slanje obavještenja vezanih za vaše aktivnosti</li>
              <li>Ne prodajemo vaše podatke trećim licima</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-white font-black uppercase tracking-tight text-lg">3. Čuvanje podataka</h2>
            <p>
              Podaci se čuvaju u sigurnim bazama podataka (Turso) i na hosting infrastrukturi (Vercel).
              Lozinke se čuvaju isključivo u hashiranom obliku. Administratorski nalog nema trajnu lozinku —
              pristup se odobrava jednokratnim lozinkama poslatim na email.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-white font-black uppercase tracking-tight text-lg">4. Kolačići (cookies)</h2>
            <p>
              Platforma koristi isključivo neophodne kolačiće (sesija za prijavu). Ne koristimo kolačiće za
              praćenje ili oglašavanje.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-white font-black uppercase tracking-tight text-lg">5. Usluge trećih strana</h2>
            <p>
              Koristimo sljedeće usluge koje mogu obraditi podatke u naše ime: Vercel (hosting), Turso (baza),
              Resend (email), PayPal (plaćanja), Google Maps/OpenStreetMap (prikaz mapa).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-white font-black uppercase tracking-tight text-lg">6. Vaša prava</h2>
            <p>Imate pravo na: uvid u svoje podatke, ispravku, brisanje naloga (stranica „Podešavanja&quot;),
              i povlačenje saglasnosti. Brisanje naloga trajno uklanja sve vaše podatke iz sistema.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-white font-black uppercase tracking-tight text-lg">7. Kontakt</h2>
            <p>
              Za pitanja o privatnosti: <b className="text-white">gdjevecerasbusiness@gmail.com</b>
            </p>
          </section>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
