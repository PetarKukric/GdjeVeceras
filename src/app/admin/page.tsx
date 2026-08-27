'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminHeader } from '@/components/admin/AdminLayout';
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  Users, 
  Flag,
  ArrowUpRight,
  TrendingUp} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessionAndStats() {
      try {
        // Vlasnici (gazde) nemaju pristup dashboardu — samo svojim događajima
        const sessionRes = await fetch('/api/auth/session');
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData.user?.role === 'OWNER') {
            router.replace('/admin/events');
            return;
          }
        }

        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch stats', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSessionAndStats();
  }, []);

  if (loading) return <div className="p-8 text-center animate-pulse">Učitavanje Dashboarda...</div>;

  const statCards = [
    { label: 'Ukupno', value: stats?.totalEvents || 0, icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Objavljeno', value: stats?.published || 0, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' },
    { label: 'Na čekanju', value: stats?.pending || 0, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'Aktivno', value: stats?.upcoming || 0, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Korisnici', value: stats?.users || 0, icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
    { label: 'Prijave', value: stats?.reports || 0, icon: Flag, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  ];

  return (
    <>
      <AdminHeader title="Dashboard" />
      <main className="p-8 space-y-10 animate-fade-up relative z-[1]">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {statCards.map((stat) => (
            <div key={stat.label} className="bg-card/50 border border-white/5 p-6 rounded-[1.8rem] shadow-xl hover:border-primary/20 transition-all group">
              <div className={`${stat.bg} ${stat.color} w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg transition-transform group-hover:scale-110`}>
                <stat.icon size={24} />
              </div>
              <p className="text-muted text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-3xl font-black mt-2 text-white">{stat.value}</h3>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Events Section */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="font-bold text-lg">Nedavni događaji</h2>
              <Link href="/admin/events" className="text-primary text-sm font-bold hover:underline flex items-center gap-1">
                Vidi sve <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {stats?.recentEvents?.map((event: any) => (
                <div key={event.id} className="p-4 flex items-center gap-4 hover:bg-surface/50 transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-surface border border-border flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {event.imageUrl ? (
                        <img src={event.imageUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                        <span className="text-xs">📅</span>
                    )}
                  </div>
                  <div className="flex-grow overflow-hidden">
                    <p className="font-bold text-sm truncate">{event.title}</p>
                    <p className="text-[10px] text-muted uppercase tracking-wider">{event.venue?.name} • {new Date(event.startDateTime).toLocaleDateString('bs')}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${event.status === 'PUBLISHED' ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400'}`}>
                      {event.status}
                    </span>
                  </div>
                </div>
              ))}
              {(!stats?.recentEvents || stats.recentEvents.length === 0) && (
                  <div className="p-12 text-center text-muted text-sm italic">Nema nedavnih događaja</div>
              )}
            </div>
          </div>

          <div className="space-y-8">
             {/* Pending Events Summary */}
             <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h2 className="font-bold text-lg uppercase tracking-tight">Događaji na čekanju</h2>
              </div>
              <div className="p-8 text-center">
                 <div className="w-16 h-16 bg-yellow-400/10 text-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock size={32} />
                 </div>
                 <h3 className="font-bold text-xl">{stats?.pending || 0} prijava na čekanju</h3>
                 <p className="text-muted text-sm mt-2 max-w-xs mx-auto">Novi događaji koje su dodali vlasnici lokala čekaju tvoju potvrdu.</p>
                 <Link href="/admin/events/pending" className="mt-8 inline-block px-8 py-3 bg-primary text-text font-black rounded-xl text-xs uppercase tracking-[0.2em] hover:bg-primary-hover transition-all shadow-lg shadow-primary/20">
                    OTVORI MODERACIJU
                 </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
