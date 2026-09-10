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
    <div className="flex justify-between items-end gap-3 mb-4">
      <div className="min-w-0">
        <h2 className="text-[22px] md:text-2xl font-bold text-text leading-tight flex items-center gap-3">
          {Icon && <Icon size={20} className="text-primary shrink-0" aria-hidden="true" />}
          {title.charAt(0) + title.slice(1).toLocaleLowerCase('sr-Latn')} {highlight && <span className="text-primary">{highlight}</span>}
        </h2>
        {subtitle && (
          <p className="text-muted text-sm font-medium mt-1 leading-relaxed">{subtitle}</p>
        )}
      </div>
      {action && (
        actionHref ? (
          <a href={actionHref} className="shrink-0 text-primary text-xs font-semibold hover:text-white transition-colors block">
            {actionLabel} →
          </a>
        ) : (
          <button onClick={onAction} className="shrink-0 text-primary text-xs font-semibold hover:text-white transition-colors block">
            {actionLabel} →
          </button>
        )
      )}
    </div>
  );
}
