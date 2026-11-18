/**
 * Model danych dzienniczka holterowskiego.
 *
 * WAŻNE: wszystkie daty i godziny są przechowywane jako tekst w lokalnym czasie badania
 * ("RRRR-MM-DD" oraz "GG:MM", zegar 24-godzinny). Nigdzie nie są zamieniane na znaczniki
 * czasu ani strefy czasowe – dzięki temu podgląd, PDF i e-mail (także generowany na serwerze
 * działającym w innej strefie) pokazują dokładnie te same godziny, które wpisał opiekun.
 */

export type Species = 'pies' | 'kot' | 'inne';

export interface Patient {
  petName: string;
  ownerName: string;
  species: Species | '';
  speciesOther: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  notes: string;
}

export const ACTIVITY_TYPES = [
  'spacer',
  'bieganie',
  'zabawa',
  'odpoczynek',
  'jedzenie',
  'pobudzenie',
  'inna',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const SYMPTOM_TYPES = [
  'oslabienie',
  'omdlenie',
  'przewrocenie',
  'kaszel',
  'dusznosc',
  'zachowanie',
  'inne',
] as const;
export type SymptomType = (typeof SYMPTOM_TYPES)[number];

interface EntryBase {
  id: string;
  /** Kiedy wpis został dodany (czas urządzenia opiekuna, "RRRR-MM-DD GG:MM"). */
  createdAt: string;
  /** Kiedy wpis był ostatnio zmieniany – puste, jeśli nie był edytowany. */
  updatedAt: string;
}

export interface ActivityEntry extends EntryBase {
  kind: 'activity';
  date: string;
  startTime: string;
  /** Opcjonalnie. Godzina wcześniejsza niż początek oznacza koniec następnego dnia. */
  endTime: string;
  type: ActivityType;
  customName: string;
  notes: string;
}

export interface SleepEntry extends EntryBase {
  kind: 'sleep';
  startDate: string;
  startTime: string;
  /** Puste, dopóki opiekun nie zapisze pobudki. */
  endDate: string;
  endTime: string;
  notes: string;
}

export interface SymptomEntry extends EntryBase {
  kind: 'symptom';
  date: string;
  time: string;
  type: SymptomType;
  customName: string;
  duration: string;
  before: string;
  description: string;
}

export interface MedicationEntry extends EntryBase {
  kind: 'medication';
  date: string;
  time: string;
  name: string;
  dose: string;
  notes: string;
}

export type Entry = ActivityEntry | SleepEntry | SymptomEntry | MedicationEntry;
export type EntryKind = Entry['kind'];

/** Lek podawany na stałe – wpisany przez opiekuna (aplikacja niczego nie proponuje ani nie oblicza). */
export interface RegularMed {
  id: string;
  name: string;
  dose: string;
  schedule: string;
  notes: string;
}

export interface Diary {
  schemaVersion: 1;
  /** Losowy identyfikator dzienniczka na tym urządzeniu. */
  id: string;
  patient: Patient;
  /** Leki podawane na stałe (lista opiekuna). */
  medications: RegularMed[];
  entries: Entry[];
}

export const emptyPatient = (): Patient => ({
  petName: '',
  ownerName: '',
  species: '',
  speciesOther: '',
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  notes: '',
});
