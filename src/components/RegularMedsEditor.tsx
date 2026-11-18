import { useState, type FormEvent } from 'react';
import { Pencil, Pill, Plus, Trash2 } from 'lucide-react';
import type { RegularMed } from '../core/types';
import { LIMITS, validateRegularMed, type FieldErrors } from '../core/validation';
import { useDiary } from '../hooks/useDiary';
import { newId } from '../lib/id';
import { ConfirmDialog, Modal } from './Modal';
import { TextField } from './fields';
import { useToast } from './Toast';

const blank = (): RegularMed => ({ id: newId(), name: '', dose: '', schedule: '', notes: '' });

/** Lista leków podawanych na stałe – opiekun wpisuje je sam, aplikacja niczego nie podpowiada ani nie oblicza. */
export function RegularMedsEditor() {
  const { diary, saveRegularMed, deleteRegularMed } = useDiary();
  const toast = useToast();
  const meds = diary.medications ?? [];
  const [editing, setEditing] = useState<{ med: RegularMed; isNew: boolean } | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const open = (med: RegularMed, isNew: boolean) => {
    setErrors({});
    setEditing({ med, isNew });
  };
  const set = (patch: Partial<RegularMed>) => setEditing((e) => (e ? { ...e, med: { ...e.med, ...patch } } : e));

  function submit(ev: FormEvent) {
    ev.preventDefault();
    if (!editing) return;
    const errs = validateRegularMed(editing.med);
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast('Uzupełnij zaznaczone pola.', 'error');
      return;
    }
    if (saveRegularMed(editing.med)) {
      toast(editing.isNew ? 'Lek dodany do listy.' : 'Zmiany zostały zapisane.');
      setEditing(null);
    }
  }

  function remove() {
    if (editing && deleteRegularMed(editing.med.id)) {
      toast('Lek usunięty z listy.');
      setConfirmDelete(false);
      setEditing(null);
    }
  }

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="section-title">Leki podawane na stałe</h2>
        <p className="mt-1 text-[14px] leading-snug text-navy/75">Wpisz leki, które zwierzę dostaje w czasie badania – tak, jak zalecił lekarz. Każde podanie możesz potem zapisać przyciskiem „Dodaj podanie leku”.</p>
      </div>

      {meds.length > 0 && (
        <ul className="space-y-2">
          {meds.map((m) => (
            <li key={m.id} className="flex items-start gap-3 rounded-2xl border border-powder bg-white p-3">
              <Pill className="mt-0.5 h-5 w-5 shrink-0 text-navy/60" aria-hidden />
              <div className="min-w-0 flex-1 text-[15px]">
                <p className="font-bold">
                  {m.name} <span className="font-semibold text-navy/75">– {m.dose}</span>
                </p>
                {m.schedule && <p className="text-navy/80">{m.schedule}</p>}
                {m.notes && <p className="break-words text-[13px] text-navy/70">{m.notes}</p>}
              </div>
              <button type="button" onClick={() => open(m, false)} className="-m-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-navy/70 hover:bg-cream" aria-label={`Edytuj lub usuń lek: ${m.name}`}>
                <Pencil className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="btn-secondary w-full" onClick={() => open(blank(), true)}>
        <Plus className="h-5 w-5" /> Dodaj lek
      </button>

      <Modal open={!!editing} title={editing?.isNew ? 'Dodaj lek podawany na stałe' : 'Edytuj lek'} onClose={() => setEditing(null)} dismissOnBackdrop={false}>
        {editing && (
          <form onSubmit={submit} noValidate className="space-y-5">
            <TextField label="Nazwa leku" value={editing.med.name} onChange={(name) => set({ name })} error={errors.name} maxLength={LIMITS.short} />
            <TextField
              label="Dawka (z jednostką)"
              value={editing.med.dose}
              onChange={(dose) => set({ dose })}
              error={errors.dose}
              hint="Tak, jak podajesz, np. „1 tabletka 5 mg” lub „0,5 ml”."
              maxLength={LIMITS.short}
            />
            <TextField
              label="Kiedy / jak często"
              optional
              value={editing.med.schedule}
              onChange={(schedule) => set({ schedule })}
              error={errors.schedule}
              placeholder="np. 2 × dziennie (8:00 i 20:00)"
              maxLength={LIMITS.short}
            />
            <TextField label="Uwagi" optional multiline value={editing.med.notes} onChange={(notes) => set({ notes })} error={errors.notes} maxLength={LIMITS.long} />
            <div className="flex flex-col gap-3">
              <button type="submit" className="btn-primary w-full text-lg">
                {editing.isNew ? 'Dodaj lek' : 'Zapisz zmiany'}
              </button>
              <button type="button" className="btn-secondary w-full" onClick={() => setEditing(null)}>
                Anuluj
              </button>
              {!editing.isNew && (
                <button type="button" className="btn-danger w-full" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-5 w-5" /> Usuń z listy
                </button>
              )}
            </div>
            <ConfirmDialog
              open={confirmDelete}
              title="Usunąć lek z listy?"
              message={`„${editing.med.name || 'Lek'}” zniknie z listy leków podawanych na stałe. Zapisane podania tego leku zostaną w dzienniczku.`}
              confirmLabel="Tak, usuń"
              danger
              onConfirm={remove}
              onCancel={() => setConfirmDelete(false)}
            />
          </form>
        )}
      </Modal>
    </div>
  );
}
