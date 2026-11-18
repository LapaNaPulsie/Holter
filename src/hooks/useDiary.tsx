import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Diary, Entry, Patient, RegularMed } from '../core/types';
import { nowLocal } from '../core/time';
import { loadDiary, newDiary, requestPersistentStorage, saveDiary, STORAGE_KEYS } from '../lib/storage';
import { useToast } from '../components/Toast';

interface DiaryContextValue {
  diary: Diary;
  savePatient: (p: Patient) => boolean;
  saveRegularMed: (m: RegularMed) => boolean;
  deleteRegularMed: (id: string) => boolean;
  saveEntry: (e: Entry) => boolean;
  deleteEntry: (id: string) => boolean;
  resetDiary: () => boolean;
}

const DiaryContext = createContext<DiaryContextValue | null>(null);

const SAVE_ERROR =
  'Nie udało się zapisać danych w pamięci przeglądarki. Wpis jest widoczny, ale może zniknąć po zamknięciu strony. Sprawdź, czy nie korzystasz z trybu prywatnego, i pobierz PDF jako kopię.';

export function DiaryProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const initial = useRef<ReturnType<typeof loadDiary> | null>(null);
  if (!initial.current) initial.current = loadDiary();
  const [diary, setDiary] = useState<Diary>(initial.current.diary);
  // Zawsze najnowszy stan – kolejne szybkie zmiany nie nadpisują się nawzajem.
  const latest = useRef<Diary>(diary);

  useEffect(() => {
    const problem = initial.current?.problem;
    if (problem === 'unavailable') toast('Ta przeglądarka nie pozwala zapisywać danych (np. tryb prywatny). Wpisy mogą zniknąć po zamknięciu strony.', 'error');
    if (problem === 'unreadable') toast('Nie udało się odczytać zapisanego dzienniczka. Kopia uszkodzonych danych została zachowana w przeglądarce.', 'error');
    void requestPersistentStorage();
  }, [toast]);

  // Zmiany wprowadzone w innej karcie tej samej przeglądarki
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.DIARY_KEY) {
        const d = loadDiary().diary;
        latest.current = d;
        setDiary(d);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const commit = useCallback(
    (next: Diary): boolean => {
      latest.current = next;
      setDiary(next);
      const ok = saveDiary(next);
      if (!ok) toast(SAVE_ERROR, 'error');
      return ok;
    },
    [toast],
  );

  const savePatient = useCallback((p: Patient) => commit({ ...latest.current, patient: p }), [commit]);

  const saveRegularMed = useCallback((m: RegularMed) => {
    const d = latest.current;
    const meds = d.medications ?? [];
    const next = meds.some((x) => x.id === m.id) ? meds.map((x) => (x.id === m.id ? m : x)) : [...meds, m];
    return commit({ ...d, medications: next });
  }, [commit]);

  const deleteRegularMed = useCallback(
    (id: string) => commit({ ...latest.current, medications: (latest.current.medications ?? []).filter((x) => x.id !== id) }),
    [commit],
  );

  const saveEntry = useCallback(
    (e: Entry) => {
      const diary = latest.current;
      const exists = diary.entries.some((x) => x.id === e.id);
      const stamped: Entry = exists ? { ...e, updatedAt: nowLocal().stamp } : { ...e, createdAt: e.createdAt || nowLocal().stamp, updatedAt: '' };
      const entries = exists ? diary.entries.map((x) => (x.id === e.id ? stamped : x)) : [...diary.entries, stamped];
      return commit({ ...diary, entries });
    },
    [commit],
  );

  const deleteEntry = useCallback(
    (id: string) => commit({ ...latest.current, entries: latest.current.entries.filter((x) => x.id !== id) }),
    [commit],
  );

  const resetDiary = useCallback(() => {
    return commit(newDiary());
  }, [commit]);

  const value: DiaryContextValue = {
    diary,
    savePatient,
    saveRegularMed,
    deleteRegularMed,
    saveEntry,
    deleteEntry,
    resetDiary,
  };
  return <DiaryContext.Provider value={value}>{children}</DiaryContext.Provider>;
}

export function useDiary(): DiaryContextValue {
  const ctx = useContext(DiaryContext);
  if (!ctx) throw new Error('useDiary poza DiaryProvider');
  return ctx;
}
