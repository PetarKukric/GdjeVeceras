'use client';

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send} from 'lucide-react';
import { useRouter } from 'next/navigation';

const Instagram = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);

const Facebook = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);

const TikTok = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
);

import { useToast } from '@/components/ui/Toast';

export default function ContactPage() {
  const router = useRouter();
  const { showToast } = useToast();
  
  // Safe icons
  const socialIcons = [
    { icon: Instagram, label: 'Instagram', link: 'https://www.instagram.com/gdjeveceras' },
    { icon: Facebook, label: 'Facebook', link: 'https://www.facebook.com/share/1EaMwFTjic/?mibextid=wwXIfr' },
    { icon: TikTok, label: 'TikTok', link: 'https://www.tiktok.com/@gdjeveceras2' }
  ];
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    venueId: ''
  });
  const [venues, setVenues] = useState<{ id: string, name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    async function fetchVenues() {
      try {
        const res = await fetch('/api/venues');
        if (res.ok) {
          const data = await res.json();
          setVenues(data);
        }
      } catch {
        console.error('Failed to fetch venues');
      }
    }
    fetchVenues();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        showToast('Poruka uspješno poslana');
        setFormData({ name: '', email: '', subject: '', message: '', venueId: '' });
      } else {
        setError(data.error || 'Došlo je do greške. Pokušajte ponovo.');
      }
    } catch {
      setError('Mrežna greška. Pokušajte ponovo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      <main className="flex-grow max-w-7xl mx-auto px-4 py-20 w-full animate-fade-up">
        
        <header className="mb-20 text-center md:text-left">
          <div className="bg-primary/10 border border-primary/20 w-fit px-4 py-1.5 rounded-full text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-6 mx-auto md:mx-0">
             Get In Touch
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter uppercase mb-4 sm:mb-6 leading-tight break-words">
            Kontaktirajte <span className="text-primary italic">Nas</span>
          </h1>
          <p className="text-muted text-lg font-medium max-w-2xl mx-auto md:mx-0 leading-relaxed">
            Imate pitanje, sugestiju ili želite da sarađujete sa nama? Pišite nam i odgovorićemo vam u najkraćem mogućem roku.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          
          {/* Contact Form */}
          <div className="bg-surface/50 border border-border/50 p-5 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-2xl relative overflow-hidden">
            <h2 className="text-2xl font-black uppercase mb-8 tracking-tight">Pošaljite poruku</h2>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-bold mb-6">
                {error}
              </div>
            )}

            {success ? (
              <div className="py-20 text-center animate-fade-up">
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Send className="text-primary" size={32} />
                </div>
                <h3 className="text-2xl font-black uppercase mb-2">Poruka poslata!</h3>
                <p className="text-muted">Poruka je uspješno poslana. Odgovorićemo vam uskoro.</p>
                <button 
                  onClick={() => setSuccess(false)}
                  className="mt-8 px-10 py-4 bg-primary text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
                >
                  POŠALJI NOVU PORUKU
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Lokal</label>
                  <select 
                    className="w-full h-14 px-6 bg-background border border-border/50 rounded-2xl text-sm focus:outline-none focus:border-primary transition-all appearance-none"
                    value={formData.venueId}
                    onChange={(e) => setFormData({...formData, venueId: e.target.value})}
                  >
                    <option value="">OPŠTI UPIT (ADMIN) ▼</option>
                    {venues.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Ime</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Vaše ime"
                      className="w-full h-14 px-6 bg-background border border-border/50 rounded-2xl text-sm focus:outline-none focus:border-primary transition-all"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Email</label>
                    <input 
                      type="email" 
                      required
                      placeholder="tvoj@email.com"
                      className="w-full h-14 px-6 bg-background border border-border/50 rounded-2xl text-sm focus:outline-none focus:border-primary transition-all"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Naslov</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Naslov poruke"
                    className="w-full h-14 px-6 bg-background border border-border/50 rounded-2xl text-sm focus:outline-none focus:border-primary transition-all"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Poruka</label>
                  <textarea 
                    required
                    placeholder="Vaša poruka..."
                    rows={5}
                    className="w-full p-6 bg-background border border-border/50 rounded-[1.5rem] text-sm focus:outline-none focus:border-primary transition-all resize-none"
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                  ></textarea>
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full h-16 bg-primary text-white font-black rounded-2xl hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSubmitting ? 'SLANJE...' : <>POŠALJI PORUKU <Send size={16} /></>}
                </button>
              </form>
            )}
            
            {/* Background Glow */}
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
          </div>

          {/* Contact Info */}
          <div className="space-y-12">
            <div className="space-y-8">
              <h2 className="text-2xl font-black uppercase tracking-tight">Informacije</h2>
              <div className="space-y-6">
                <div className="flex items-center gap-4 sm:gap-6 group min-w-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-surface border border-border/50 flex items-center justify-center text-primary shadow-xl group-hover:border-primary/30 transition-all shrink-0">
                    <Mail size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Email</p>
                    <p className="text-lg font-bold text-white break-words">gdjevecerasbusiness@gmail.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:gap-6 group min-w-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-surface border border-border/50 flex items-center justify-center text-primary shadow-xl group-hover:border-primary/30 transition-all shrink-0">
                    <Phone size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Telefon</p>
                    <p className="text-lg font-bold text-white break-words">+387 66 771 086</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:gap-6 group min-w-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-surface border border-border/50 flex items-center justify-center text-primary shadow-xl group-hover:border-primary/30 transition-all shrink-0">
                    <MapPin size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Lokacija</p>
                    <p className="text-lg font-bold text-white break-words">Bosna i Hercegovina</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <h2 className="text-2xl font-black uppercase tracking-tight">Pratite nas</h2>
              <div className="flex gap-4">
                {socialIcons.map((social, i) => (
                  <a 
                    key={i}
                    href={social.link}
                    className="w-16 h-16 rounded-2xl bg-surface border border-border/50 flex items-center justify-center text-muted hover:text-primary hover:border-primary/30 transition-all shadow-xl group"
                  >
                    {social.icon && <social.icon size={28} className="group-hover:scale-110 transition-transform" />}
                  </a>
                ))}
              </div>
            </div>

            <div className="bg-accent/5 border border-accent/20 p-8 rounded-3xl relative overflow-hidden">
               <div className="relative z-10">
                 <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2">Vlasnik ste lokala?</h4>
                 <p className="text-muted text-[11px] leading-relaxed mb-6 uppercase tracking-wide">Ako želite da vaš lokal i događaji budu na našem sajtu, slobodno nas kontaktirajte putem forme ili direktno na email.</p>
                 <button 
                  onClick={() => router.push('/signup')}
                  className="text-accent text-[9px] font-black uppercase tracking-[0.3em] hover:text-white transition-colors"
                >
                  PRIDRUŽITE SE MREŽI →
                </button>
               </div>
               <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-3xl rounded-full" />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
