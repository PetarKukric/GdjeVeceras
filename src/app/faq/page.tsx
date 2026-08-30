import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown, MessageCircle, Calendar, MapPin, Heart, UserPlus, ShieldCheck, Building2, HelpCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Česta pitanja (FAQ)',
  description: 'Odgovori na najčešća pitanja o Gdje Večeras — rezervacije, dodavanje lokala, nalog, privatnost i gradovi u kojima radimo.',
};

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Šta je Gdje Večeras?',
    a: 'Gdje Večeras je platforma za noćni život u Bosni i Hercegovini. Na jednom mjestu pratiš žurke, koncerte i lokale — vidiš šta se dešava večeras, ovog vikenda i kasnije, sa mapom, cijenama i rezervacijama.',
  },
  {
    q: 'Da li je korištenje besplatno?',
    a: 'Da. Pregled događaja, lokala i mapa je potpuno besplatan. Besplatno je i čuvanje omiljenih događaja i lokala. Za neke događaje plaća se ulaznica ili rezervacija — cijena je uvijek jasno napisana na stranici događaja.',
  },
  {
    q: 'Kako rezervišem mjesto?',
    a: 'Otvori željeni događaj i klikni na dugme "Rezerviši". Izaberi sto ili boks na planu prostorije (ako je dostupan), potvrdi i dobićeš potvrdu. Svoje rezervacije pratiš u sekciji "Rezervacije".',
  },
  {
    q: 'Da li moram napraviti nalog?',
    a: 'Za pregled sadržaja — ne. Nalog ti treba za čuvanje omiljenih stavki, rezervacije, chat i komentarisanje. Registracija traje minut.',
  },
  {
    q: 'Kako dodam svoj lokal ili događaj?',
    a: 'Registruj se i prijavi kao vlasnik (OWNER). U panelu "Događaji" možeš dodavati događaje svog lokala, sa slikama, cijenama i planom prostorije. Za dodavanje cijelog lokala piši nam preko kontakt forme.',
  },
  {
    q: 'U kojim gradovima radite?',
    a: 'Trenutno pokrivamo Banja Luku, Gradišku, Prnjavor i Srbac — a lista stalno raste. Ako želiš svoj grad, javi nam se!',
  },
  {
    q: 'Kako prijavim problem ili neispravan sadržaj?',
    a: 'Na svakoj stranici događaja postoji dugme "Prijavi problem". Možeš nam pisati i preko kontakt forme — odgovaramo u roku od 24 sata.',
  },
  {
    q: 'Kako štitite moje podatke?',
    a: 'Tvoja lozinka je šifrovana, sesije su potpisane, a pristup podacima je strogo kontrolisan. Detalje čitaj u Politici privatnosti.',
  },
];

const ICONS = [Calendar, MapPin, Building2, UserPlus, Heart, MapPin, ShieldCheck, ShieldCheck];

export default function FaqPage() {
  return (
    <main className="flex-grow max-w-3xl mx-auto px-4 py-16 md:py-24 w-full animate-fade-up">
      <header className="mb-12 text-center">
        <div className="bg-primary/10 border border-primary/20 w-fit px-4 py-1.5 rounded-full text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-6 mx-auto flex items-center gap-2">
          <HelpCircle size={12} /> Pomoć
        </div>
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter mb-4">
          Česta <span className="text-primary italic">pitanja</span>
        </h1>
        <p className="text-muted text-lg">Sve što trebaš znati o Gdje Večeras — ukratko.</p>
      </header>

      <div className="space-y-3">
        {FAQ.map((item, i) => {
          const Icon = ICONS[i] || Calendar;
          return (
            <details key={i} className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-colors">
              <summary className="flex items-center gap-4 px-5 md:px-6 py-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <span className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-primary" />
                </span>
                <span className="text-sm md:text-base font-bold text-white flex-grow">{item.q}</span>
                <ChevronDown size={18} className="text-muted shrink-0 transition-transform duration-300 group-open:rotate-180" />
              </summary>
              <div className="px-5 md:px-6 pb-5 pl-[4.75rem] text-sm text-muted leading-relaxed">{item.a}</div>
            </details>
          );
        })}
      </div>

      <div className="mt-12 bg-elevated border border-border rounded-3xl p-8 text-center">
        <MessageCircle size={28} className="text-primary mx-auto mb-4" />
        <h2 className="text-lg font-black uppercase tracking-tight mb-2">Nisi našao odgovor?</h2>
        <p className="text-muted text-sm mb-6">Piši nam direktno — odgovaramo u roku od 24 sata.</p>
        <Link
          href="/contact"
          className="inline-block h-12 px-10 leading-[3rem] bg-primary text-white font-black rounded-xl uppercase tracking-[0.2em] text-[10px] hover:bg-primary-hover transition-all"
        >
          Kontaktiraj nas
        </Link>
      </div>
    </main>
  );
}
