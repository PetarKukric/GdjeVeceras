'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  MessageSquare, 
  Send, 
  Trash2, 
  ShieldAlert, 
  Loader2, 
} from 'lucide-react';
import { ClientOnly } from '@/components/ui/ClientOnly';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';

interface User {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: User;
}

interface CommentSectionProps {
  eventId?: string;
  venueId?: string;
  currentUser: any;
}

export function CommentSection({ eventId, venueId, currentUser }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const { showToast } = useToast();

  const fetchComments = useCallback(async (pageNum = 1, append = false) => {
    try {
      const idParam = eventId ? `eventId=${eventId}` : `venueId=${venueId}`;
      const res = await fetch(`/api/comments?${idParam}&page=${pageNum}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        if (append) {
          setComments(prev => [...prev, ...data.comments]);
        } else {
          setComments(data.comments);
        }
        setHasMore(data.hasMore);
        setTotalCount(data.total);
      }
    } catch {
      console.error('Failed to fetch comments');
    } finally {
      setLoading(false);
    }
  }, [eventId, venueId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment.trim(),
          eventId: eventId || null,
          venueId: venueId || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setComments(prev => [data, ...prev]);
        setNewComment('');
        setTotalCount(prev => prev + 1);
        showToast('Komentar objavljen');
      } else {
        setError(data.error || 'Greška pri objavi komentara.');
      }
    } catch {
      setError('Mrežna greška. Pokušajte ponovo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Da li želite obrisati ovaj komentar?')) return;

    try {
      const res = await fetch(`/api/comments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== id));
        setTotalCount(prev => Math.max(0, prev - 1));
        showToast('Komentar obrisan', 'info');
      } else {
        const data = await res.json();
        alert(data.error || 'Greška pri brisanju.');
      }
    } catch {
      alert('Mrežna greška.');
    }
  };

  const handleReport = async (id: string) => {
    const reason = prompt('Razlog prijave (Spam, Uznemiravanje, Neprimjeren sadržaj, Lažne informacije, Ostalo):');
    if (!reason) return;

    try {
      const res = await fetch('/api/chat/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          targetId: id, 
          reason,
          details: `Prijava komentara (ID: ${id})`
        }),
      });
        if (res.ok) {
          showToast('Komentar prijavljen', 'info');
        }
      } catch {}
  };

  return (
    <section className="mt-16 space-y-10 animate-fade-up">
      <div className="flex items-center justify-between border-b border-border/50 pb-6">
        <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
          <MessageSquare className="text-primary" size={28} /> 
          Komentari <span className="text-primary ml-1">{totalCount}</span>
        </h2>
      </div>

      {/* Comment Input */}
      <div className="bg-surface/50 border border-border/50 p-8 rounded-3xl shadow-xl">
        {currentUser ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-start gap-4">
               <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-black uppercase shrink-0">
                  {currentUser.name?.substring(0, 2) || 'U'}
               </div>
               <div className="flex-grow">
                  <textarea
                    placeholder="Napiši komentar..."
                    className="w-full bg-background border border-white/5 rounded-[1.5rem] p-5 text-sm font-medium focus:outline-none focus:border-primary transition-all min-h-[120px] resize-none text-white placeholder:text-muted/30 shadow-inner"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    maxLength={1000}
                  ></textarea>
                  <div className="flex justify-between items-center mt-2">
                     <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{newComment.length}/1000</p>
                     {error && <p className="text-red-500 text-[10px] font-bold uppercase">{error}</p>}
                  </div>
               </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="px-10 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 uppercase tracking-[0.2em] text-[10px] flex items-center gap-2 disabled:opacity-50 disabled:grayscale"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    OBJAVLJIVANJE...
                  </>
                ) : (
                  <>
                    OBJAVI <Send size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-6">
            <p className="text-muted font-medium mb-6">Prijavite se da biste ostavili komentar.</p>
            <Link 
              href="/login"
              className="px-10 py-4 bg-white text-background font-black rounded-2xl uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-white/5 hover:bg-primary hover:text-white transition-all"
            >
              PRIJAVA
            </Link>
          </div>
        )}
      </div>

      {/* Comments List */}
      <div className="space-y-6">
        {loading ? (
          <div className="py-10 text-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          </div>
        ) : comments.length === 0 ? (
          <div className="py-20 text-center opacity-40">
             <MessageSquare size={48} className="mx-auto mb-4" />
             <p className="font-bold uppercase tracking-widest text-xs">Još nema komentara.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-8">
              {comments.map((comment) => (
                <div 
                  key={comment.id}
                  className="bg-card/40 backdrop-blur-sm border border-white/5 p-8 rounded-3xl hover:border-primary/20 transition-all group shadow-xl"
                >
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-surface border border-border/50 flex items-center justify-center text-primary text-xs font-black uppercase shadow-lg">
                        {comment.user.avatarUrl ? (
                          <img src={comment.user.avatarUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                          comment.user.name.substring(0, 2)
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <h4 className="text-sm font-black text-white uppercase tracking-tight">{comment.user.name}</h4>
                           {comment.user.id === currentUser?.id && (
                             <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase">VI</span>
                           )}
                        </div>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">
                          <ClientOnly fallback={<span>...</span>}>
                            {new Date(comment.createdAt).toLocaleDateString('bs', { day: 'numeric', month: 'short', year: 'numeric' })} u {new Date(comment.createdAt).toLocaleTimeString('bs', { hour: '2-digit', minute: '2-digit' })}
                          </ClientOnly>
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      {currentUser && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          {comment.user.id === currentUser.id || currentUser.role === 'ADMIN' ? (
                            <button 
                              onClick={() => handleDelete(comment.id)}
                              className="p-3 text-muted hover:text-red-500 transition-all"
                              title="Obriši"
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleReport(comment.id)}
                              className="p-3 text-muted hover:text-primary transition-all"
                              title="Prijavi"
                            >
                              <ShieldAlert size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-muted leading-relaxed font-medium whitespace-pre-wrap pl-1">
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="pt-8 text-center">
                <button
                  onClick={() => {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    fetchComments(nextPage, true);
                  }}
                  className="px-10 py-4 bg-surface border border-border/50 text-white font-black rounded-2xl uppercase tracking-[0.2em] text-[10px] hover:bg-card transition-all"
                >
                  UČITAJ JOŠ KOMENTARA
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
