'use client';

import React from 'react';
import { Search, Heart, Calendar, ArrowLeft, Disc, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HowItWorks() {
  const router = useRouter();

  const steps = [
    {
      icon: Search,
      title: '1. Istražite događaje',
      desc: 'Pregledajte najnovije žurke, koncerte i muziku uživo u svom gradu. Koristite filtere da pronađete baš ono što vam se sviđa.',
      color: 'text-primary'
    },
    {
      icon: Calendar,
      title: '2. Provjerite detalje',
      desc: 'Kliknite na događaj da vidite tačno vrijeme, cijenu ulaza, lokaciju na mapi i opis izvođača.',
      color: 'text-accent'
    },
    {
      icon: Heart,
      title: '3. Sačuvajte favorite',
      desc: 'Prijavite se i kliknite na srce da biste sačuvali događaje ili lokale koje ne želite da propustite.',
      color: 'text-pink-500'
    },
    {
      icon: ShieldCheck,
      title: '4. Siguran izlazak',
      desc: 'Svi lokali su provjereni. Ako uočite bilo kakvu grešku ili promjenu, možete je lako prijaviti putem dugmeta na stranici događaja.',
      color: 'text-blue-500'
    }
  ];

  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      <main className="flex-grow max-w-5xl mx-auto px-4 py-16 w-full animate-in fade-in duration-700">
        
        {/* Back Button */}
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted hover:text-white transition-colors mb-12 group"
        >
          <div className="w-10 h-10 rounded-xl bg-surface border border-border/50 flex items-center justify-center group-hover:border-primary transition-all">
            <ArrowLeft size={20} />
          </div>
          <span className="text-xs font-black uppercase tracking-widest">Nazad</span>
        </button>

        <header className="mb-20 text-center md:text-left">
          <div className="bg-primary/10 border border-primary/20 w-fit px-4 py-1.5 rounded-full text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-6 mx-auto md:mx-0 animate-bounce">
             Uputstvo za korišćenje
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase mb-4 sm:mb-6 leading-tight">
            Kako funkcioniše <br />
            <span className="text-primary italic">Gdje Večeras?</span>
          </h1>
          <p className="text-muted text-lg font-medium max-w-2xl mx-auto md:mx-0 leading-relaxed">
            Vaša digitalna karta za najbolji noćni život u vašem gradu. Naš cilj je da u dva klika saznate gdje je najbolja zabava.
          </p>
        </header>

        {/* Steps Grid */}
        <div className="grid gap-8 md:grid-cols-2 mb-24">
          {steps.map((step, i) => (
            <div 
              key={i} 
              className="bg-surface/50 border border-border/50 p-10 rounded-3xl hover:border-primary/30 transition-all group hover:-translate-y-2 duration-300"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className={`w-16 h-16 rounded-2xl bg-card border border-border/50 flex items-center justify-center ${step.color} shadow-2xl mb-8 group-hover:scale-110 transition-transform`}>
                <step.icon size={32} />
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-4">{step.title}</h3>
              <p className="text-muted leading-relaxed font-medium">
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Info Section for Owners */}
        <section className="bg-primary/5 border border-primary/20 rounded-3xl p-12 md:p-16 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-6 flex items-center gap-4">
              <Disc className="text-primary animate-spin-slow" size={32} /> Posjedujete lokal?
            </h2>
            <p className="text-muted text-lg mb-10 max-w-2xl font-medium leading-relaxed">
              Postanite dio naše mreže! Registrujte se i kontaktirajte administraciju kako bismo vam dodijelili vlasničke privilegije. Nakon toga, sami možete dodavati i upravljati događajima za vaš lokal.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/signup" className="px-10 py-5 bg-primary text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-2xl shadow-primary/20 hover:bg-primary-hover transition-all">
                KREIRAJ NALOG
              </Link>
              <Link href="/venues" className="px-10 py-5 bg-surface border border-border text-white font-black rounded-2xl uppercase tracking-widest text-[10px] hover:bg-card transition-all">
                POGLEDAJ LOKALE
              </Link>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -z-0" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 blur-[100px] rounded-full -z-0" />
        </section>

        {/* Quote */}
        <footer className="mt-24 text-center pb-20">
          <div className="inline-block p-1 bg-gradient-to-r from-primary to-accent rounded-full mb-6">
             <div className="bg-background px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.4em]">
                Grad Noću
             </div>
          </div>
          <h4 className="text-xl font-black uppercase italic tracking-widest text-white/50">
            Pronađi. Izaberi. Izađi.
          </h4>
        </footer>
      </main>
    </div>
  );
}
