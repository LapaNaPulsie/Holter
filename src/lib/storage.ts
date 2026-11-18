import { emptyPatient, type Diary } from '../core/types';
import { parseDiary } from '../core/validation';
import { newId } from './id';

/**
 * Zapis dzienniczka w pamięci tej przeglądarki (localStorage).
 * Każdy zapis jest od razu sprawdzany ponownym odczytem.
 */

const DIARY_KEY = 'lnp-holter-dzienniczek-v1';
const META_KEY = 'lnp-holter-meta-v1';

export interface DiaryMeta {
  /** Odcisk treści ostatnio wysłanego dzienniczka i czas wysyłki (czas urządzenia). */
  lastSent?: { fingerprint: string; at: string; duplicate?: boolean };
}

export function newDiary(): Diary {
  return { schemaVersion: 1, id: newId(), patient: emptyPatient(), entries: [] };
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

export function loadMeta(): DiaryMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as DiaryMeta) : {};
  } catch {
    return {};
  }
}

export function saveMeta(meta: DiaryMeta): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* informacja pomocnicza – brak zapisu nie blokuje działania */
  }
}

export const STORAGE_KEYS = { DIARY_KEY, META_KEY };

/** Szybki odcisk tekstu (FNV-1a) – tylko do sprawdzenia, czy dzienniczek zmienił się od wysyłki. */
export function fingerprint(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${text.length}-${(h >>> 0).toString(16)}`;
}

export async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage && typeof navigator.storage.persist === 'function') await navigator.storage.persist();
  } catch {
    /* nieobsługiwane */
  }
}
