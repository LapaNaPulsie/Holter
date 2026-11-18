import { useMemo, useState, type FormEvent } from 'react';
import { Trash2, TriangleAlert, Info } from 'lucide-react';
import {
  ACTIVITY_TYPES,
  SYMPTOM_TYPES,
  type ActivityEntry,
  type Entry,
  type EntryKind,
  type MedicationEntry,
  type SleepEntry,
  type SymptomEntry,
} from '../core/types';
import { ACTIVITY_LABEL, KIND_LABEL, NOT_MONITORED_TEXT, SYMPTOM_LABEL } from '../core/labels';
import { activityEnd, addDays, formatDate, formatDuration, isValidDate, isValidTime, normalizeTime, nowLocal, toMinutes } from '../core/time';
import { entryWarnings, LIMITS, validateEntry, type FieldErrors } from '../core/validation';
import { newId } from '../lib/id';
import { useDiary } from '../hooks/useDiary';
import { useToast } from './Toast';
import { ChoiceGrid, DateTimeField, Field, TextField, TimeInput } from './fields';
import { ConfirmDialog } from './Modal';

export function blankEntry(kind: EntryKind): Entry {
  const today = nowLocal().date;
  const base = { id: newId(), createdAt: '', updatedAt: '' };
  switch (kind) {
    case 'activity':
      return { ...base, kind, date: today, startTime: '', endTime: '', type: 'spacer', customName: '', notes: '' };
    case 'sleep':
      return { ...base, kind, startDate: today, startTime: '', endDate: '', endTime: '', notes: '' };
    case 'symptom':
      return { ...base, kind, date: today, time: '', type: '' as SymptomEntry['type'], customName: '', duration: '', before: '', description: '' };
    case 'medication':
      return { ...base, kind, date: today, time: '', name: '', dose: '', notes: '' };
  }
}

/** Ujednolica wpisane godziny (np. "930" → "09:30") przed walidacją i zapisem. */
function normalizeEntry(e: Entry): Entry {
  const t = (v: string) => (v ? (normalizeTime(v) ?? v) : v);
  switch (e.kind) {
    case 'activity':
      return { ...e, startTime: t(e.startTime), endTime: t(e.endTime) };
    case 'sleep':
      return { ...e, startTime: t(e.startTime), endTime: t(e.endTime) };
    default:
      return { ...e, time: t(e.time) };
  }
}

interface Props {
  initial: Entry;
  isNew: boolean;
  onDone: () => void;
}

