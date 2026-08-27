'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  icon?: LucideIcon;
  title: string;
  highlight?: string; // dio naslova u pink boji (npr. "DOGAĐAJA")
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}

/** Jedinstveni header sekcije — hijerarhija po redesign briefu. */
export function SectionHeader({ icon: Icon, title, highlight, subtitle, actionLabel, onAction, actionHref }: SectionHeaderProps) {
  const action = actionLabel && (actionHref || onAction);
  return (
    <div className="flex justify-between items-end gap-4 mb-8 md:mb-10">
      <div className="min-w-0">
        <h2 className="text-h2 font-black text-white uppercase tracking-tight leading-none flex items-center gap-3">
          {Icon && <Icon size={28} className="text-primary shrink-0" aria-hidden="true" />}
          {title} {highlight && <span className="text-primary">{highlight}</span>}
        </h2>
        {subtitle && (
          <p className="text-muted text-sm font-medium mt-3 leading-relaxed">{subtitle}</p>
        )}
      </div>
      {action && (
        actionHref ? (
          <a href={actionHref} className="shrink-0 text-primary text-[10px] font-black uppercase tracking-[0.2em] hover:text-white transition-colors hidden sm:block">
            {actionLabel} →
          </a>
        ) : (
          <button onClick={onAction} className="shrink-0 text-primary text-[10px] font-black uppercase tracking-[0.2em] hover:text-white transition-colors hidden sm:block">
            {actionLabel} →
          </button>
        )
      )}
    </div>
  );
}
