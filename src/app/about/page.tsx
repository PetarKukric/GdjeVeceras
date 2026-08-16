'use client';

import { BottomNav } from '@/components/layout/BottomNav';
import { Target, Users, Heart } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      <main className="flex-grow max-w-5xl mx-auto w-full px-4 py-20 space-y-20 animate-fade-up">
        
        <header className="text-center space-y-6">
          <div className="bg-primary/10 border border-primary/20 w-fit px-6 py-2 rounded-full text-primary text-[10px] font-black uppercase tracking-[0.4em] mx-auto">
             O NAMA
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">
            VAŠ VODIČ KROZ <span className="text-primary italic">NOĆNI ŽIVOT</span>
          </h1>
          <p className="text-muted text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed uppercase tracking-widest opacity-60">
            Povezujemo najbolje lokale sa ljudima koji traže vrhunsku zabavu.
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
           <div className="bg-card/50 border border-white/5 p-10 rounded-[3rem] space-y-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full group-hover:bg-primary/10 transition-all" />
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
                 <Target size={28} />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight">Naša Misija</h3>
              <p className="text-muted leading-relaxed font-medium uppercase tracking-wide text-sm opacity-80">
                Cilj platforme "Gdje Večeras" je da modernizuje i olakša planiranje izlazaka u tvom gradu. Želimo da svaki korisnik u par klikova pronađe savršenu žurku, a svaki vlasnik lokala dobije alat za vrhunsku promociju svog rada.
              </p>
           </div>

           <div className="bg-card/50 border border-white/5 p-10 rounded-[3rem] space-y-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full group-hover:bg-accent/10 transition-all" />
              <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-4">
                 <Users size={28} />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight">Zajednica</h3>
              <p className="text-muted leading-relaxed font-medium uppercase tracking-wide text-sm opacity-80">
                Vjerujemo u snagu zajednice. Kroz komentare, live objave i personalizovane preporuke, stvaramo mrežu ljudi koji dijele strast prema muzici i kvalitetnom druženju.
              </p>
           </div>
        </div>

        <section className="bg-surface/50 border border-white/5 rounded-[4rem] p-12 md:p-20 text-center space-y-10 relative overflow-hidden">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,128,0.03)_0%,transparent_70%)]" />
           <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter relative z-10">Zašto izabrati nas?</h2>
           <div className="grid gap-12 md:grid-cols-3 relative z-10">
              <div className="space-y-4">
                 <div className="text-primary font-black text-4xl">01</div>
                 <h4 className="font-black uppercase tracking-widest text-sm">Sve na jednom mjestu</h4>
                 <p className="text-muted text-xs font-bold uppercase tracking-widest leading-loose">Od žurki do rezervacija i live atmosfere.</p>
              </div>
              <div className="space-y-4">
                 <div className="text-primary font-black text-4xl">02</div>
                 <h4 className="font-black uppercase tracking-widest text-sm">Real-time iskustvo</h4>
                 <p className="text-muted text-xs font-bold uppercase tracking-widest leading-loose">Pratite atmosferu uživo kroz objave vlasnika.</p>
              </div>
              <div className="space-y-4">
                 <div className="text-primary font-black text-4xl">03</div>
                 <h4 className="font-black uppercase tracking-widest text-sm">Personalizacija</h4>
                 <p className="text-muted text-xs font-bold uppercase tracking-widest leading-loose">Aplikacija uči vaše ukuse i nudi ono što volite.</p>
              </div>
           </div>
        </section>

        <div className="text-center pb-20">
           <Heart size={40} className="text-primary animate-pulse mx-auto mb-6" />
           <p className="text-muted uppercase font-black tracking-[0.5em] text-[10px]">Hvala što ste dio naše priče.</p>
        </div>

      </main>
      <BottomNav />
    </div>
  );
}
