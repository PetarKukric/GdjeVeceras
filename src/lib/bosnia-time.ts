/**
 * Pomoćne funkcije za vrijeme — vremenska zona Europe/Sarajevo.
 *
 * PROBLEM koji ovo rješava: browser šalje "2026-08-21T22:00" (lokalno vrijeme),
 * a Vercel server radi u UTC. Ako server protumači taj string kao UTC, događaj
 * koji je korisnik unio za petak 22:00 u BiH postane subota 00:00 po lokalnom
 * vremenu — zato se događaji "pomjeraju" za jedan dan.
 *
 * Pravilo: iz forme se UVEĆ šalje ISO string (UTC), a "danas/sutra/vikend"
 * granice na serveru se računaju po sarajevskom vremenu.
 */

/** Offset Sarajeva u odnosu na UTC za dati trenutak (u ms, pozitivan ljeti). */
export function getSarajevoOffsetMs(date: Date): number {
  try {
    const utc = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds()
    );
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Sarajevo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    const sarajevoAsUTC = Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour') % 24,
      get('minute'),
      get('second')
    );
    return sarajevoAsUTC - utc;
  } catch {
    return 0;
  }
}

/** "Sada" pomjereno u sarajevsku vremensku zonu (polja getFullYear/getDate... su sarajevska). */
export function getSarajevoNow(): Date {
  const now = new Date();
  return new Date(now.getTime() + getSarajevoOffsetMs(now));
}

/** Početak dana u Sarajevu, kao apsolutni UTC trenutak. */
export function sarajevoStartOfDay(sarajevoNow: Date): Date {
  const offset = getSarajevoOffsetMs(new Date());
  const sod = Date.UTC(
    sarajevoNow.getUTCFullYear(),
    sarajevoNow.getUTCMonth(),
    sarajevoNow.getUTCDate(),
    0, 0, 0, 0
  ) - offset;
  return new Date(sod);
}

/**
 * Vrijednost iz <input type="datetime-local"> ("2026-08-21T22:00", lokalno
 * vrijeme korisnika) → ISO string (UTC). Koristi se pri slanju na server.
 */
export function toISOFromLocalInput(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toISOString();
}

/**
 * Date (UTC iz baze) → vrijednost za <input type="datetime-local">
 * prikazana u LOKALNOM vremenu korisnika.
 */
export function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
