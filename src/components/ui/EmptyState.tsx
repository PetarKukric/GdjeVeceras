'use client';

import React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="bg-card/30 border border-white/5 rounded-[3rem] p-16 md:p-24 text-center shadow-2xl animate-fade-up">
      <div className="w-24 h-24 bg-surface rounded-[2rem] flex items-center justify-center mx-auto mb-10 text-muted opacity-20 shadow-2xl">
        <Icon size={48} />
      </div>
      <h3 className="text-3xl font-black mb-4 uppercase tracking-tighter leading-none text-white">{title}</h3>
      <p className="text-muted max-w-sm mx-auto mb-12 font-medium leading-relaxed text-sm uppercase tracking-widest opacity-60">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link 
          href={actionHref} 
          className="inline-flex px-12 py-5 bg-white text-background font-black rounded-2xl uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-white/5 hover:bg-primary hover:text-white transition-all hover:scale-105"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
