'use client';

import Link from 'next/link';
import { Home, Search, AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      <div className="space-y-8 animate-fade-up">
        <div className="relative">
          <div className="text-[12rem] md:text-[18rem] font-black text-white opacity-[0.03] leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
             <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center text-primary shadow-2xl shadow-primary/20">
                <AlertCircle size={48} />
             </div>
             <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">
               Ovdje večeras <br /> <span className="text-primary italic">nema ništa.</span>
             </h1>
          </div>
        </div>

        <p className="text-muted text-sm md:text-lg max-w-md mx-auto font-medium leading-relaxed uppercase tracking-widest opacity-60">
          Stranica koju tražite ne postoji ili je premještena na drugu lokaciju.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Link 
            href="/" 
            className="w-full sm:w-auto px-10 py-5 bg-primary text-white font-black rounded-2xl hover:bg-primary-hover hover:scale-105 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[10px] shadow-2xl shadow-primary/30"
          >
            <Home size={18} /> NA POČETNU
          </Link>
          <Link 
            href="/events" 
            className="w-full sm:w-auto px-10 py-5 bg-white/5 border border-white/10 text-white font-black rounded-2xl hover:bg-white/10 hover:scale-105 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[10px]"
          >
            <Search size={18} /> TRAŽI DOGAĐAJE
          </Link>
        </div>
      </div>
    </div>
  );
}
