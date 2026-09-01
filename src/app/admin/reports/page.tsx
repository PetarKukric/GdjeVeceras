'use client';

import React, { useEffect, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminLayout';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  Calendar,
  User,
  RefreshCcw
} from 'lucide-react';
import Link from 'next/link';
import { formatSerbianDate } from '@/lib/date-format';

interface Report {
  id: string;
  reason: string;
  description: string;
  status: string;
  createdAt: string;
  user: { name: string; email: string };
  event: { title: string; slug: string };
}

export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'event_cancelled': return 'Otkazan događaj';
      case 'wrong_date': return 'Pogrešan datum';
      case 'wrong_price': return 'Pogrešna cena';
      case 'wrong_location': return 'Pogrešna lokacija';
      case 'duplicate': return 'Duplikat';
      default: return reason;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Da li želite da obrišete ovu prijavu?')) return;
    try {
        const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
        if (res.ok) setReports(prev => prev.filter(r => r.id !== id));
    } catch (e) {
        console.error(e);
    }
  }

  return (
    <>
      <AdminHeader title="Prijavljeni problemi" />
      <main className="p-4 md:p-8 animate-fade-up relative z-[1]">
        <div className="flex justify-between items-center mb-8 text-left">
           <div>
            <h2 className="text-2xl font-black text-text uppercase tracking-tight">Prijave korisnika</h2>
            <p className="text-muted text-sm mt-1">Upravljajte prijavama o greškama u događajima.</p>
          </div>
          <button onClick={fetchReports} className="p-2 text-muted hover:text-primary transition-colors">
            <RefreshCcw size={20} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-card border border-border rounded-2xl animate-pulse"></div>)}
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-16 text-center shadow-xl">
             <CheckCircle2 size={36} className="mb-4 text-primary" />
             <h3 className="text-xl font-bold uppercase tracking-tight">Sve je čisto</h3>
             <p className="text-muted mt-1 font-medium">Trenutno nema aktivnih prijava od korisnika.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="bg-card border border-border rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start hover:border-border/80 transition-all shadow-sm">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${report.status === 'PENDING' ? 'bg-orange-400/10 text-orange-400' : 'bg-green-400/10 text-green-400'}`}>
                  {report.status === 'PENDING' ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
                </div>
                
                <div className="flex-grow space-y-2 text-left">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black uppercase tracking-wider text-text">
                      {getReasonLabel(report.reason)}
                    </span>
                    <span className="text-xs text-muted font-bold">• {formatSerbianDate(report.createdAt)}</span>
                  </div>
                  <p className="text-sm text-text leading-relaxed italic border-l-2 border-primary pl-4 py-1 bg-surface/50 rounded-r-lg">
                    &quot;{report.description}&quot;
                  </p>
                  <div className="flex flex-wrap gap-4 pt-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted font-bold uppercase tracking-widest">
                      <Calendar size={12} className="text-primary" />
                      <span>Događaj: <Link href={`/events/${report.event.slug}`} className="text-text hover:underline font-black">{report.event.title}</Link></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted font-bold uppercase tracking-widest">
                      <User size={12} className="text-primary" />
                      <span>Od: <span className="text-text">{report.user.name}</span></span>
                    </div>
                  </div>
                </div>

                <button 
                    onClick={() => handleDelete(report.id)}
                    className="p-3 text-muted hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all self-center shadow-lg"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
