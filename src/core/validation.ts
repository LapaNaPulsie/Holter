import {
  ACTIVITY_TYPES,
  SYMPTOM_TYPES,
  type ActivityEntry,
  type Diary,
  type Entry,
  type MedicationEntry,
  type Patient,
  type RegularMed,
  type SleepEntry,
  type SymptomEntry,
} from './types';
import { activityEnd, isValidDate, isValidTime, toMinutes } from './time';

export const LIMITS = {
  short: 120,
  long: 5000,
  entries: 1500,
  medications: 60,
} as const;

export type FieldErrors = Record<string, string>;

const REQUIRED = 'To pole jest wymagane.';
const BAD_DATE = 'Wpisz poprawną datę.';
const BAD_TIME = 'Wpisz godzinę w formacie GG:MM, np. 07:45 lub 21:30.';
const TOO_LONG = (n: number) => `Tekst jest za długi (maks. ${n} znaków).`;

function checkText(errors: FieldErrors, field: string, value: string, max: number, required = false) {
  if (required && !value.trim()) errors[field] = REQUIRED;
  else if (value.length > max) errors[field] = TOO_LONG(max);
}

function checkDate(errors: FieldErrors, field: string, value: string, required = true) {
  if (!value) {
    if (required) errors[field] = REQUIRED;
  } else if (!isValidDate(value)) errors[field] = BAD_DATE;
}

function checkTime(errors: FieldErrors, field: string, value: string, required = true) {
  if (!value) {
    if (required) errors[field] = REQUIRED;
  } else if (!isValidTime(value)) errors[field] = BAD_TIME;
}

export function validatePatient(p: Patient): FieldErrors {
  const e: FieldErrors = {};
  checkText(e, 'petName', p.petName, LIMITS.short, true);
  checkText(e, 'ownerName', p.ownerName, LIMITS.short, true);
  if (!p.species) e.species = 'Wybierz gatunek.';
  if (p.species === 'inne') checkText(e, 'speciesOther', p.speciesOther, LIMITS.short);
  checkDate(e, 'startDate', p.startDate);
  checkTime(e, 'startTime', p.startTime);
  checkDate(e, 'endDate', p.endDate, false);
  checkTime(e, 'endTime', p.endTime, false);
  if (p.endDate && !p.endTime && !e.endDate) e.endTime = 'Uzupełnij godzinę zakończenia.';
  if (p.endTime && !p.endDate && !e.endTime) e.endDate = 'Uzupełnij datę zakończenia.';
  if (!e.startDate && !e.startTime && !e.endDate && !e.endTime && p.endDate && p.endTime) {
    if (toMinutes(p.endDate, p.endTime) <= toMinutes(p.startDate, p.startTime)) {
      e.endDate = 'Zakończenie badania musi być później niż jego rozpoczęcie.';
    }
  }
  checkText(e, 'notes', p.notes, LIMITS.long);
  return e;
}

