import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Moon, Send, Footprints, Pill, TriangleAlert } from 'lucide-react';
import { useDiary } from '../hooks/useDiary';
import { useEntryEditor } from '../components/EntryEditor';
import { Timeline } from '../components/DiaryViews';
import { InstructionCard, NotMonitoredNote, StorageNote } from '../components/Notes';
import { buildTimeline } from '../core/report';
import { formatDateTime } from '../core/time';
import { speciesText } from '../core/labels';
import { validatePatient } from '../core/validation';
import type { EntryKind, SleepEntry } from '../core/types';

const QUICK: { kind: EntryKind; label: string; Icon: typeof Moon; cls: string }[] = [
  { kind: 'activity', label: 'Dodaj aktywność', Icon: Footprints, cls: 'btn-navy' },
  { kind: 'sleep', label: 'Dodaj sen', Icon: Moon, cls: 'btn-navy' },
  { kind: 'symptom', label: 'Dodaj objaw / zdarzenie', Icon: TriangleAlert, cls: 'btn-primary' },
  { kind: 'medication', label: 'Dodaj podanie leku', Icon: Pill, cls: 'btn-navy' },
];

export function DiaryPage() {
  const { diary } = useDiary();
  const { add, edit } = useEntryEditor();
  const days = useMemo(() => buildTimeline(diary.entries), [diary.entries]);
  const openSleeps = diary.entries.filter((e): e is SleepEntry => e.kind === 'sleep' && (!e.endDate || !e.endTime));
  const p = diary.patient;
  const patientOk = Object.keys(validatePatient(p)).length === 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Dzienniczek holterowski</h1>
        <div className="heart-divider mt-3" aria-hidden>
          <span>♥</span>
        </div>
      </div>

      <InstructionCard />

      {patientOk ? (
        <Link to="/dane" className="card flex items-center gap-3 !p-4">
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-extrabold">
              {p.petName} <span className="font-semibold text-navy/70">· {p.ownerName}</span>
            </p>
            <p className="text-[14px] font-medium text-navy/75">
              {speciesText(p.species, p.speciesOther)} · badanie od {formatDateTime(p.startDate, p.startTime)}
              {p.endDate && p.endTime ? ` do ${formatDateTime(p.endDate, p.endTime)}` : ''}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-navy/50" />
        </Link>
      ) : (
        <Link to="/dane" className="flex items-center gap-3 rounded-3xl border-2 border-dashed border-caramel bg-white/80 p-4">
          <div className="flex-1">
            <p className="text-[16px] font-extrabold">Uzupełnij dane pacjenta i badania</p>
            <p className="text-[14px] text-navy/75">Imię zwierzęcia, nazwisko opiekuna, gatunek i godzina założenia Holtera.</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0" />
        </Link>
      )}

      {openSleeps.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => edit(s.id)}
          className="flex w-full items-center gap-3 rounded-3xl bg-navy p-4 text-left text-offwhite shadow-soft active:scale-[0.99]"
        >
          <Moon className="h-7 w-7 shrink-0" aria-hidden />
          <span className="flex-1">
            <span className="block text-[16px] font-extrabold">Śpi od {formatDateTime(s.startDate, s.startTime)}</span>
            <span className="block text-[14px] font-semibold text-offwhite/85">Dotknij, aby zapisać przebudzenie</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0" />
        </button>
      ))}

      <section aria-label="Dodaj wpis">
        <div className="grid grid-cols-2 gap-3">
          {QUICK.map(({ kind, label, Icon, cls }) => (
            <button key={kind} type="button" className={`${cls} !min-h-[84px] flex-col !gap-1.5 !rounded-3xl px-3 text-center text-[15px] leading-tight`} onClick={() => add(kind)}>
              <Icon className="h-6 w-6" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </section>

      <StorageNote />
      <NotMonitoredNote />

      <section aria-labelledby="lista">
        <h2 id="lista" className="section-title mb-3">
          Wszystkie wpisy
        </h2>
        {days.length === 0 ? (
          <div className="card-cream text-[15px] leading-relaxed">
            Nie ma jeszcze wpisów. Użyj przycisków powyżej, aby zapisać aktywność, sen, objaw lub podanie leku. Godzinę możesz wpisać ręcznie albo użyć przycisku „Teraz”.
          </div>
        ) : (
          <Timeline days={days} onEdit={edit} compact />
        )}
      </section>

      <Link to="/wyslij" className="btn-primary w-full text-lg">
        <Send className="h-5 w-5" /> Wyślij do lekarza
      </Link>
      <p className="-mt-2 text-center text-[13px] font-semibold text-navy/65">Zobaczysz podgląd, pobierzesz PDF i wyślesz go e-mailem.</p>
    </div>
  );
}
