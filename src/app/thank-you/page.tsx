import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Home, Calendar } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Hvala Vam!',
  description: 'Vaša poruka je poslata.',
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return (
    <main className="flex-grow flex items-center justify-center px-4 py-24 w-full animate-fade-up">
      <div className="max-w-lg w-full text-center">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
          <CheckCircle2 size={44} className="text-primary" />
        </div>
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter mb-4">
          Hvala <span className="text-primary italic">Vam!</span>
        </h1>
        <p className="text-muted text-lg leading-relaxed mb-10">
          Vaša poruka je uspješno poslata.
          <br />
          Odgovaramo u roku od <span className="text-white font-bold">24 sata</span> (radnim danima).
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="h-14 px-10 leading-[3.5rem] bg-primary text-white font-black rounded-xl uppercase tracking-[0.2em] text-[10px] hover:bg-primary-hover transition-all inline-flex items-center justify-center gap-2"
          >
            <Home size={16} /> Početna
          </Link>
          <Link
            href="/events"
            className="h-14 px-10 leading-[3.5rem] bg-white/5 border border-white/10 text-white font-black rounded-xl uppercase tracking-[0.2em] text-[10px] hover:bg-white/10 transition-all inline-flex items-center justify-center gap-2"
          >
            <Calendar size={16} /> Događaji
          </Link>
        </div>
      </div>
    </main>
  );
}
