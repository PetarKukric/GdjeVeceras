'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save, type LucideIcon } from 'lucide-react';

/** Kartica-sekcija forme sa ikonom, naslovom i opcionim objašnjenjem. */
export function FormSection({ icon: Icon, title, hint, children, aside }: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="fk-sec">
      <header className="fk-sec__head">
        <span className="fk-sec__ic"><Icon className="ic" aria-hidden="true" /></span>
        <div>
          <h2>{title}</h2>
          {hint && <p>{hint}</p>}
        </div>
        {aside && <div className="fk-sec__aside">{aside}</div>}
      </header>
      <div className="fk-sec__body">{children}</div>
    </section>
  );
}

/** Labela + kontrola. `wide` zauzima cijeli red u .fk-grid. */
export function Field({ label, hint, required, wide, children }: {
  label: string;
  hint?: string;
  required?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={'field fk-field' + (wide ? ' fk-wide' : '')}>
      <span>{label}{required && <em aria-hidden="true"> *</em>}</span>
      {children}
      {hint && <small className="fk-hint">{hint}</small>}
    </label>
  );
}

/** Prekidač u stilu sajta (checkbox ispod haube). */
export function Switch({ checked, onChange, label, hint }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="toggle fk-switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track"><span className="toggle__thumb" /></span>
      <span className="fk-switch__text">
        <b>{label}</b>
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

/** Zaglavlje stranice forme: povratak + naslov + kratki opis. */
export function FormIntro({ back, backLabel, kicker, title, lead }: {
  back: string;
  backLabel: string;
  kicker: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="fk-intro">
      <Link href={back} className="fk-back"><ArrowLeft className="ic" aria-hidden="true" />{backLabel}</Link>
      <p className="kicker">{kicker}</p>
      <h1 className="h2">{title}</h1>
      {lead && <p className="lead">{lead}</p>}
    </div>
  );
}

/** Dugmad za čuvanje/otkazivanje u bočnoj koloni. */
export function SubmitBar({ loading, label, loadingLabel, cancelHref, missing }: {
  loading: boolean;
  label: string;
  loadingLabel: string;
  cancelHref: string;
  missing?: string[];
}) {
  return (
    <div className="fk-submit">
      {missing && missing.length > 0 && (
        <p className="fk-missing">Nedostaje: {missing.join(', ')}</p>
      )}
      <button type="submit" className="btn btn--pink btn--block" disabled={loading}>
        {loading ? <Loader2 className="ic spin" aria-hidden="true" /> : <Save className="ic" aria-hidden="true" />}
        {loading ? loadingLabel : label}
      </button>
      <Link href={cancelHref} className="btn btn--ghost btn--block">Otkaži</Link>
    </div>
  );
}