export function validateEntry(entry: Entry): FieldErrors {
  const e: FieldErrors = {};
  switch (entry.kind) {
    case 'activity': {
      checkDate(e, 'date', entry.date);
      checkTime(e, 'startTime', entry.startTime);
      checkTime(e, 'endTime', entry.endTime, false);
      if (!ACTIVITY_TYPES.includes(entry.type)) e.type = 'Wybierz rodzaj aktywności.';
      if (entry.type === 'inna') checkText(e, 'customName', entry.customName, LIMITS.short, true);
      else checkText(e, 'customName', entry.customName, LIMITS.short);
      checkText(e, 'notes', entry.notes, LIMITS.long);
      break;
    }
    case 'sleep': {
      checkDate(e, 'startDate', entry.startDate);
      checkTime(e, 'startTime', entry.startTime);
      checkDate(e, 'endDate', entry.endDate, false);
      checkTime(e, 'endTime', entry.endTime, false);
      if (entry.endDate && !entry.endTime && !e.endDate) e.endTime = 'Uzupełnij godzinę przebudzenia.';
      if (entry.endTime && !entry.endDate && !e.endTime) e.endDate = 'Uzupełnij datę przebudzenia.';
      if (!e.startDate && !e.startTime && !e.endDate && !e.endTime && entry.endDate && entry.endTime) {
        const diff = toMinutes(entry.endDate, entry.endTime) - toMinutes(entry.startDate, entry.startTime);
        if (diff <= 0) e.endDate = 'Przebudzenie musi być później niż zaśnięcie. Jeśli sen trwał przez północ, wybierz datę następnego dnia.';
        else if (diff > 24 * 60) e.endDate = 'Sen nie może trwać dłużej niż 24 godziny. Sprawdź daty.';
      }
      checkText(e, 'notes', entry.notes, LIMITS.long);
      break;
    }
    case 'symptom': {
      checkDate(e, 'date', entry.date);
      checkTime(e, 'time', entry.time);
      if (!SYMPTOM_TYPES.includes(entry.type)) e.type = 'Wybierz rodzaj zdarzenia.';
      checkText(e, 'customName', entry.customName, LIMITS.short);
      checkText(e, 'duration', entry.duration, LIMITS.short);
      checkText(e, 'before', entry.before, LIMITS.long);
      checkText(e, 'description', entry.description, LIMITS.long);
      break;
    }
    case 'medication': {
      checkText(e, 'name', entry.name, LIMITS.short, true);
      checkText(e, 'dose', entry.dose, LIMITS.short, true);
      checkDate(e, 'date', entry.date);
      checkTime(e, 'time', entry.time);
      checkText(e, 'notes', entry.notes, LIMITS.long);
      break;
    }
  }
  return e;
}

export function validateRegularMed(m: RegularMed): FieldErrors {
  const e: FieldErrors = {};
  checkText(e, 'name', m.name, LIMITS.short, true);
  checkText(e, 'dose', m.dose, LIMITS.short, true);
  checkText(e, 'schedule', m.schedule, LIMITS.short);
  checkText(e, 'notes', m.notes, LIMITS.long);
  return e;
}

