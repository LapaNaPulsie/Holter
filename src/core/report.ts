import type { Diary, Entry, EntryKind, SleepEntry } from './types';
import { activityName, KIND_LABEL, speciesText, symptomName } from './labels';
import { activityEnd, formatDate, formatDateTime, formatDuration, formatShortDate, isValidDate, isValidTime, toMinutes, weekday } from './time';

/**
 * Wspólny model raportu. Z tego samego modelu powstaje podgląd w aplikacji,
 * plik PDF do pobrania oraz załącznik e-maila (generowany na serwerze),
 * więc wszystkie trzy pokazują te same dane w tej samej kolejności.
 */

export type ItemKind = EntryKind | 'wake';

export interface Detail {
  label: string;
  value: string;
}

export interface TimelineItem {
  key: string;
  entryId: string;
  kind: ItemKind;
  kindLabel: string;
  date: string;
  time: string;
  timeLabel: string;
  title: string;
  details: Detail[];
  added: string;
}

export interface DayGroup {
  date: string;
  label: string;
  items: TimelineItem[];
}

export interface SleepRow {
  entryId: string;
  start: string;
  end: string;
  duration: string;
  notes: string;
}

export interface MedRow {
  id: string;
  name: string;
  dose: string;
  schedule: string;
  notes: string;
}

export interface ReportModel {
  title: string;
  patientRows: Detail[];
  medications: MedRow[];
  sleeps: SleepRow[];
  days: DayGroup[];
  counts: Record<EntryKind, number>;
  subject: string;
  fileName: string;
}

const KIND_ORDER: Record<ItemKind, number> = { wake: 0, sleep: 1, medication: 2, activity: 3, symptom: 4 };

export function stampLabel(stamp: string): string {
  const [d, t] = stamp.split(' ');
  return isValidDate(d) && t ? formatDateTime(d, t) : stamp;
}

function addedLabel(e: Entry): string {
  let s = e.createdAt ? `Wpis dodany: ${stampLabel(e.createdAt)}` : '';
  if (e.updatedAt) s += `${s ? '; ' : ''}poprawiony: ${stampLabel(e.updatedAt)}`;
  return s;
}

export function sleepDuration(s: SleepEntry): number | null {
  if (!s.endDate || !s.endTime || !isValidDate(s.endDate) || !isValidTime(s.endTime)) return null;
  return toMinutes(s.endDate, s.endTime) - toMinutes(s.startDate, s.startTime);
}

function entryStart(e: Entry): { date: string; time: string } {
  switch (e.kind) {
    case 'activity':
      return { date: e.date, time: e.startTime };
    case 'sleep':
      return { date: e.startDate, time: e.startTime };
    default:
      return { date: e.date, time: e.time };
  }
}

const nonEmpty = (details: Detail[]) => details.filter((d) => d.value.trim() !== '');

export function buildItems(entry: Entry): TimelineItem[] {
  const { date, time } = entryStart(entry);
  const base = { entryId: entry.id, date, time, added: addedLabel(entry) };
  switch (entry.kind) {
    case 'activity': {
      const end = activityEnd(entry.date, entry.startTime, entry.endTime);
      const timeLabel = end
        ? `${entry.startTime}–${entry.endTime}${end.nextDay ? ` (do ${formatShortDate(end.endDate)})` : ''}`
        : entry.startTime;
      return [
        {
          ...base,
          key: entry.id,
          kind: 'activity',
          kindLabel: KIND_LABEL.activity,
          timeLabel,
          title: activityName(entry),
          details: nonEmpty([
            { label: 'Czas trwania', value: end ? formatDuration(end.minutes) : 'godzina zakończenia nie została podana' },
            { label: 'Opis / uwagi', value: entry.notes },
          ]),
        },
      ];
    }
    case 'sleep': {
      const dur = sleepDuration(entry);
      const hasEnd = dur !== null;
      const items: TimelineItem[] = [
        {
          ...base,
          key: entry.id,
          kind: 'sleep',
          kindLabel: KIND_LABEL.sleep,
          timeLabel: entry.startTime,
          title: 'Zaśnięcie',
          details: nonEmpty([
            {
              label: 'Przebudzenie',
              value: hasEnd ? `${formatDateTime(entry.endDate, entry.endTime)} (sen trwał ${formatDuration(dur)})` : 'nie zostało zapisane',
            },
            { label: 'Uwagi o śnie', value: entry.notes },
          ]),
        },
      ];
      if (hasEnd) {
        items.push({
          ...base,
          key: `${entry.id}-wake`,
          kind: 'wake',
          kindLabel: KIND_LABEL.sleep,
          date: entry.endDate,
          time: entry.endTime,
          timeLabel: entry.endTime,
          title: 'Przebudzenie',
          details: [{ label: 'Zaśnięcie', value: `${formatDateTime(entry.startDate, entry.startTime)} (sen trwał ${formatDuration(dur)})` }],
          added: '',
        });
      }
      return items;
    }
    case 'symptom':
      return [
        {
          ...base,
          key: entry.id,
          kind: 'symptom',
          kindLabel: KIND_LABEL.symptom,
          timeLabel: entry.time,
          title: symptomName(entry),
          details: nonEmpty([
            { label: 'Przybliżony czas trwania', value: entry.duration },
            { label: 'Co zwierzę robiło bezpośrednio przed', value: entry.before },
            { label: 'Opis zdarzenia i zachowanie po nim', value: entry.description },
          ]),
        },
      ];
    case 'medication':
      return [
        {
          ...base,
          key: entry.id,
          kind: 'medication',
          kindLabel: KIND_LABEL.medication,
          timeLabel: entry.time,
          title: entry.name,
          details: nonEmpty([
            { label: 'Podana dawka', value: entry.dose },
            { label: 'Uwagi', value: entry.notes },
          ]),
        },
      ];
  }
}

