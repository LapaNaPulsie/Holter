import { describe, expect, it } from 'vitest';
import { activityEnd, addDays, formatDuration, isValidDate, normalizeTime, toMinutes } from './time';
import { canonicalJson, entryWarnings, parseDiary, validateEntry, validatePatient } from './validation';
import { buildReport, buildTimeline, emailSubject, reportFileName } from './report';
import { sampleDiary } from './fixtures';
import type { SleepEntry } from './types';

describe('czas', () => {
  it('normalizuje godziny wpisywane różnie', () => {
    expect(normalizeTime('930')).toBe('09:30');
    expect(normalizeTime('0930')).toBe('09:30');
    expect(normalizeTime('21.05')).toBe('21:05');
    expect(normalizeTime('7')).toBe('07:00');
    expect(normalizeTime('00:00')).toBe('00:00');
    expect(normalizeTime('24:00')).toBeNull();
    expect(normalizeTime('12:60')).toBeNull();
    expect(normalizeTime('9:5')).toBeNull();
    expect(normalizeTime('ab')).toBeNull();
  });
  it('sprawdza poprawność dat (w tym 29 lutego)', () => {
    expect(isValidDate('2028-02-29')).toBe(true);
    expect(isValidDate('2026-02-29')).toBe(false);
    expect(isValidDate('2026-13-01')).toBe(false);
  });
  it('liczy przejście przez północ i koniec miesiąca/roku', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(activityEnd('2026-11-30', '23:30', '00:15')).toEqual({ endDate: '2026-12-01', nextDay: true, minutes: 45 });
    expect(activityEnd('2026-11-18', '10:00', '10:35')).toEqual({ endDate: '2026-11-18', nextDay: false, minutes: 35 });
    expect(formatDuration(505)).toBe('8 h 25 min');
  });
  it('nie przesuwa godzin przy zmianie czasu (31.10/1.11 – bez stref)', () => {
    // 2026-10-25 w Polsce: zmiana czasu z letniego na zimowy. Liczymy czas „ścienny”.
    expect(toMinutes('2026-10-25', '03:00') - toMinutes('2026-10-25', '01:00')).toBe(120);
  });
});

describe('walidacja', () => {
  it('przyjmuje sen przez północ i odrzuca pobudkę przed zaśnięciem', () => {
    const s: SleepEntry = { id: 's', kind: 'sleep', startDate: '2026-11-18', startTime: '22:40', endDate: '2026-11-19', endTime: '06:10', notes: '', createdAt: '', updatedAt: '' };
    expect(validateEntry(s)).toEqual({});
    expect(validateEntry({ ...s, endDate: '2026-11-18' }).endDate).toMatch(/później/);
    expect(validateEntry({ ...s, endDate: '', endTime: '' })).toEqual({});
    expect(validateEntry({ ...s, endDate: '2026-11-21' }).endDate).toMatch(/24 godziny/);
  });
  it('aktywność przez północ jest poprawna i dostaje ostrzeżenie informacyjne', () => {
    const d = sampleDiary();
    const a = d.entries.find((e) => e.id === 'a2')!;
    expect(validateEntry(a)).toEqual({});
    expect(entryWarnings(a, d.patient).join(' ')).toMatch(/następnego dnia/);
  });
  it('wymaga pól pacjenta i poprawnej kolejności dat badania', () => {
    const d = sampleDiary();
    expect(validatePatient(d.patient)).toEqual({});
    expect(validatePatient({ ...d.patient, petName: ' ' }).petName).toBeTruthy();
    expect(validatePatient({ ...d.patient, endDate: '2026-11-17' }).endDate).toBeTruthy();
    expect(validatePatient({ ...d.patient, endDate: '', endTime: '' })).toEqual({});
  });
  it('lek wymaga nazwy i dawki; inna aktywność wymaga nazwy', () => {
    const e = validateEntry({ id: 'm', kind: 'medication', date: '2026-11-18', time: '08:00', name: '', dose: '', notes: '', createdAt: '', updatedAt: '' });
    expect(Object.keys(e).sort()).toEqual(['dose', 'name']);
    const a = validateEntry({ id: 'a', kind: 'activity', date: '2026-11-18', startTime: '08:00', endTime: '', type: 'inna', customName: '', notes: '', createdAt: '', updatedAt: '' });
    expect(a.customName).toBeTruthy();
  });
  it('parseDiary odrzuca nieznane pola i błędne dane', () => {
    const d = sampleDiary() as unknown as Record<string, unknown>;
    const withExtra = { ...d, hacker: 'x', patient: { ...(d.patient as object), evil: '<script>' } };
    const r = parseDiary(withExtra, { requireComplete: true });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(JSON.stringify(r.diary)).not.toContain('evil');
      expect(JSON.stringify(r.diary)).not.toContain('hacker');
    }
    expect(parseDiary({ ...d, entries: [{ kind: 'xx' }] }, { requireComplete: false }).ok).toBe(false);
    expect(parseDiary({ ...d, entries: [] }, { requireComplete: true }).ok).toBe(false);
    expect(parseDiary(null, { requireComplete: false }).ok).toBe(false);
  });
  it('canonicalJson nie zależy od kolejności pól', () => {
    const d = sampleDiary();
    const shuffled = JSON.parse(JSON.stringify({ entries: d.entries, patient: d.patient, id: d.id, schemaVersion: 1 }));
    expect(canonicalJson(shuffled)).toBe(canonicalJson(d));
  });
});