/** Uwagi, które nie blokują zapisu (np. wpis poza okresem badania). */
export function entryWarnings(entry: Entry, patient: Patient): string[] {
  const out: string[] = [];
  if (entry.kind === 'activity') {
    const end = activityEnd(entry.date, entry.startTime, entry.endTime);
    if (end?.nextDay) out.push('Aktywność kończy się następnego dnia (po północy).');
    if (end && end.minutes > 12 * 60) out.push('Aktywność trwa ponad 12 godzin – sprawdź godziny.');
  }
  const date = entry.kind === 'sleep' ? entry.startDate : entry.date;
  const time = entry.kind === 'sleep' ? entry.startTime : entry.kind === 'activity' ? entry.startTime : entry.time;
  if (isValidDate(date) && isValidTime(time) && isValidDate(patient.startDate) && isValidTime(patient.startTime)) {
    const t = toMinutes(date, time);
    if (t < toMinutes(patient.startDate, patient.startTime) - 60) out.push('Wpis jest wcześniej niż rozpoczęcie badania – sprawdź datę.');
    if (isValidDate(patient.endDate) && isValidTime(patient.endTime) && t > toMinutes(patient.endDate, patient.endTime) + 60) {
      out.push('Wpis jest później niż zakończenie badania – sprawdź datę.');
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Ścisła walidacja całego dzienniczka – używana na serwerze przed wysyłką
// (oraz w przeglądarce przed wysłaniem i przy wczytaniu zapisanych danych).
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
type Obj = Record<string, any>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
// Usuwa znaki sterujące (poza nową linią i tabulatorem), które nie mają sensu w tekście opiekuna.
// eslint-disable-next-line no-control-regex
const clean = (v: unknown): string => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') : '');
const str = (o: Obj, k: string) => clean(o[k]);

function pickPatient(p: Obj): Patient {
  const species = p.species === 'pies' || p.species === 'kot' || p.species === 'inne' ? p.species : '';
  return {
    petName: str(p, 'petName'),
    ownerName: str(p, 'ownerName'),
    species,
    speciesOther: str(p, 'speciesOther'),
    startDate: str(p, 'startDate'),
    startTime: str(p, 'startTime'),
    endDate: str(p, 'endDate'),
    endTime: str(p, 'endTime'),
    notes: str(p, 'notes'),
  };
}

function pickEntry(o: Obj): Entry | null {
  const base = { id: str(o, 'id').slice(0, 64), createdAt: str(o, 'createdAt').slice(0, 20), updatedAt: str(o, 'updatedAt').slice(0, 20) };
  switch (o.kind) {
    case 'activity':
      return { ...base, kind: 'activity', date: str(o, 'date'), startTime: str(o, 'startTime'), endTime: str(o, 'endTime'), type: o.type, customName: str(o, 'customName'), notes: str(o, 'notes') } as ActivityEntry;
    case 'sleep':
      return { ...base, kind: 'sleep', startDate: str(o, 'startDate'), startTime: str(o, 'startTime'), endDate: str(o, 'endDate'), endTime: str(o, 'endTime'), notes: str(o, 'notes') } as SleepEntry;
    case 'symptom':
      return { ...base, kind: 'symptom', date: str(o, 'date'), time: str(o, 'time'), type: o.type, customName: str(o, 'customName'), duration: str(o, 'duration'), before: str(o, 'before'), description: str(o, 'description') } as SymptomEntry;
    case 'medication':
      return { ...base, kind: 'medication', date: str(o, 'date'), time: str(o, 'time'), name: str(o, 'name'), dose: str(o, 'dose'), notes: str(o, 'notes') } as MedicationEntry;
    default:
      return null;
  }
}

export type DiaryCheck = { ok: true; diary: Diary } | { ok: false; error: string };

/**
 * Sprawdza i „oczyszcza” dzienniczek: zostawia wyłącznie znane pola,
 * odrzuca dane w złym formacie. Zwraca czytelny komunikat błędu po polsku.
 */
export function parseDiary(input: unknown, opts: { requireComplete: boolean }): DiaryCheck {
  if (!isObj(input) || input.schemaVersion !== 1 || !isObj(input.patient) || !Array.isArray(input.entries)) {
    return { ok: false, error: 'Nieprawidłowy format dzienniczka.' };
  }
  if (input.entries.length > LIMITS.entries) return { ok: false, error: 'Dzienniczek ma zbyt wiele wpisów.' };
  const patient = pickPatient(input.patient);
  const rawMeds = Array.isArray(input.medications) ? input.medications : [];
  if (rawMeds.length > LIMITS.medications) return { ok: false, error: 'Lista leków jest zbyt długa.' };
  const medications: RegularMed[] = [];
  for (const m of rawMeds) {
    if (!isObj(m)) return { ok: false, error: 'Nieprawidłowy wpis na liście leków.' };
    const med: RegularMed = { id: str(m, 'id').slice(0, 64), name: str(m, 'name'), dose: str(m, 'dose'), schedule: str(m, 'schedule'), notes: str(m, 'notes') };
    if (opts.requireComplete && Object.keys(validateRegularMed(med)).length > 0) {
      return { ok: false, error: 'Jeden z leków na liście „Leki podawane na stałe” ma niepełne dane.' };
    }
    medications.push(med);
  }
  const entries: Entry[] = [];
  for (const raw of input.entries) {
    if (!isObj(raw)) return { ok: false, error: 'Nieprawidłowy wpis w dzienniczku.' };
    const entry = pickEntry(raw);
    if (!entry) return { ok: false, error: 'Nieznany rodzaj wpisu w dzienniczku.' };
    if (opts.requireComplete && Object.keys(validateEntry(entry)).length > 0) {
      return { ok: false, error: 'Jeden z wpisów ma niepoprawne lub niepełne dane.' };
    }
    entries.push(entry);
  }
  if (opts.requireComplete) {
    if (Object.keys(validatePatient(patient)).length > 0) return { ok: false, error: 'Uzupełnij poprawnie dane pacjenta i badania.' };
    if (entries.length === 0) return { ok: false, error: 'Dzienniczek nie zawiera żadnych wpisów.' };
  }
  return { ok: true, diary: { schemaVersion: 1, id: str(input, 'id').slice(0, 64), patient, medications, entries } };
}

/** Deterministyczna postać JSON dzienniczka (stała kolejność pól) – do porównań i ochrony przed duplikatami. */
export function canonicalJson(diary: Diary): string {
  const r = parseDiary(diary, { requireComplete: false });
  return JSON.stringify(r.ok ? r.diary : diary);
}
