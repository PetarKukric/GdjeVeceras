/**
 * PONAVLJUĆI DOGAĐAJI — jezgro logike.
 *
 * Princip: u bazi stoji JEDAN roditeljski Event sa pravilom ponavljanja
 * (isRecurring, recurrenceType, recurrenceDays, recurrenceStart/End).
 * Termini (occurrences) se RAČUNAJU u zadatom vremenskom opsegu — nikad
 * se ne generišu redovi unaprijed.
 *
 * Identitet termina: roditeljski event id + lokalni datum termina (Sarajevo),
 * npr. "abc123_2026-09-11". Javni URL termina: /events/[slug]?date=2026-09-11.
 *
 * Vremenska zona: Europe/Sarajevo (kao ostatak aplikacije). Datum termina je
 * zidni datum POČETKA termina — događaj 22:00→03:00 pripada danu početka.
 */
import { getSarajevoOffsetMs } from './bosnia-time';

export type RecurrenceType = 'DAILY' | 'WEEKLY';

export interface OccurrenceException {
  isCancelled?: boolean;
  startDateTime?: string | Date | null;
  endDateTime?: string | Date | null;
  title?: string | null;
  performers?: string | null;
}

export type ExceptionMap = Record<string, OccurrenceException>;

export interface RecurringEventLike {
  id: string;
  title: string;
  startDateTime: string | Date;
  endDateTime?: string | Date | null;
  isRecurring?: boolean;
  recurrenceType?: string | null;
  recurrenceDays?: string | null;
  recurrenceStart?: string | Date | null;
  recurrenceEnd?: string | Date | null;
  [key: string]: unknown;
}

export interface ExpandedOccurrence {
  occurrenceDate: string;
  occurrenceId: string;
  isOccurrence: true;
  startDateTime: Date;
  endDateTime: Date;
  title: string;
  parentEventId: string;
  [key: string]: unknown;
}

// ============ DATUMSKI POMOĆNI (Sarajevo) ============

/** UTC trenutak → sarajevski lokalni datum kao "YYYY-MM-DD". */
export function toSarajevoDateString(d: Date): string {
  const local = new Date(d.getTime() + getSarajevoOffsetMs(d));
  return local.toISOString().slice(0, 10);
}

/** Zidno vrijeme (sat/minuta) u Sarajevu za dati UTC trenutak. */
function sarajevoWallTime(d: Date): { h: number; m: number } {
  const local = new Date(d.getTime() + getSarajevoOffsetMs(d));
  return { h: local.getUTCHours(), m: local.getUTCMinutes() };
}

/** Lokalni sarajevski datum + sat/minuta → UTC trenutak (DST-safe preko podne-sonde). */
export function sarajevoLocalToUtc(dateStr: string, h: number, m: number): Date {
  const probe = new Date(`${dateStr}T12:00:00Z`);
  const offset = getSarajevoOffsetMs(probe);
  const [y, mo, dd] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, dd, h, m, 0) - offset);
}

/** Dan sedmice (0=ned..6=sub) za lokalni datum "YYYY-MM-DD". */
function dayOfWeek(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay();
}

/** Sljedeći lokalni datum "YYYY-MM-DD" nakon datog. */
function nextDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Parse JSON niza dana iz baze ("[5,6]") → [5,6]. */
export function parseRecurrenceDays(raw?: string | null): number[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(Number).filter((n) => n >= 0 && n <= 6) : [];
  } catch {
    return [];
  }
}

/** Mapa izuzetaka [{occurrenceDate, ...}] → { "2026-09-11": {...} }. */
export function toExceptionMap(list: any[] | undefined | null): ExceptionMap {
  const map: ExceptionMap = {};
  if (Array.isArray(list)) {
    for (const ex of list) {
      if (ex && ex.occurrenceDate) map[ex.occurrenceDate] = ex;
    }
  }
  return map;
}

// ============ EXPANZIJA (bounded!) ============

const MAX_ITERACIJA = 400; // sigurnosna granica (nikad do beskonačnosti)

/**
 * Računa termine ponavljajućeg događaja unutar [from, to] (UTC trenuci).
 * Vraća occurrence objekte: {...roditelj, startDateTime/endDateTime termina,
 * occurrenceDate, occurrenceId, isOccurrence}. Otkazani termini se preskaču,
 * override-i (vrijeme/naslov) iz izuzetaka se primjenjuju.
 */
export function expandRecurringEvent(
  event: RecurringEventLike,
  from: Date,
  to: Date,
  exceptions: ExceptionMap = {}
): ExpandedOccurrence[] {
  if (!event.isRecurring || !event.recurrenceStart) return [];

  const type = event.recurrenceType === 'DAILY' ? 'DAILY' : 'WEEKLY';
  const weeklyDays = type === 'WEEKLY' ? parseRecurrenceDays(event.recurrenceDays) : null;
  if (type === 'WEEKLY' && weeklyDays!.length === 0) return [];

  const parentStart = new Date(event.startDateTime);
  const parentEnd = event.endDateTime ? new Date(event.endDateTime) : null;
  const durationMs = parentEnd ? parentEnd.getTime() - parentStart.getTime() : 4 * 60 * 60 * 1000;
  if (durationMs < 0) return [];
  const wall = sarajevoWallTime(parentStart);

  const startBound = toSarajevoDateString(new Date(event.recurrenceStart));
  const endBound = event.recurrenceEnd ? toSarajevoDateString(new Date(event.recurrenceEnd)) : null;

  const out: ExpandedOccurrence[] = [];
  let cursor = toSarajevoDateString(from);
  const toStr = toSarajevoDateString(to);

  for (let i = 0; i < MAX_ITERACIJA && cursor <= toStr; i++) {
    if (cursor >= startBound && (!endBound || cursor <= endBound)) {
      const matchesRule = type === 'DAILY' || weeklyDays!.includes(dayOfWeek(cursor));
      if (matchesRule) {
        const ex = exceptions[cursor];
        if (!ex?.isCancelled) {
          const start = ex?.startDateTime
            ? new Date(ex.startDateTime)
            : sarajevoLocalToUtc(cursor, wall.h, wall.m);
          if (start >= from && start <= to) {
            const end = ex?.endDateTime
              ? new Date(ex.endDateTime)
              : new Date(start.getTime() + durationMs);
            out.push({
              ...(event as any),
              title: (ex?.title as string) || event.title,
              performers: (ex?.performers as string) ?? (event as any).performers ?? null,
              startDateTime: start,
              endDateTime: end,
              occurrenceDate: cursor,
              occurrenceId: `${event.id}_${cursor}`,
              isOccurrence: true,
              parentEventId: event.id,
            });
          }
        }
      }
    }
    cursor = nextDate(cursor);
  }
  return out;
}

