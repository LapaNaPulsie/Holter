/**
 * Operacje na datach i godzinach zapisanych jako tekst ("RRRR-MM-DD", "GG:MM").
 * Obliczenia korzystają wyłącznie z Date.UTC, więc wynik nie zależy od strefy czasowej
 * urządzenia ani serwera i nie ma przesunięć przy zmianie czasu letniego/zimowego.
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const pad2 = (n: number) => String(n).padStart(2, '0');

export function isValidDate(s: string): boolean {
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < 2000 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function isValidTime(s: string): boolean {
  return TIME_RE.test(s);
}

/** Liczba minut od 1970-01-01 00:00 „czasu ściennego” – tylko do porównań i różnic. */
export function toMinutes(date: string, time: string): number {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return Date.UTC(y, mo - 1, d) / 60000 + h * 60 + mi;
}

export function addDays(date: string, days: number): string {
  const [y, mo, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

/** "2026-11-18" → "18.11.2026" */
export function formatDate(date: string): string {
  if (!isValidDate(date)) return date;
  const [y, mo, d] = date.split('-');
  return `${d}.${mo}.${y}`;
}

/** "2026-11-18" → "18.11" */
export function formatShortDate(date: string): string {
  return formatDate(date).slice(0, 5);
}

const WEEKDAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];

export function weekday(date: string): string {
  const [y, mo, d] = date.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
}

export function formatDateTime(date: string, time: string): string {
  return `${formatDate(date)}, ${time}`;
}

/** 505 → "8 h 25 min", 45 → "45 min", 120 → "2 h" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/**
 * Koniec aktywności: godzina zakończenia wcześniejsza niż godzina rozpoczęcia
 * oznacza zakończenie następnego dnia (np. 23:30–00:15).
 */
export function activityEnd(date: string, startTime: string, endTime: string): { endDate: string; nextDay: boolean; minutes: number } | null {
  if (!endTime || !isValidDate(date) || !isValidTime(startTime) || !isValidTime(endTime)) return null;
  const nextDay = endTime < startTime;
  const endDate = nextDay ? addDays(date, 1) : date;
  return { endDate, nextDay, minutes: toMinutes(endDate, endTime) - toMinutes(date, startTime) };
}

/** Aktualna data i godzina urządzenia (tylko w przeglądarce). */
export function nowLocal(d = new Date()): { date: string; time: string; stamp: string } {
  const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return { date, time, stamp: `${date} ${time}` };
}

/**
 * Zamienia wpisany tekst na godzinę "GG:MM" (zegar 24-godzinny).
 * Akceptuje m.in. "9:30", "09.30", "0930", "930", "21 05", "7" → "07:00".
 * Zwraca null, jeśli tekst nie jest poprawną godziną.
 */
export function normalizeTime(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  let h: number;
  let m: number;
  const sep = /^(\d{1,2})\s*[:.,\s-]\s*(\d{1,2})$/.exec(s);
  if (sep) {
    h = Number(sep[1]);
    m = Number(sep[2]);
    if (sep[2].length === 1) return null;
  } else if (/^\d{1,4}$/.test(s)) {
    if (s.length <= 2) {
      h = Number(s);
      m = 0;
    } else {
      h = Number(s.slice(0, s.length - 2));
      m = Number(s.slice(-2));
    }
  } else {
    return null;
  }
  if (h > 23 || m > 59) return null;
  return `${pad2(h)}:${pad2(m)}`;
}
