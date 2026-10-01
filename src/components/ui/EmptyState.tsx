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
    <div className="empty" style={{ padding: 'clamp(40px, 7vw, 72px) 20px' }}>
      <span className="how__ic" style={{ margin: '0 auto 18px' }} aria-hidden="true"><Icon className="ic" /></span>
      <b>{title}</b>
      <p style={{ maxWidth: '44ch', margin: '0 auto' }}>{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn btn--white btn--sm" style={{ marginTop: 20 }}>{actionLabel}</Link>
      )}
    </div>
  );
}
