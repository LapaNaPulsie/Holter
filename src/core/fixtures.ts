import type { Diary } from './types';

/** Przykładowy dzienniczek do testów: 3 dni, sen przez północ, długie opisy, polskie znaki. */
export function sampleDiary(): Diary {
  const long =
    'Zażółć gęślą jaźń. Pies nagle zatrzymał się na spacerze, zachwiał się i położył na boku. Przez około 10 sekund nie reagował na wołanie, potem sam wstał. ' +
    'Po zdarzeniu był wyraźnie zmęczony, dyszał, szukał cienia i nie chciał iść dalej. Wróciliśmy powoli do domu, gdzie wypił wodę i zasnął. '.repeat(6);
  return {
    schemaVersion: 1,
    id: 'test-diary',
    patient: {
      petName: 'Łatka',
      ownerName: 'Żółkiewska-Ćwik',
      species: 'pies',
      speciesOther: '',
      startDate: '2026-11-18',
      startTime: '09:15',
      endDate: '2026-11-20',
      endTime: '09:40',
      notes: 'Holter założony na Andersa. Pies boi się burzy – w nocy z 18 na 19 zapowiadano wichurę.',
    },
    entries: [
      { id: 'a1', kind: 'activity', date: '2026-11-18', startTime: '10:00', endTime: '10:35', type: 'spacer', customName: '', notes: 'Spokojny spacer po parku, dużo wąchania.', createdAt: '2026-11-18 10:40', updatedAt: '' },
      { id: 'm1', kind: 'medication', date: '2026-11-18', time: '08:00', name: 'Pimobendan', dose: '2,5 mg', notes: 'Podane z karmą.', createdAt: '2026-11-18 08:02', updatedAt: '' },
      { id: 's1', kind: 'sleep', startDate: '2026-11-18', startTime: '22:40', endDate: '2026-11-19', endTime: '06:10', notes: 'Wybudził się raz około 2:00 przy wietrze.', createdAt: '2026-11-18 22:45', updatedAt: '2026-11-19 06:15' },
      { id: 'x1', kind: 'symptom', date: '2026-11-19', time: '07:12', type: 'omdlenie', customName: '', duration: 'ok. 10 sekund', before: 'Biegł do drzwi, bo ktoś zadzwonił domofonem.', description: long, createdAt: '2026-11-19 07:30', updatedAt: '' },
      { id: 'a2', kind: 'activity', date: '2026-11-19', startTime: '23:30', endTime: '00:15', type: 'inna', customName: 'Wizyta gości – szczekanie', notes: '', createdAt: '2026-11-20 00:20', updatedAt: '' },
      { id: 's2', kind: 'sleep', startDate: '2026-11-19', startTime: '13:00', endDate: '2026-11-19', endTime: '14:20', notes: 'Drzemka', createdAt: '2026-11-19 14:25', updatedAt: '' },
      { id: 'x2', kind: 'symptom', date: '2026-11-20', time: '05:05', type: 'kaszel', customName: '', duration: '', before: 'Spał', description: 'Kilka kaszlnięć, potem znowu zasnął.', createdAt: '2026-11-20 07:00', updatedAt: '' },
      { id: 's3', kind: 'sleep', startDate: '2026-11-20', startTime: '00:40', endDate: '', endTime: '', notes: '', createdAt: '2026-11-20 00:41', updatedAt: '' },
    ],
  };
}
