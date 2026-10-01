'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminHeader } from '@/components/admin/AdminLayout';
import { Avatar } from '@/components/ui/Avatar';
import { Calendar, CheckCircle, Clock, Users, Flag, ArrowUpRight, TrendingUp, QrCode, Gift, Zap, Plus, Ticket } from 'lucide-react';
import { formatSerbianDate } from '@/lib/date-format';

interface Stats {
  totalEvents: number; published: number; pending: number; upcoming: number; users: number; reports: number; pendingReports: number;
  checkIns7d: number; partners: number; activeRewards: number; activeCodes: number;
  recentEvents: { id: string; title: string; imageUrl: string | null; startDateTime: string; status: string; venue: { name: string } | null }[];
  recentCheckIns: { id: string; points: number; method: string; createdAt: string; user: { name: string | null; avatarUrl: string | null }; venue: { name: string } }[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Vlasnici (gazde) nemaju pristup dashboardu — samo svojim događajima
        const sessionRes = await fetch('/api/auth/session');
        if (sessionRes.ok && (await sessionRes.json()).user?.role === 'OWNER') {
          router.replace('/admin/events');
          return;
        }
        const res = await fetch('/api/admin/stats');
        if (res.ok) setStats(await res.json());
      } catch (err) {
        console.error('Failed to fetch stats', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const cards = [
    { label: 'Nadolazeći događaji', value: stats?.upcoming, icon: TrendingUp, href: '/admin/events' },
    { label: 'Na čekanju', value: stats?.pending, icon: Clock, href: '/admin/events/pending', warn: (stats?.pending || 0) > 0 },
    { label: 'Objavljeno ukupno', value: stats?.published, icon: CheckCircle, href: '/admin/events' },
    { label: 'Korisnici', value: stats?.users, icon: Users, href: '/admin/users' },
    { label: 'Check-ini (7 dana)', value: stats?.checkIns7d, icon: QrCode, href: '/admin/checkin', pink: true },
    { label: 'Partner lokali', value: stats?.partners, icon: Zap, href: '/admin/checkin', pink: true },
    { label: 'Aktivne nagrade', value: stats?.activeRewards, icon: Gift, href: '/admin/rewards', pink: true },
    { label: 'Neiskorišteni kodovi', value: stats?.activeCodes, icon: Ticket, href: '/admin/rewards', pink: true },
  ];

  return (
    <>
      <AdminHeader title="Kontrolna tabla" />
      <main className="adm-main">
        <div className="adm-quick">
          <Link href="/admin/events/new" className="btn btn--pink btn--sm"><Plus className="ic" aria-hidden="true" />Dodaj događaj</Link>
          <Link href="/admin/rewards" className="btn btn--ghost btn--sm"><Gift className="ic" aria-hidden="true" />Dodaj nagradu</Link>
          <Link href="/admin/rewards#provjera" className="btn btn--ghost btn--sm"><Ticket className="ic" aria-hidden="true" />Provjeri kod</Link>
        </div>

        <div className="adm-stats">
          {cards.map((c) => (
            <Link key={c.label} href={c.href} className={`adm-stat${c.pink ? ' adm-stat--pink' : ''}${c.warn ? ' adm-stat--warn' : ''}`}>
              <span className="adm-stat__ic"><c.icon size={18} /></span>
              <b>{loading ? '–' : c.value ?? 0}</b>
              <span>{c.label}</span>
            </Link>
          ))}
        </div>

        <div className="adm-cols">
          <section className="adm-card">
            <div className="adm-card__head">
              <h2>Nedavni događaji</h2>
              <Link href="/admin/events" className="link" style={{ minHeight: 0 }}>Svi <ArrowUpRight size={14} /></Link>
            </div>
            <ul className="adm-list">
              {stats?.recentEvents?.map((event) => (
                <li key={event.id}>
                  <Link href={`/admin/events/${event.id}`}>
                    <span className="adm-list__img">{event.imageUrl ? <img src={event.imageUrl} alt="" /> : <Calendar size={16} />}</span>
                    <span className="adm-list__body"><b>{event.title}</b><small>{event.venue?.name} · {formatSerbianDate(event.startDateTime)}</small></span>
                    <span className={`adm-pill ${event.status === 'PUBLISHED' ? 'adm-pill--ok' : event.status === 'PENDING' ? 'adm-pill--warn' : ''}`}>
                      {event.status === 'PUBLISHED' ? 'Objavljen' : event.status === 'PENDING' ? 'Na čekanju' : event.status}
                    </span>
                  </Link>
                </li>
              ))}
              {!loading && !stats?.recentEvents?.length && <li className="adm-list__empty">Nema nedavnih događaja</li>}
            </ul>
          </section>

          <section className="adm-card">
            <div className="adm-card__head">
              <h2>Posljednji check-ini</h2>
              <Link href="/admin/checkin" className="link" style={{ minHeight: 0 }}>QR kodovi <ArrowUpRight size={14} /></Link>
            </div>
            <ul className="adm-list">
              {stats?.recentCheckIns?.map((c) => (
                <li key={c.id}>
                  <div>
                    <Avatar name={c.user.name} url={c.user.avatarUrl} className="row__av" />
                    <span className="adm-list__body"><b>{c.user.name || '—'}</b><small>{c.venue.name} · {c.method === 'QR' ? 'QR kod' : 'Fotka + lokacija'} · {new Date(c.createdAt).toLocaleString('sr-Latn-BA', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</small></span>
                    <span className="feed__pts">+{c.points}</span>
                  </div>
                </li>
              ))}
              {!loading && !stats?.recentCheckIns?.length && <li className="adm-list__empty">Još nema check-ina. Označi partner lokale i odštampaj QR kodove.</li>}
            </ul>
          </section>
        </div>

        {(stats?.pendingReports || 0) > 0 && (
          <Link href="/admin/reports" className="adm-alert"><Flag size={18} />{stats!.pendingReports} prijava problema čeka pregled</Link>
        )}
      </main>
    </>
  );
}
