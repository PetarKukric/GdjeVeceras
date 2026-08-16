import React from 'react';
import { AdminSidebar } from '@/components/admin/AdminLayout';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

// Važno: session provjera se mora raditi u runtime-u (ne pri build-u),
// inače Next.js prerenderuje /admin kao statički redirect na /login
// i logovani korisnici upadaju u redirect petlju u produkciji.
export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
    redirect('/login');
  }
  
  return (
    <div className="flex min-h-screen bg-background text-text relative z-0 overflow-x-clip">
      <AdminSidebar />
      <div className="flex-grow flex flex-col min-w-0 overflow-x-clip">
        {children}
      </div>
    </div>
  );
}