/**
 * Računa JEDAN termin za datum (direktan URL pristup /events/slug?date=...).
 * Vraća null ako taj datum nije validan termin pravila (ili je otkazan).
 * Range se NE ograničava (smije biti i prošli termin).
 */
export function resolveOccurrence(
  event: RecurringEventLike,
  dateStr: string,
  exceptions: ExceptionMap = {}
): ExpandedOccurrence | null {
  if (!event.isRecurring || !event.recurrenceStart) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;

  const type = event.recurrenceType === 'DAILY' ? 'DAILY' : 'WEEKLY';
  const weeklyDays = type === 'WEEKLY' ? parseRecurrenceDays(event.recurrenceDays) : null;
  if (type === 'WEEKLY' && !weeklyDays!.includes(dayOfWeek(dateStr))) return null;

  const startBound = toSarajevoDateString(new Date(event.recurrenceStart));
  if (dateStr < startBound) return null;
  const endBound = event.recurrenceEnd ? toSarajevoDateString(new Date(event.recurrenceEnd)) : null;
  if (endBound && dateStr > endBound) return null;

  const ex = exceptions[dateStr];
  if (ex?.isCancelled) return null;

  const parentStart = new Date(event.startDateTime);
  const parentEnd = event.endDateTime ? new Date(event.endDateTime) : null;
  const durationMs = parentEnd ? parentEnd.getTime() - parentStart.getTime() : 4 * 60 * 60 * 1000;
  const wall = sarajevoWallTime(parentStart);

  const start = ex?.startDateTime ? new Date(ex.startDateTime) : sarajevoLocalToUtc(dateStr, wall.h, wall.m);
  const end = ex?.endDateTime ? new Date(ex.endDateTime) : new Date(start.getTime() + Math.max(durationMs, 0));

  return {
    ...(event as any),
    title: (ex?.title as string) || event.title,
    performers: (ex?.performers as string) ?? (event as any).performers ?? null,
    startDateTime: start,
    endDateTime: end,
    occurrenceDate: dateStr,
    occurrenceId: `${event.id}_${dateStr}`,
    isOccurrence: true,
    parentEventId: event.id,
  };
}

/**
 * Validacija pravila ponavljanja (server-side). Vraća čiste DB vrijednosti
 * ili { error } sa porukom na bosanskom.
 */
export function validateRecurrenceInput(body: any): { data: any; error?: string } {
  if (!body.isRecurring) {
    return { data: { isRecurring: false, recurrenceType: null, recurrenceDays: null, recurrenceStart: null, recurrenceEnd: null } };
  }
  const type = body.recurrenceType === 'DAILY' ? 'DAILY' : 'WEEKLY';
  let days: number[] = [];
  if (type === 'WEEKLY') {
    days = Array.isArray(body.recurrenceDays)
      ? Array.from(new Set(body.recurrenceDays.map(Number).filter((n: number) => Number.isInteger(n) && n >= 0 && n <= 6)))
      : [];
    if (days.length === 0) {
      return { data: null, error: 'Odaberite barem jedan dan ponavljanja.' };
    }
  }
  const start = body.recurrenceStart ? new Date(body.recurrenceStart) : new Date(body.startDateTime);
  if (isNaN(start.getTime())) {
    return { data: null, error: 'Neispravan datum početka ponavljanja.' };
  }
  let end: Date | null = null;
  if (body.recurrenceEnd && !body.noRecurrenceEnd) {
    end = new Date(body.recurrenceEnd);
    if (isNaN(end.getTime())) return { data: null, error: 'Neispravan datum završetka ponavljanja.' };
    // poredi samo datume (ignoriši vrijeme u danu)
    if (end.toISOString().slice(0, 10) < start.toISOString().slice(0, 10)) {
      return { data: null, error: 'Datum završetka ne može biti prije datuma početka.' };
    }
  }
  return {
    data: {
      isRecurring: true,
      recurrenceType: type,
      recurrenceDays: type === 'WEEKLY' ? JSON.stringify(days.sort((a, b) => a - b)) : null,
      recurrenceStart: start,
      recurrenceEnd: end,
    },
  };
}

/** Explosion proširena lista za više roditelja odjednom (bez N+1 — izuzeci se prosljede). */
export function expandRecurringEvents(
  events: RecurringEventLike[],
  from: Date,
  to: Date,
  exceptionsByParent: Record<string, ExceptionMap> = {}
): ExpandedOccurrence[] {
  return events.flatMap((e) => expandRecurringEvent(e, from, to, exceptionsByParent[e.id] || {}));
}
