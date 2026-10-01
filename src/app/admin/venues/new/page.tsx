'use client';

import React, { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/AdminLayout';
import {
  Image as ImageIcon,
  MapPin,
  Phone,
  Info,
  Clock,
  Tag,
  Plus,
  X,
  UserRound,
  LocateFixed,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { isValidBosnianPhone } from '@/lib/validation';
import { SUPPORTED_CITIES } from '@/lib/cities';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { FormSection, Field, Switch, FormIntro, SubmitBar } from '@/components/admin/FormKit';

const PREDEFINED_TAGS = [
  'Parking', 'Bingo', 'Wi-Fi', 'Terasa', 'Bašta', 'Hrana',
  'Kokteli', 'Bilijar', 'Pikado', 'TV', 'Sportski prenosi',
  'Pristup za osobe sa invaliditetom', 'Garderoba', 'VIP',
  'Live muzika', 'Plesni podij', 'Klima'
];

type OpeningHourForm = { dayGroup: string; openTime: string; closeTime: string; isClosed: boolean };
const INDIVIDUAL_WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'];
const HOUR_LABELS: Record<string, string> = {
  WEEKDAYS: 'Pon – Čet', MONDAY: 'Ponedjeljak', TUESDAY: 'Utorak',
  WEDNESDAY: 'Srijeda', THURSDAY: 'Četvrtak', FRIDAY: 'Petak',
  SATURDAY: 'Subota', SUNDAY: 'Nedjelja'
};

export default function NewVenue() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<{ id: string, name: string, email: string }[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const [sameWeekdayHours, setSameWeekdayHours] = useState(true);
  const [openingHours, setOpeningHours] = useState<OpeningHourForm[]>([
    { dayGroup: 'WEEKDAYS', openTime: '08:00', closeTime: '23:00', isClosed: false },
    { dayGroup: 'FRIDAY', openTime: '08:00', closeTime: '02:00', isClosed: false },
    { dayGroup: 'SATURDAY', openTime: '10:00', closeTime: '03:00', isClosed: false },
    { dayGroup: 'SUNDAY', openTime: '10:00', closeTime: '22:00', isClosed: false },
  ]);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    latitude: '',
    longitude: '',
    phone: '',
    website: '',
    instagramUrl: '',
    facebookUrl: '',
    tiktokUrl: '',
    imageUrl: '',
    ownerId: '',
  });
  const set = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const toggleTag = (tag: string) => {
    setSelectedTags((tags) => tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]);
  };

  const addCustomTag = () => {
    const tag = customTag.trim();
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
      setCustomTag('');
    }
  };

  const handleHourChange = (index: number, field: keyof OpeningHourForm, value: string | boolean) => {
    const newHours = [...openingHours];
    newHours[index] = { ...newHours[index], [field]: value };
    setOpeningHours(newHours);
  };

  const toggleSameWeekdayHours = (checked: boolean) => {
    setSameWeekdayHours(checked);
    setOpeningHours((current) => {
      if (checked) {
        const first = current.find((hour) => INDIVIDUAL_WEEKDAYS.includes(hour.dayGroup)) || current[0];
        return [
          { ...first, dayGroup: 'WEEKDAYS' },
          ...current.filter((hour) => !INDIVIDUAL_WEEKDAYS.includes(hour.dayGroup) && hour.dayGroup !== 'WEEKDAYS'),
        ];
      }
      const shared = current.find((hour) => hour.dayGroup === 'WEEKDAYS') || current[0];
      return [
        ...INDIVIDUAL_WEEKDAYS.map((dayGroup) => ({ ...shared, dayGroup })),
        ...current.filter((hour) => hour.dayGroup !== 'WEEKDAYS'),
      ];
    });
  };

  // Lijepljenje "45.14, 17.25" (Google Maps) u polje širine popuni oba polja
  const onLatitude = (value: string) => {
    const m = value.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (m) setFormData((prev) => ({ ...prev, latitude: m[1], longitude: m[2] }));
    else setFormData((prev) => ({ ...prev, latitude: value }));
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({ ...prev, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
        setLocating(false);
      },
      () => { setLocating(false); showToast('Lokacija nije dostupna', 'error'); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  useEffect(() => {
    async function fetchUsers() {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    }
    fetchUsers();
  }, []);

  const missing = [
    !formData.name && 'naziv',
    !formData.city && 'grad',
    !formData.address && 'adresa',
  ].filter(Boolean) as string[];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (missing.length) {
      setError('Popunite obavezna polja: ' + missing.join(', ') + '.');
      return;
    }
    if (formData.phone && !isValidBosnianPhone(formData.phone)) {
      setError('Unesite ispravan broj telefona (npr. +387 66 123 456 ili 066 123 456).');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
          longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
          openingHours,
          tags: selectedTags
        }),
      });

      if (res.ok) {
        showToast('Lokal uspješno kreiran');
        router.push('/admin/venues');
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

  const hasCoords = formData.latitude !== '' && formData.longitude !== '';

  return (
    <>
      <AdminHeader title="Novi lokal" />
      <main className="fk-page">
        <FormIntro
          back="/admin/venues"
          backLabel="Svi lokali"
          kicker="Lokali"
          title="Dodaj novi lokal"
          lead="Klub, bar ili pab koji će se prikazivati na sajtu i na mapi. Polja sa * su obavezna."
        />

        <form onSubmit={handleSubmit} className="fk-layout" noValidate>
          <div className="fk-main">
            <FormSection icon={Info} title="Osnovno" hint="Kako se lokal zove i gdje se nalazi.">
              <div className="fk-grid">
                <Field label="Naziv lokala" required wide>
                  <input className="input" type="text" required maxLength={120} placeholder="Npr. Club Cristal" value={formData.name} onChange={set('name')} />
                </Field>
                <Field label="Grad" required>
                  <select className="input" required value={formData.city} onChange={set('city')}>
                    <option value="" disabled>Odaberi grad</option>
                    {SUPPORTED_CITIES.map(c => <option key={c.slug} value={c.name}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Adresa" required>
                  <input className="input" type="text" required placeholder="Ulica i broj" value={formData.address} onChange={set('address')} />
                </Field>
                <Field label="Opis" wide hint="Atmosfera, muzika, ponuda — ovo gosti čitaju na profilu lokala.">
                  <textarea className="input" placeholder="Kratak opis lokala…" value={formData.description} onChange={set('description')} />
                </Field>
              </div>
            </FormSection>

            <FormSection
              icon={MapPin}
              title="Lokacija na mapi"
              hint="Potrebna za mapu i za check-in fotkom (gost mora biti u krugu ~150 m)."
              aside={
                <button type="button" className="btn btn--ghost btn--sm" onClick={useMyLocation} disabled={locating}>
                  <LocateFixed className="ic" aria-hidden="true" />{locating ? 'Tražim…' : 'Moja lokacija'}
                </button>
              }
            >
              <div className="fk-grid">
                <Field label="Geografska širina (lat)" hint="Možeš zalijepiti „lat, lng“ iz Google Maps.">
                  <input className="input" type="text" inputMode="decimal" placeholder="44.7722" value={formData.latitude} onChange={(e) => onLatitude(e.target.value)} />
                </Field>
                <Field label="Geografska dužina (lng)">
                  <input className="input" type="text" inputMode="decimal" placeholder="17.1910" value={formData.longitude} onChange={set('longitude')} />
                </Field>
              </div>
              {hasCoords ? (
                <p className="fk-note">
                  <MapPin className="ic" aria-hidden="true" />
                  <span>Provjeri tačku: <a href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`} target="_blank" rel="noopener noreferrer">otvori u Google Maps</a></span>
                </p>
              ) : (
                <p className="fk-note">
                  <Info className="ic" aria-hidden="true" />
                  <span>Bez koordinata lokal se ne vidi na mapi i radi samo check-in preko QR koda.</span>
                </p>
              )}
            </FormSection>

            <FormSection icon={Clock} title="Radno vrijeme" hint="Ako lokal radi iza ponoći, upiši vrijeme zatvaranja normalno (npr. 03:00).">
              <Switch
                checked={sameWeekdayHours}
                onChange={toggleSameWeekdayHours}
                label="Isto radno vrijeme od ponedjeljka do četvrtka"
                hint="Isključi ako neki radni dan ima drugačije vrijeme."
              />
              <div className="fk-hours">
                {openingHours.map((group, index) => (
                  <div key={group.dayGroup} className={'fk-hour' + (group.isClosed ? ' is-closed' : '')}>
                    <b>{HOUR_LABELS[group.dayGroup]}</b>
                    <label className="toggle">
                      <input type="checkbox" checked={!group.isClosed} onChange={(e) => handleHourChange(index, 'isClosed', !e.target.checked)} />
                      <span className="toggle__track"><span className="toggle__thumb" /></span>
                      <span className="toggle__text">{group.isClosed ? 'Zatvoreno' : 'Otvoreno'}</span>
                    </label>
                    {!group.isClosed && (
                      <div className="fk-hour__times">
                        <input className="input" type="time" aria-label="Otvara" value={group.openTime || ''} onChange={(e) => handleHourChange(index, 'openTime', e.target.value)} />
                        <span aria-hidden="true">–</span>
                        <input className="input" type="time" aria-label="Zatvara" value={group.closeTime || ''} onChange={(e) => handleHourChange(index, 'closeTime', e.target.value)} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </FormSection>

            <FormSection icon={Tag} title="Pogodnosti" hint="Tagovi pomažu gostima da filtriraju lokale.">
              <div className="fk-chips">
                {PREDEFINED_TAGS.map(tag => (
                  <button key={tag} type="button" className="chip" aria-pressed={selectedTags.includes(tag)} onClick={() => toggleTag(tag)}>
                    {tag}
                  </button>
                ))}
                {selectedTags.filter(t => !PREDEFINED_TAGS.includes(t)).map(tag => (
                  <button key={tag} type="button" className="chip" aria-pressed="true" onClick={() => toggleTag(tag)}>
                    {tag} <X className="ic" aria-label="Ukloni" />
                  </button>
                ))}
              </div>
              <div className="fk-add">
                <input
                  className="input"
                  type="text"
                  placeholder="Dodaj svoj tag…"
                  maxLength={40}
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                />
                <button type="button" className="btn btn--ghost" onClick={addCustomTag} aria-label="Dodaj tag">
                  <Plus className="ic" aria-hidden="true" />
                </button>
              </div>
            </FormSection>

            <FormSection icon={Phone} title="Kontakt i mreže">
              <div className="fk-grid">
                <Field label="Telefon">
                  <input className="input" type="tel" placeholder="+387 6X XXX XXX" value={formData.phone} onChange={set('phone')} />
                </Field>
                <Field label="Web stranica">
                  <input className="input" type="url" placeholder="https://…" value={formData.website} onChange={set('website')} />
                </Field>
                <Field label="Instagram">
                  <input className="input" type="url" placeholder="https://instagram.com/…" value={formData.instagramUrl} onChange={set('instagramUrl')} />
                </Field>
                <Field label="Facebook">
                  <input className="input" type="url" placeholder="https://facebook.com/…" value={formData.facebookUrl} onChange={set('facebookUrl')} />
                </Field>
                <Field label="TikTok">
                  <input className="input" type="url" placeholder="https://tiktok.com/@…" value={formData.tiktokUrl} onChange={set('tiktokUrl')} />
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
                <span className="fk-preview__tag">+10</span>
              </div>
              <div className="fk-preview__body">
                <b>{formData.name || 'Naziv lokala'}</b>
                <small><MapPin className="ic" />{[formData.address, formData.city].filter(Boolean).join(', ') || 'Adresa, grad'}</small>
              </div>
            </div>

            <FormSection icon={ImageIcon} title="Naslovna fotka">
              <ImageUploader
                label="Kvadratna fotka lokala"
                aspect="square"
                value={formData.imageUrl}
                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
              />
            </FormSection>

            <FormSection icon={UserRound} title="Vlasnik" hint="Korisnik koji upravlja događajima ovog lokala.">
              <select className="input" aria-label="Vlasnik" value={formData.ownerId} onChange={set('ownerId')}>
                <option value="">Bez vlasnika</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
            </FormSection>

            <p className="fk-note">
              <Sparkles className="ic" aria-hidden="true" />
              <span>Partner status, boost za vikend i bonus za račun podešavaš nakon čuvanja u <Link href="/admin/checkin">Check-in, QR, boost</Link>.</span>
            </p>

            {error && <p className="fk-err" role="alert">{error}</p>}
            <SubmitBar loading={loading} label="Sačuvaj lokal" loadingLabel="Čuvam…" cancelHref="/admin/venues" missing={missing} />
          </aside>
        </form>
      </main>
    </>
  );
}