describe('raport', () => {
  it('układa wpisy chronologicznie, dzieli na dni i pokazuje przebudzenie w dniu pobudki', () => {
    const days = buildTimeline(sampleDiary().entries);
    expect(days.map((d) => d.date)).toEqual(['2026-11-18', '2026-11-19', '2026-11-20']);
    expect(days[0].items.map((i) => i.time)).toEqual(['08:00', '10:00', '22:40']);
    expect(days[1].items[0]).toMatchObject({ kind: 'wake', time: '06:10', title: 'Przebudzenie' });
    expect(days[1].items.map((i) => i.time)).toEqual(['06:10', '07:12', '13:00', '14:20', '23:30']);
    const night = days[1].items.find((i) => i.entryId === 'a2')!;
    expect(night.timeLabel).toBe('23:30–00:15 (do 20.11)');
  });
  it('temat wiadomości i nazwa pliku', () => {
    const d = sampleDiary();
    expect(emailSubject(d)).toBe('Dzienniczek holterowski — Łatka Żółkiewska-Ćwik — 18.11.2026');
    expect(reportFileName(d)).toBe('dzienniczek-holter-latka-zolkiewska-cwik-2026-11-18.pdf');
  });
  it('model zawiera wszystkie wpisy i pełne opisy', () => {
    const d = sampleDiary();
    const m = buildReport(d);
    const ids = new Set(m.days.flatMap((x) => x.items.map((i) => i.entryId)));
    expect(ids.size).toBe(d.entries.length);
    const sym = m.days.flatMap((x) => x.items).find((i) => i.entryId === 'x1')!;
    const desc = sym.details.find((x) => x.label.startsWith('Opis'))!.value;
    expect(desc).toBe((d.entries.find((e) => e.id === 'x1') as { description: string }).description);
    expect(m.sleeps[2].end).toBe('nie zapisano');
  });
});

import { emailBody } from './report';
describe('treść e-maila', () => {
  it('zawiera dane pacjenta, okres badania i informację o załączniku', () => {
    const b = emailBody(sampleDiary());
    expect(b).toContain('Pacjent: Łatka');
    expect(b).toContain('Nazwisko opiekuna: Żółkiewska-Ćwik');
    expect(b).toContain('Okres badania: 18.11.2026, 09:15 – 20.11.2026, 09:40');
    expect(b).toContain('w załączniku PDF (dzienniczek-holter-latka-zolkiewska-cwik-2026-11-18.pdf)');
  });
});
