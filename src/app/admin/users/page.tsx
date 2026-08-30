'use client';

import React, { useEffect, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminLayout';
import { Trash2, Ban, ShieldCheck } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState<{ id: string, name: string, email: string, role: string, restricted?: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);


  const handleToggleRestrict = async (id: string, restricted: boolean | undefined) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restricted: !restricted }),
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const e = await res.json();
        alert('Greška: ' + e.error);
      }
    } catch {
      alert('Mrežna greška.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Da li ste sigurni da želite obrisati korisnika "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'Greška pri brisanju');
      }
    } catch {
      alert('Došlo je do greške pri brisanju.');
    }
  };

  return (
    <>
      <AdminHeader title="Korisnici" />
      <main className="p-4 md:p-8 animate-fade-up relative z-[1]">
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface/50 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-[0.2em]">Korisnik</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-[0.2em]">Email</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-[0.2em]">Uloga</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-[0.2em] text-right">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={4} className="p-12 text-center animate-pulse text-muted italic">Učitavanje korisnika...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={4} className="p-12 text-center text-muted">Nema registrovanih korisnika.</td></tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-surface/30 transition-colors group">
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-bold text-primary uppercase">
                                {user.name?.substring(0, 2) || 'U'}
                            </div>
                            <span className="font-bold text-sm">{user.name || 'Bez imena'}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${user.role === 'ADMIN' ? 'bg-purple-400/10 text-purple-400 border border-purple-400/20' : user.role === 'OWNER' ? 'bg-blue-400/10 text-blue-400 border border-blue-400/20' : 'bg-surface text-muted border border-border'}`}>
                        {user.role}
                      </span>
                      {user.restricted && (
                        <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                          Ograničen
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                      {user.role !== 'ADMIN' && (
                        <button
                          onClick={() => handleToggleRestrict(user.id, user.restricted)}
                          className={`p-2 rounded-xl transition-all ${user.restricted ? 'text-green-400 hover:bg-green-400/10' : 'text-muted hover:text-red-400 hover:bg-red-400/10'}`}
                          title={user.restricted ? 'Skini ograničenje' : 'Ograniči korisnika (ne može se prijaviti)'}
                          aria-label={user.restricted ? 'Skini ograničenje korisniku' : 'Ograniči korisnika'}
                        >
                          {user.restricted ? <ShieldCheck size={18} /> : <Ban size={18} />}
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(user.id, user.name || user.email)}
                        className="p-2 text-muted hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                        title="Obriši korisnika"
                      >
                        <Trash2 size={18} />
                      </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </main>
    </>
  );
}
