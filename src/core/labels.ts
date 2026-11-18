import type { ActivityEntry, ActivityType, EntryKind, Species, SymptomEntry, SymptomType } from './types';

export const RECIPIENT_EMAIL = 'kardiologia@lapanapulsie.pl';
export const APP_NAME = 'Dzienniczek holterowski';
export const BRAND_LINE = 'Dzienniczek holterowski | Łapa na Pulsie';

export const SPECIES_LABEL: Record<Species, string> = {
  pies: 'Pies',
  kot: 'Kot',
  inne: 'Inne',
};

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  spacer: 'Spacer',
  bieganie: 'Bieganie / intensywny ruch',
  zabawa: 'Zabawa',
  odpoczynek: 'Odpoczynek',
  jedzenie: 'Jedzenie',
  pobudzenie: 'Pobudzenie / stres',
  inna: 'Inna aktywność',
};

export const SYMPTOM_LABEL: Record<SymptomType, string> = {
  oslabienie: 'Osłabienie',
  omdlenie: 'Omdlenie / utrata przytomności',
  przewrocenie: 'Nagłe przewrócenie się',
  kaszel: 'Kaszel',
  dusznosc: 'Trudności w oddychaniu',
  zachowanie: 'Nietypowe zachowanie',
  inne: 'Inne',
};

/** Etykieta rodzaju wpisu – zawsze tekstowa, aby była czytelna także w wydruku czarno-białym. */
export const KIND_LABEL: Record<EntryKind, string> = {
  activity: 'Aktywność',
  sleep: 'Sen',
  symptom: 'Objaw / zdarzenie',
  medication: 'Lek',
};

export function speciesText(species: Species | '', other: string): string {
  if (!species) return '';
  if (species === 'inne') return other.trim() ? `Inne – ${other.trim()}` : 'Inne';
  return SPECIES_LABEL[species];
}

export function activityName(e: Pick<ActivityEntry, 'type' | 'customName'>): string {
  if (e.type === 'inna') return e.customName.trim() || ACTIVITY_LABEL.inna;
  return ACTIVITY_LABEL[e.type];
}

export function symptomName(e: Pick<SymptomEntry, 'type' | 'customName'>): string {
  if (e.type === 'inne') return e.customName.trim() ? `Inne: ${e.customName.trim()}` : 'Inne zdarzenie';
  return SYMPTOM_LABEL[e.type];
}

export const INSTRUCTION_TEXT =
  'W czasie badania zapisuj aktywności swojego zwierzęcia, pory snu, podawane leki oraz niepokojące zdarzenia. Podawaj możliwie dokładne godziny — pomoże to lekarzowi porównać Twoje obserwacje z zapisem EKG.';

export const NOT_MONITORED_TEXT =
  'Dzienniczek nie jest monitorowany na bieżąco. W razie nagłego pogorszenia stanu zwierzęcia skontaktuj się niezwłocznie z lekarzem weterynarii.';

export const REPORT_FOOTER =
  'Dzienniczek wypełniony przez opiekuna zwierzęcia w czasie badania Holter EKG. Zawiera obserwacje opiekuna – nie stanowi interpretacji ani diagnozy.';
