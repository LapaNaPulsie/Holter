import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Diary, Entry, Patient } from '../core/types';
import { canonicalJson } from '../core/validation';
import { nowLocal } from '../core/time';
import { fingerprint, loadDiary, loadMeta, newDiary, requestPersistentStorage, saveDiary, saveMeta, STORAGE_KEYS, type DiaryMeta } from '../lib/storage';
import { useToast } from '../components/Toast';

interface DiaryContextValue {
  diary: Diary;
  meta: DiaryMeta;
  /** Czy dzienniczek zmienił się od ostatniej udanej wysyłki. */
  changedSinceSent: boolean;
  savePatient: (p: Patient) => boolean;
  saveEntry: (e: Entry) => boolean;
  deleteEntry: (id: string) => boolean;
  resetDiary: () => boolean;
  markSent: (duplicate: boolean) => void;
}

const DiaryContext = createContext<DiaryContextValue | null>(null);

const SAVE_ERROR =
  'Nie udało się zapisać danych w pamięci przeglądarki. Wpis jest widoczny, ale może zniknąć po zamknięciu strony. Sprawdź, czy nie korzystasz z trybu prywatnego, i pobierz PDF jako kopię.';

export function DiaryProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const initial = useRef<ReturnType<typeof loadDiary> | null>(null);
  if (!initial.current) initial.current = loadDiary();
  const [diary, setDiary] = useState<Diary>(initial.current.diary);
  const [meta, setMeta] = useState<DiaryMeta>(() => loadMeta());
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
      if (e.key === STORAGE_KEYS.META_KEY) setMeta(loadMeta());
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
    const ok = commit(newDiary());
    const m: DiaryMeta = {};
    setMeta(m);
    saveMeta(m);
    return ok;
  }, [commit]);

  const currentFingerprint = useMemo(() => fingerprint(canonicalJson(diary)), [diary]);

  const markSent = useCallback(
    (duplicate: boolean) => {
      const m: DiaryMeta = { ...meta, lastSent: { fingerprint: currentFingerprint, at: nowLocal().stamp, duplicate } };
      setMeta(m);
      saveMeta(m);
    },
    [meta, currentFingerprint],
  );

  const value: DiaryContextValue = {
    diary,
    meta,
    changedSinceSent: !!meta.lastSent && meta.lastSent.fingerprint !== currentFingerprint,
    savePatient,
    saveEntry,
    deleteEntry,
    resetDiary,
    markSent,
  };
  return <DiaryContext.Provider value={value}>{children}</DiaryContext.Provider>;
}

export function useDiary(): DiaryContextValue {
  const ctx = useContext(DiaryContext);
  if (!ctx) throw new Error('useDiary poza DiaryProvider');
  return ctx;
}
