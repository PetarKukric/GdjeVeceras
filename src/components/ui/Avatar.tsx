import { initials } from '@/lib/score';

/** Profilna slika ili inicijali. `className` bira stil (npr. "avatar", "row__av"). */
export function Avatar({ name, url, className = 'avatar' }: { name: string | null | undefined; url?: string | null; className?: string }) {
  return (
    <span className={`${className}${url ? ' has-img' : ''}`} aria-hidden="true">
      {url ? <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" /> : initials(name)}
    </span>
  );
}