export function EntryForm({ initial, isNew, onDone }: Props) {
  const { diary, saveEntry, deleteEntry } = useDiary();
  const toast = useToast();
  const [entry, setEntry] = useState<Entry>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (patch: Partial<Entry>) => setEntry((prev) => ({ ...prev, ...patch }) as Entry);
  const warnings = useMemo(() => entryWarnings(normalizeEntry(entry), diary.patient), [entry, diary.patient]);

  function submit(ev: FormEvent) {
    ev.preventDefault();
    const normalized = normalizeEntry(entry);
    setEntry(normalized);
    const errs = validateEntry(normalized);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast('Uzupełnij lub popraw zaznaczone pola.', 'error');
      return;
    }
    if (saveEntry(normalized)) {
      toast(isNew ? 'Wpis został zapisany.' : 'Zmiany zostały zapisane.');
      onDone();
    }
  }

  function remove() {
    if (deleteEntry(entry.id)) {
      toast('Wpis został usunięty.');
      onDone();
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {entry.kind === 'activity' && <ActivityFields e={entry} set={set} errors={errors} />}
      {entry.kind === 'sleep' && <SleepFields e={entry} set={set} errors={errors} />}
      {entry.kind === 'symptom' && <SymptomFields e={entry} set={set} errors={errors} />}
      {entry.kind === 'medication' && <MedicationFields e={entry} set={set} errors={errors} />}

      {warnings.length > 0 && (
        <div className="flex gap-3 rounded-2xl bg-cream/70 p-3.5 text-[14px] font-semibold leading-snug" role="status">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-burgundy" />
          <ul className="space-y-1">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3 pt-1">
        <button type="submit" className="btn-primary w-full text-lg">
          {isNew ? 'Zapisz wpis' : 'Zapisz zmiany'}
        </button>
        <button type="button" className="btn-secondary w-full" onClick={onDone}>
          Anuluj
        </button>
        {!isNew && (
          <button type="button" className="btn-danger w-full" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-5 w-5" /> Usuń wpis
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Usunąć ten wpis?"
        message={`Wpis „${KIND_LABEL[entry.kind]}” zostanie trwale usunięty z dzienniczka.`}
        confirmLabel="Tak, usuń wpis"
        danger
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </form>
  );
}

type SetFn = (patch: Partial<Entry>) => void;

function ActivityFields({ e, set, errors }: { e: ActivityEntry; set: SetFn; errors: FieldErrors }) {
  const end = isValidTime(e.startTime) && isValidTime(normalizeTime(e.endTime) ?? '') ? activityEnd(e.date, e.startTime, normalizeTime(e.endTime)!) : null;
  return (
    <>
      <ChoiceGrid
        label="Rodzaj aktywności"
        value={e.type}
        onChange={(type) => set({ type } as Partial<ActivityEntry>)}
        options={ACTIVITY_TYPES.map((v) => ({ value: v, label: ACTIVITY_LABEL[v] }))}
        error={errors.type}
      />
      {e.type === 'inna' && (
        <TextField
          label="Nazwa aktywności"
          value={e.customName}
          onChange={(customName) => set({ customName } as Partial<ActivityEntry>)}
          error={errors.customName}
          placeholder="np. jazda samochodem, kąpiel, wizyta gości"
          maxLength={LIMITS.short}
        />
      )}
      <DateTimeField
        label="Początek aktywności"
        date={e.date}
        time={e.startTime}
        onDate={(date) => set({ date } as Partial<ActivityEntry>)}
        onTime={(startTime) => set({ startTime } as Partial<ActivityEntry>)}
        dateError={errors.date}
        timeError={errors.startTime}
        onNow={() => {
          const n = nowLocal();
          set({ date: n.date, startTime: n.time } as Partial<ActivityEntry>);
        }}
      />
      <div>
        <div className="mb-1.5 flex items-end justify-between gap-2">
          <span className="label !mb-0">
            Godzina zakończenia <span className="font-semibold text-navy/55">(opcjonalnie)</span>
          </span>
          <button
            type="button"
            className="inline-flex min-h-[40px] items-center rounded-full border-2 border-navy/20 bg-white px-4 text-sm font-bold text-navy active:scale-[0.97]"
            onClick={() => set({ endTime: nowLocal().time } as Partial<ActivityEntry>)}
          >
            Zakończone teraz
          </button>
        </div>
        <div className="grid grid-cols-[1fr_1.35fr] items-center gap-2">
          <TimeInput label="Godzina zakończenia aktywności" value={e.endTime} onChange={(endTime) => set({ endTime } as Partial<ActivityEntry>)} invalid={!!errors.endTime} />
          <p className="text-[13px] font-semibold leading-snug text-navy/75">
            {end ? (end.nextDay ? `Koniec następnego dnia (${formatDate(end.endDate)}), czas: ${formatDuration(end.minutes)}` : `Czas trwania: ${formatDuration(end.minutes)}`) : 'Możesz uzupełnić później.'}
          </p>
        </div>
        {errors.endTime && (
          <p className="field-error" role="alert">
            {errors.endTime}
          </p>
        )}
      </div>
      <TextField
        label="Opis lub uwagi"
        optional
        multiline
        value={e.notes}
        onChange={(notes) => set({ notes } as Partial<ActivityEntry>)}
        error={errors.notes}
        placeholder="np. spokojny spacer, dużo wąchania; wchodzenie po schodach"
        maxLength={LIMITS.long}
      />
    </>
  );
}

function SleepFields({ e, set, errors }: { e: SleepEntry; set: SetFn; errors: FieldErrors }) {
  const endTimeN = normalizeTime(e.endTime);
  const dur =
    isValidDate(e.startDate) && isValidTime(e.startTime) && isValidDate(e.endDate) && endTimeN
      ? toMinutes(e.endDate, endTimeN) - toMinutes(e.startDate, e.startTime)
      : null;

  /** Po wpisaniu godziny pobudki podpowiadamy datę: ten sam dzień lub następny, jeśli sen trwał przez północ. */
  const setWakeTime = (endTime: string) => {
    const n = normalizeTime(endTime);
    const patch: Partial<SleepEntry> = { endTime };
    if (n && isValidDate(e.startDate) && isValidTime(e.startTime) && (!e.endDate || e.endDate === e.startDate || e.endDate === addDays(e.startDate, 1))) {
      patch.endDate = n <= e.startTime ? addDays(e.startDate, 1) : e.startDate;
    }
    set(patch as Partial<Entry>);
  };

  return (
    <>
      <p className="rounded-2xl bg-cream/60 p-3.5 text-[14px] font-semibold leading-snug">
        Możesz zapisać samo zaśnięcie, a godzinę przebudzenia uzupełnić później. Zapisuj też drzemki i nocne wybudzenia jako osobne okresy snu.
      </p>
      <DateTimeField
        label="Zaśnięcie"
        date={e.startDate}
        time={e.startTime}
        onDate={(startDate) => set({ startDate } as Partial<SleepEntry>)}
        onTime={(startTime) => set({ startTime } as Partial<SleepEntry>)}
        dateError={errors.startDate}
        timeError={errors.startTime}
        onNow={() => {
          const n = nowLocal();
          set({ startDate: n.date, startTime: n.time } as Partial<SleepEntry>);
        }}
        nowLabel="Zasnął teraz"
      />
      <DateTimeField
        label="Przebudzenie"
        optional
        date={e.endDate}
        time={e.endTime}
        onDate={(endDate) => set({ endDate } as Partial<SleepEntry>)}
        onTime={setWakeTime}
        dateError={errors.endDate}
        timeError={errors.endTime}
        onNow={() => {
          const n = nowLocal();
          set({ endDate: n.date, endTime: n.time } as Partial<SleepEntry>);
        }}
        nowLabel="Obudził się teraz"
        hint={
          dur !== null && dur > 0
            ? `Czas snu: ${formatDuration(dur)}${e.endDate !== e.startDate ? ' (przez północ)' : ''}`
            : 'Jeśli sen trwał przez północ, data przebudzenia to następny dzień – podpowiadamy ją automatycznie.'
        }
      />
      {(e.endDate || e.endTime) && (
        <button type="button" className="text-sm font-bold text-navy/70 underline" onClick={() => set({ endDate: '', endTime: '' } as Partial<SleepEntry>)}>
          Wyczyść przebudzenie (uzupełnię później)
        </button>
      )}
      <TextField
        label="Uwagi o śnie"
        optional
        multiline
        value={e.notes}
        onChange={(notes) => set({ notes } as Partial<SleepEntry>)}
        error={errors.notes}
        placeholder="np. niespokojny sen, wybudzał się, zmieniał miejsce"
        maxLength={LIMITS.long}
      />
    </>
  );
}

function SymptomFields({ e, set, errors }: { e: SymptomEntry; set: SetFn; errors: FieldErrors }) {
  return (
    <>
      <div className="flex gap-3 rounded-2xl border-2 border-burgundy/30 bg-white p-3.5 text-[14px] font-semibold leading-snug text-burgundy" role="note">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <p>{NOT_MONITORED_TEXT}</p>
      </div>
      <DateTimeField
        label="Kiedy wystąpiło?"
        date={e.date}
        time={e.time}
        onDate={(date) => set({ date } as Partial<SymptomEntry>)}
        onTime={(time) => set({ time } as Partial<SymptomEntry>)}
        dateError={errors.date}
        timeError={errors.time}
        hint="Podaj możliwie dokładną godzinę wystąpienia (nie godzinę wpisu)."
        onNow={() => {
          const n = nowLocal();
          set({ date: n.date, time: n.time } as Partial<SymptomEntry>);
        }}
      />
      <ChoiceGrid
        label="Rodzaj zdarzenia"
        value={e.type}
        onChange={(type) => set({ type } as Partial<SymptomEntry>)}
        options={SYMPTOM_TYPES.map((v) => ({ value: v, label: SYMPTOM_LABEL[v] }))}
        error={errors.type}
      />
      {e.type === 'inne' && (
        <TextField
          label="Jakie zdarzenie?"
          optional
          value={e.customName}
          onChange={(customName) => set({ customName } as Partial<SymptomEntry>)}
          error={errors.customName}
          maxLength={LIMITS.short}
        />
      )}
      <TextField
        label="Przybliżony czas trwania"
        optional
        value={e.duration}
        onChange={(duration) => set({ duration } as Partial<SymptomEntry>)}
        error={errors.duration}
        placeholder="np. kilka sekund, ok. 2 minuty"
        maxLength={LIMITS.short}
      />
      <TextField
        label="Co zwierzę robiło bezpośrednio przed zdarzeniem?"
        multiline
        optional
        value={e.before}
        onChange={(before) => set({ before } as Partial<SymptomEntry>)}
        error={errors.before}
        placeholder="np. biegło po schodach, spało, jadło"
        maxLength={LIMITS.long}
      />
      <TextField
        label="Opis zdarzenia i zachowania po nim"
        multiline
        optional
        value={e.description}
        onChange={(description) => set({ description } as Partial<SymptomEntry>)}
        error={errors.description}
        placeholder="Opisz, co widzisz – własnymi słowami."
        maxLength={LIMITS.long}
      />
    </>
  );
}

function MedicationFields({ e, set, errors }: { e: MedicationEntry; set: SetFn; errors: FieldErrors }) {
  const { diary } = useDiary();
  const previousNames = Array.from(
    new Set(diary.entries.filter((x): x is MedicationEntry => x.kind === 'medication' && x.id !== e.id).map((x) => x.name.trim()).filter(Boolean)),
  );
  return (
    <>
      <Field label="Nazwa leku" error={errors.name}>
        {(id, describedBy) => (
          <>
            <input
              id={id}
              type="text"
              list={previousNames.length ? `${id}-list` : undefined}
              className={`field ${errors.name ? '!border-burgundy' : ''}`}
              value={e.name}
              maxLength={LIMITS.short}
              autoComplete="off"
              aria-invalid={!!errors.name}
              aria-describedby={describedBy}
              onChange={(ev) => set({ name: ev.target.value } as Partial<MedicationEntry>)}
            />
            {previousNames.length > 0 && (
              <datalist id={`${id}-list`}>
                {previousNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            )}
          </>
        )}
      </Field>
      <TextField
        label="Podana dawka (z jednostką)"
        value={e.dose}
        onChange={(dose) => set({ dose } as Partial<MedicationEntry>)}
        error={errors.dose}
        hint="Wpisz tak, jak podano, np. „1 tabletka 5 mg” lub „0,5 ml”."
        maxLength={LIMITS.short}
      />
      <DateTimeField
        label="Kiedy podano?"
        date={e.date}
        time={e.time}
        onDate={(date) => set({ date } as Partial<MedicationEntry>)}
        onTime={(time) => set({ time } as Partial<MedicationEntry>)}
        dateError={errors.date}
        timeError={errors.time}
        onNow={() => {
          const n = nowLocal();
          set({ date: n.date, time: n.time } as Partial<MedicationEntry>);
        }}
      />
      <TextField
        label="Dodatkowe uwagi"
        optional
        multiline
        value={e.notes}
        onChange={(notes) => set({ notes } as Partial<MedicationEntry>)}
        error={errors.notes}
        placeholder="np. podane z jedzeniem, zwierzę wypluło część tabletki"
        maxLength={LIMITS.long}
      />
    </>
  );
}
