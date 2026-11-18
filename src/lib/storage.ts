import { emptyPatient, type Diary } from '../core/types';
import { parseDiary } from '../core/validation';
import { newId } from './id';

/**
 * Zapis dzienniczka w pamięci tej przeglądarki (localStorage).
 * Każdy zapis jest od razu sprawdzany ponownym odczytem.
 */

const DIARY_KEY = 'lnp-holter-dzienniczek-v1';

export function newDiary(): Diary {
  return { schemaVersion: 1, id: newId(), patient: emptyPatient(), medications: [], entries: [] };
}

export type LoadResult = { diary: Diary; problem: null | 'unreadable' | 'unavailable' };

export function loadDiary(): LoadResult {
  let raw: string | null;
  try {
    raw = localStorage.getItem(DIARY_KEY);
  } catch {
    return { diary: newDiary(), problem: 'unavailable' };
  }
  if (!raw) return { diary: newDiary(), problem: null };
  try {
    const parsed = parseDiary(JSON.parse(raw), { requireComplete: false });
    if (parsed.ok) return { diary: { ...parsed.diary, id: parsed.diary.id || newId() }, problem: null };
  } catch {
    /* uszkodzone dane – niżej */
  }
  // Nie nadpisujemy uszkodzonych danych – zachowujemy kopię do ewentualnego odzyskania.
  try {
    localStorage.setItem(`${DIARY_KEY}-uszkodzony-${Date.now()}`, raw);
  } catch {
    /* brak miejsca */
  }
  return { diary: newDiary(), problem: 'unreadable' };
}

/** Zwraca true, jeśli dane zostały zapisane i odczytane poprawnie. */
export function saveDiary(diary: Diary): boolean {
  try {
    const json = JSON.stringify(diary);
    localStorage.setItem(DIARY_KEY, json);
    return localStorage.getItem(DIARY_KEY) === json;
  } catch {
    return false;
  }
}

export const STORAGE_KEYS = { DIARY_KEY };

export async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage && typeof navigator.storage.persist === 'function') await navigator.storage.persist();
  } catch {
    /* nieobsługiwane */
  }
}
