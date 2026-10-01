'use client';

import React, { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/AdminLayout';
import {
  Image as ImageIcon,
  Calendar,
  Tag,
  Shirt,
  MapPin,
  Repeat,
  Link2,
  Clock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Venue } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { toISOFromLocalInput } from '@/lib/bosnia-time';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { FormSection, Field, Switch, FormIntro, SubmitBar } from '@/components/admin/FormKit';

const CATEGORIES: [string, string][] = [['PARTY', 'Žurka'], ['LIVE_MUSIC', 'Muzika uživo'], ['CONCERT', 'Koncert']];
const DAYS: [string, number][] = [['Pon', 1], ['Uto', 2], ['Sri', 3], ['Čet', 4], ['Pet', 5], ['Sub', 6], ['Ned', 0]];

function formatPreviewDate(local: string) {
  if (!local) return 'Datum i vrijeme';
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return local;
  return d.toLocaleString('sr-Latn-BA', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function NewEvent() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'PARTY',
    venueId: '',
    startDateTime: '',
    endDateTime: '',
    price: 0,
    imageUrl: '',
    performers: '',
    minimumAge: '',
    dressCodeType: 'NONE',
    dressCodeName: '',
    dressCodeDescription: '',
    ticketUrl: '',
    instagramUrl: '',
    facebookUrl: '',
  });
  const set = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  const [additionalVenueIds, setAdditionalVenueIds] = useState<string[]>([]);
  // ===== Ponavljajući događaj =====
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'WEEKLY' | 'DAILY'>('WEEKLY');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [recurrenceStart, setRecurrenceStart] = useState('');
  const [recurrenceEnd, setRecurrenceEnd] = useState('');
  const [noRecurrenceEnd, setNoRecurrenceEnd] = useState(true);
  const [recError, setRecError] = useState('');

  const toggleRecDay = (day: number) => {
    setRecurrenceDays(recurrenceDays.includes(day) ? recurrenceDays.filter((d) => d !== day) : [...recurrenceDays, day].sort((a, b) => a - b));
  };

  const validateRecurrence = (): boolean => {
    if (!isRecurring) { setRecError(''); return true; }
    if (recurrenceType === 'WEEKLY' && recurrenceDays.length === 0) {
      setRecError('Odaberite barem jedan dan ponavljanja.'); return false;
    }
    const start = recurrenceStart || formData.startDateTime.slice(0, 10);
    if (!start) { setRecError('Postavite datum početka.'); return false; }
    if (!noRecurrenceEnd && recurrenceEnd && recurrenceEnd < start) {
      setRecError('Datum završetka ne može biti prije početka.'); return false;
    }
    setRecError('');
    return true;
  };

  useEffect(() => {
    async function fetchVenues() {
      // Vlasnik vidi samo svoje lokale
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();

      const res = await fetch('/api/venues');
      let data = await res.json();

      if (session.user.role === 'OWNER') {
        data = data.filter((v: Venue) => v.ownerId === session.user.id);
      }

      setVenues(data);
      if (data.length > 0) setFormData(prev => ({ ...prev, venueId: data[0].id }));
    }
    fetchVenues();
  }, []);

  const missing = [
    !formData.title && 'naziv',
    !formData.venueId && 'lokal',
    !formData.startDateTime && 'početak',
    formData.dressCodeType === 'SPECIAL' && !formData.dressCodeName && 'naziv dress code-a',
  ].filter(Boolean) as string[];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (missing.length) {
      setError('Popunite obavezna polja: ' + missing.join(', ') + '.');
      return;
    }
    if (formData.endDateTime && formData.endDateTime <= formData.startDateTime) {
      setError('Kraj mora biti poslije početka.');
      return;
    }
    if (!validateRecurrence()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          // Vrijeme: lokalno vrijeme iz inputa → ISO (UTC) da se ne pomjeri dan
          startDateTime: toISOFromLocalInput(formData.startDateTime),
          endDateTime: formData.endDateTime ? toISOFromLocalInput(formData.endDateTime) : undefined,
          additionalVenueIds,
          price: Number(formData.price) || 0,
          status: 'PUBLISHED',
          // Ponavljajući događaj — pravilo
          isRecurring,
          ...(isRecurring ? {
            recurrenceType,
            ...(recurrenceType === 'WEEKLY' ? { recurrenceDays } : {}),
            recurrenceStart: (recurrenceStart || formData.startDateTime.slice(0, 10)) + 'T00:00',
            ...(noRecurrenceEnd || !recurrenceEnd
              ? { noRecurrenceEnd: true }
              : { recurrenceEnd: recurrenceEnd + 'T23:59' }),
          } : {}),
        }),
      });

      if (res.ok) {
        showToast('Događaj uspješno kreiran');
        router.push('/admin/events');
      } else {
        const data = await res.json().catch(() => ({}));
        setError('Greška: ' + (data.error || res.statusText));
      }
    } catch (err) {
      console.error(err);
      setError('Došlo je do greške pri čuvanju.');
    } finally {
      setLoading(false);
    }
  };

  const venue = venues.find(v => v.id === formData.venueId);
  const category = CATEGORIES.find(([v]) => v === formData.category)?.[1];
  const price = Number(formData.price) || 0;

  return (
    <>
      <AdminHeader title="Novi događaj" />
      <main className="fk-page">
        <FormIntro
          back="/admin/events"
          backLabel="Svi događaji"
          kicker="Događaji"
          title="Dodaj žurku ili svirku"
          lead="Događaj se objavljuje odmah i pojavljuje se na početnoj, u listi žurki i na profilu lokala."
        />

        <form onSubmit={handleSubmit} className="fk-layout" noValidate>
          <div className="fk-main">
            <FormSection icon={Tag} title="Osnovno">
              <div className="fk-grid">
                <Field label="Naziv događaja" required wide>
                  <input className="input" type="text" required maxLength={140} placeholder="Npr. Techno Invasion" value={formData.title} onChange={set('title')} />
                </Field>
                <div className="field fk-field fk-wide">
                  <span>Kategorija</span>
                  <div className="fk-seg" role="group" aria-label="Kategorija">
                    {CATEGORIES.map(([val, label]) => (
                      <button key={val} type="button" aria-pressed={formData.category === val} onClick={() => setFormData({ ...formData, category: val })}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <Field label="Opis" wide>
                  <textarea className="input" placeholder="Line-up, muzika, šta očekivati…" value={formData.description} onChange={set('description')} />
                </Field>
              </div>
            </FormSection>

            <FormSection icon={MapPin} title="Lokal" hint={venue ? `Grad: ${venue.city || '—'}` : undefined}>
              <Field label="Glavni lokal" required>
                <select
                  className="input"
                  required
                  value={formData.venueId}
                  onChange={(e) => {
                    setFormData({ ...formData, venueId: e.target.value });
                    setAdditionalVenueIds(prev => prev.filter(id => id !== e.target.value));
                  }}
                >
                  {venues.length === 0 && <option value="">Nema lokala</option>}
                  {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </Field>
              {venues.length > 1 && (
                <div className="field fk-field">
                  <span>Zajednički događaj — dodatni lokali (opciono)</span>
                  <div className="fk-venues">
                    {venues.filter(v => v.id !== formData.venueId).map(v => {
                      const checked = additionalVenueIds.includes(v.id);
                      return (
                        <label key={v.id} className={'fk-venue' + (checked ? ' is-on' : '')}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => setAdditionalVenueIds(prev => e.target.checked ? [...prev, v.id] : prev.filter(id => id !== v.id))}
                          />
                          <span>{v.name}</span>
                          {v.city && <small>{v.city}</small>}
                        </label>
                      );
                    })}
                  </div>
                  <small className="fk-hint">Ako se žurka održava u više lokala istovremeno — označi sve. Prikazuje se kao jedan zajednički događaj.</small>
                </div>
              )}
            </FormSection>

            <FormSection icon={Calendar} title="Vrijeme i ulaz">
              <div className="fk-grid fk-grid--3">
                <Field label="Početak" required>
                  <input className="input" type="datetime-local" required value={formData.startDateTime} onChange={set('startDateTime')} />
                </Field>
                <Field label="Kraj" hint="Opciono">
                  <input className="input" type="datetime-local" min={formData.startDateTime || undefined} value={formData.endDateTime} onChange={set('endDateTime')} />
                </Field>
                <Field label="Ulaz (KM)" hint="0 = besplatno">
                  <input className="input" type="number" min={0} step="0.5" placeholder="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value === '' ? 0 : parseFloat(e.target.value) })} />
                </Field>
              </div>
            </FormSection>

            <FormSection icon={Repeat} title="Ponavljanje" hint="Za žurke koje se dešavaju svake sedmice ili svaki dan.">
              <Switch checked={isRecurring} onChange={setIsRecurring} label="Ponavljajući događaj" hint="Termini se automatski prikazuju za svaki odabrani dan." />
              {isRecurring && (
                <>
                  <div className="fk-seg" role="group" aria-label="Ponavljanje">
                    {([['WEEKLY', 'Svake sedmice'], ['DAILY', 'Svaki dan']] as const).map(([val, label]) => (
                      <button key={val} type="button" aria-pressed={recurrenceType === val} onClick={() => setRecurrenceType(val)}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {recurrenceType === 'WEEKLY' && (
                    <div className="fk-days" role="group" aria-label="Dani">
                      {DAYS.map(([label, val]) => (
                        <button key={val} type="button" className="chip" aria-pressed={recurrenceDays.includes(val)} onClick={() => toggleRecDay(val)}>
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="fk-grid">
                    <Field label="Od datuma" hint="Prazno = datum početka">
                      <input className="input" type="date" value={recurrenceStart} onChange={(e) => setRecurrenceStart(e.target.value)} />
                    </Field>
                    <Field label="Do datuma">
                      <input className="input" type="date" value={recurrenceEnd} disabled={noRecurrenceEnd} onChange={(e) => setRecurrenceEnd(e.target.value)} />
                    </Field>
                  </div>
                  <Switch checked={noRecurrenceEnd} onChange={setNoRecurrenceEnd} label="Bez datuma završetka" />
                  {recError && <p className="fk-err" role="alert">{recError}</p>}
                </>
              )}
            </FormSection>

            <FormSection icon={Shirt} title="Line-up, godine i dress code">
              <div className="fk-grid">
                <Field label="Izvođači">
                  <input className="input" type="text" placeholder="DJ, bend…" value={formData.performers} onChange={set('performers')} />
                </Field>
                <Field label="Minimalno godina">
                  <input className="input" type="number" min={0} max={99} placeholder="18" value={formData.minimumAge} onChange={set('minimumAge')} />
                </Field>
                <Field label="Dress code">
                  <select className="input" value={formData.dressCodeType} onChange={set('dressCodeType')}>
                    <option value="NONE">Nema</option>
                    <option value="CASUAL">Casual</option>
                    <option value="ELEGANT">Elegantno</option>
                    <option value="SPECIAL">Tematski / specijalni</option>
                  </select>
                </Field>
                {formData.dressCodeType === 'SPECIAL' && (
                  <Field label="Naziv dress code-a" required>
                    <input className="input" type="text" required placeholder="Npr. All White, Masquerade…" value={formData.dressCodeName} onChange={set('dressCodeName')} />
                  </Field>
                )}
                {formData.dressCodeType !== 'NONE' && (
                  <Field label="Napomena za goste" wide hint="Opciono">
                    <textarea className="input" placeholder="Detaljnije upute…" value={formData.dressCodeDescription} onChange={set('dressCodeDescription')} />
                  </Field>
                )}
              </div>
            </FormSection>

            <FormSection icon={Link2} title="Karte i linkovi">
              <div className="fk-grid">
                <Field label="Link za karte" wide>
                  <input className="input" type="url" placeholder="https://gigstix…" value={formData.ticketUrl} onChange={set('ticketUrl')} />
                </Field>
                <Field label="Instagram objava">
                  <input className="input" type="url" placeholder="https://instagram.com/…" value={formData.instagramUrl} onChange={set('instagramUrl')} />
                </Field>
                <Field label="Facebook događaj">
                  <input className="input" type="url" placeholder="https://facebook.com/events/…" value={formData.facebookUrl} onChange={set('facebookUrl')} />
                </Field>
              </div>
            </FormSection>
          </div>

          <aside className="fk-side">
            <div className="fk-preview" aria-hidden="true">
              <div className="fk-preview__label">Pregled kartice</div>
              <div className="fk-preview__img">
                {formData.imageUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={formData.imageUrl} alt="" />
                  : <ImageIcon className="ic" />}
                <span className="fk-preview__tag">{category}</span>
              </div>
              <div className="fk-preview__body">
                <b>{formData.title || 'Naziv događaja'}</b>
                <small><Clock className="ic" />{formatPreviewDate(formData.startDateTime)}</small>
                <small><MapPin className="ic" />{venue ? venue.name : 'Lokal'}{additionalVenueIds.length > 0 && ` +${additionalVenueIds.length}`}</small>
                <small><Tag className="ic" />{price > 0 ? `${price} KM` : 'Besplatan ulaz'}</small>
              </div>
            </div>

            <FormSection icon={ImageIcon} title="Naslovna slika">
              <ImageUploader
                label="Plakat ili fotka (opciono)"
                value={formData.imageUrl}
                onChange={(imageUrl) => setFormData({ ...formData, imageUrl })}
                aspect="video"
              />
            </FormSection>

            {error && <p className="fk-err" role="alert">{error}</p>}
            <SubmitBar loading={loading} label="Objavi događaj" loadingLabel="Objavljujem…" cancelHref="/admin/events" missing={missing} />
          </aside>
        </form>
      </main>
    </>
  );
}