function itemOrder(a: TimelineItem, b: TimelineItem): number {
  const ta = isValidDate(a.date) && isValidTime(a.time) ? toMinutes(a.date, a.time) : Number.MAX_SAFE_INTEGER;
  const tb = isValidDate(b.date) && isValidTime(b.time) ? toMinutes(b.date, b.time) : Number.MAX_SAFE_INTEGER;
  if (ta !== tb) return ta - tb;
  if (KIND_ORDER[a.kind] !== KIND_ORDER[b.kind]) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
  return a.key.localeCompare(b.key);
}

export function dayLabel(date: string): string {
  return isValidDate(date) ? `${weekday(date)}, ${formatDate(date)}` : 'Bez daty';
}

export function buildTimeline(entries: Entry[]): DayGroup[] {
  const items = entries.flatMap(buildItems).sort(itemOrder);
  const days: DayGroup[] = [];
  for (const it of items) {
    let day = days[days.length - 1];
    if (!day || day.date !== it.date) {
      day = { date: it.date, label: dayLabel(it.date), items: [] };
      days.push(day);
    }
    day.items.push(it);
  }
  return days;
}

export function studyPeriodText(d: Diary): string {
  const p = d.patient;
  const start = p.startDate && p.startTime ? formatDateTime(p.startDate, p.startTime) : '–';
  const end = p.endDate && p.endTime ? formatDateTime(p.endDate, p.endTime) : 'nie podano';
  return `${start} – ${end}`;
}

export function emailSubject(d: Diary): string {
  const p = d.patient;
  return `Dzienniczek holterowski — ${p.petName.trim()} ${p.ownerName.trim()} — ${formatDate(p.startDate)}`;
}

function slug(s: string): string {
  return (
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ł/g, 'l')
      .replace(/Ł/g, 'L')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 40) || 'pacjent'
  );
}

export function reportFileName(d: Diary): string {
  const p = d.patient;
  return `dzienniczek-holter-${slug(p.petName)}-${slug(p.ownerName)}-${p.startDate || 'bez-daty'}.pdf`;
}

export function buildReport(d: Diary): ReportModel {
  const p = d.patient;
  const patientRows: Detail[] = nonEmpty([
    { label: 'Imię pacjenta', value: p.petName },
    { label: 'Nazwisko opiekuna', value: p.ownerName },
    { label: 'Gatunek', value: speciesText(p.species, p.speciesOther) },
    { label: 'Rozpoczęcie badania', value: p.startDate && p.startTime ? formatDateTime(p.startDate, p.startTime) : '' },
    { label: 'Zakończenie badania', value: p.endDate && p.endTime ? formatDateTime(p.endDate, p.endTime) : 'nie podano' },
    { label: 'Dodatkowe uwagi', value: p.notes },
  ]);
  const sleepsSorted = d.entries
    .filter((e): e is SleepEntry => e.kind === 'sleep')
    .sort((a, b) => toMinutes(a.startDate, a.startTime) - toMinutes(b.startDate, b.startTime));
  const sleeps: SleepRow[] = sleepsSorted.map((s) => {
    const dur = sleepDuration(s);
    return {
      entryId: s.id,
      start: formatDateTime(s.startDate, s.startTime),
      end: dur !== null ? formatDateTime(s.endDate, s.endTime) : 'nie zapisano',
      duration: dur !== null ? formatDuration(dur) : '–',
      notes: s.notes,
    };
  });
  const counts: Record<EntryKind, number> = { activity: 0, sleep: 0, symptom: 0, medication: 0 };
  for (const e of d.entries) counts[e.kind]++;
  return {
    title: 'Dzienniczek holterowski',
    patientRows,
    medications: (d.medications ?? []).map((m) => ({ id: m.id, name: m.name.trim(), dose: m.dose.trim(), schedule: m.schedule.trim(), notes: m.notes.trim() })),
    sleeps,
    days: buildTimeline(d.entries),
    counts,
    subject: emailSubject(d),
    fileName: reportFileName(d),
  };
}

/** Treść e-maila do lekarza (wstawiana do programu pocztowego opiekuna). */
export function emailBody(d: Diary): string {
  const p = d.patient;
  const m = buildReport(d);
  const c = m.counts;
  return [
    'Dzień dobry,',
    '',
    'przesyłam dzienniczek holterowski.',
    '',
    `Pacjent: ${p.petName.trim()}`,
    `Nazwisko opiekuna: ${p.ownerName.trim()}`,
    `Gatunek: ${speciesText(p.species, p.speciesOther)}`,
    `Okres badania: ${studyPeriodText(d)}`,
    `Liczba wpisów: aktywności ${c.activity}, okresy snu ${c.sleep}, objawy / zdarzenia ${c.symptom}, podania leków ${c.medication}`,
    `Leki podawane na stałe: ${m.medications.length ? m.medications.map((x) => x.name).join(', ') : 'nie wpisano'}`,
    '',
    `Pełny dzienniczek znajduje się w załączniku PDF (${m.fileName}).`,
    '',
    'Pozdrawiam',
  ].join('\n');
}
