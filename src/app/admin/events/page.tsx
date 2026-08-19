'use client';

import React, { useEffect, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminLayout';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Clock,
  CheckCircle} from 'lucide-react';
import { Event, Status } from '@/types';
import Link from 'next/link';

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function fetchSession() {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    }
    fetchSession();
  }, []);

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (statusFilter !== 'ALL') params.append('status', statusFilter);
        if (searchTerm) params.append('search', searchTerm);
        
        const res = await fetch(`/api/admin/events?${params.toString()}`);
        const data = await res.json();
        setEvents(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [statusFilter, searchTerm]);

  const handleStatusChange = async (id: string, action: string) => {
    try {
      const res = await fetch(`/api/admin/events/${id}/${action}`, { method: 'POST' });
      if (res.ok) {
        // Refresh list
        setEvents(prev => prev.map(e => e.id === id ? { ...e, status: (action === 'approve' ? 'PUBLISHED' : action === 'reject' ? 'REJECTED' : 'CANCELLED') as Status } : e));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (slug: string, title: string) => {
    if (!confirm(`Da li ste sigurni da želite obrisati događaj "${title}"?`)) return;
    
    try {
      const res = await fetch(`/api/events/${slug}`, { method: 'DELETE' });
      if (res.ok) {
        setEvents(prev => prev.filter(e => e.slug !== slug));
      } else {
        alert('Greška pri brisanju.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-green-400/10 text-green-400';
      case 'PENDING': return 'bg-yellow-400/10 text-yellow-400';
      case 'REJECTED': return 'bg-red-400/10 text-red-400';
      case 'CANCELLED': return 'bg-gray-400/10 text-gray-400';
      default: return 'bg-surface text-muted';
    }
  };

  // Događaj je završen kada prođe njegov krajnji termin
  const isEventFinished = (event: any) => {
    return event.endDateTime && new Date(event.endDateTime) < new Date();
  };

  return (
    <>
      <AdminHeader title="Upravljanje događajima" />
      <main className="p-8 space-y-6 animate-fade-up relative z-[1]">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex flex-grow max-w-md relative group w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Traži događaje..." 
              className="w-full pl-12 pr-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:border-primary transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select 
              className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Svi statusi</option>
              <option value="PUBLISHED">Objavljeno</option>
              <option value="PENDING">Na čekanju</option>
              <option value="CANCELLED">Otkazano</option>
              <option value="REJECTED">Odbijeno</option>
            </select>
            <Link href="/admin/events/new" className="flex items-center gap-2 px-6 py-2.5 bg-primary text-text font-bold rounded-xl hover:bg-primary-hover transition-colors text-sm shadow-lg shadow-primary/20 whitespace-nowrap">
              <Plus size={18} /> NOVI DOGAĐAJ
            </Link>
          </div>
        </div>

        {/* Events Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface/50 border-b border-border">
                  <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Događaj</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Lokal</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Datum / Vrijeme</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Kategorija</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider text-right">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                   Array.from({ length: 5 }).map((_, i) => (
                     <tr key={i} className="animate-pulse">
                       <td colSpan={6} className="px-6 py-8"><div className="h-4 bg-surface rounded w-full"></div></td>
                     </tr>
                   ))
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted italic">Nema pronađenih događaja.</td>
                  </tr>
                ) : (
                  events.map((event) => { const finished = isEventFinished(event); return (
                    <tr key={event.id} className={`transition-colors ${finished ? 'opacity-60 hover:bg-surface/30' : 'hover:bg-surface/30'}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-surface flex-shrink-0 flex items-center justify-center text-xs text-border">
                            {event.imageUrl ? <img src={event.imageUrl} className="w-full h-full object-cover rounded-lg" alt="" /> : '📷'}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-text line-clamp-1">{event.title}</p>
                            <p className="text-xs text-muted">{event.featured && '⭐ Featured'} {event.promoted && '🔥 Promoted'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium">{event.venue.name}</span>
                        {(event.additionalVenues && event.additionalVenues.length > 0) && (
                          <span className="ml-1.5 text-[10px] font-bold text-primary uppercase tracking-widest">+{event.additionalVenues.length}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p>{new Date(event.startDateTime).toLocaleDateString('bs')}</p>
                          <p className="text-xs text-muted">{new Date(event.startDateTime).toLocaleTimeString('bs', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-surface border border-border">
                          {event.category === 'PARTY' ? 'Žurka' : 'Svirka'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {finished ? (
                          <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-gray-500/10 text-gray-400 border border-gray-500/20 inline-flex items-center gap-1.5">
                            <Clock size={12} /> ZAVRŠENO
                          </span>
                        ) : (
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getStatusColor(event.status)}`}>
                            {event.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {user?.role === 'ADMIN' && event.status === 'PENDING' && (
                            <button 
                              onClick={() => handleStatusChange(event.id, 'approve')}
                              className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                              title="Odobri"
                            >
                              <CheckCircle size={18} />
                            </button>
                          )}
                          <Link href={`/events/${event.slug}`} className="p-2 text-muted hover:text-text hover:bg-surface rounded-lg transition-colors">
                            <Eye size={18} />
                          </Link>
                          {finished ? (
                            <span className="p-2 text-muted/40 cursor-not-allowed" title="Događaj je završen — uređivanje nije moguće">
                              <Edit size={18} />
                            </span>
                          ) : (
                            <Link href={`/admin/events/${event.id}`} className="p-2 text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <Edit size={18} />
                            </Link>
                          )}
                          {(user?.role === 'ADMIN' || (user?.role === 'OWNER' && (event.status === 'PENDING' || finished))) && (
                            <button 
                              onClick={() => handleDelete(event.slug, event.title)}
                              className="p-2 text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                              title="Obriši"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ); })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
