import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDiary } from '../hooks/useDiary';
import { useToast } from '../components/Toast';
import { ChoiceGrid, DateTimeField, TextField } from '../components/fields';
import { StorageNote } from '../components/Notes';
import { LIMITS, validatePatient, type FieldErrors } from '../core/validation';
import { normalizeTime, nowLocal } from '../core/time';
import type { Patient, Species } from '../core/types';

export function PatientPage() {
  const { diary, savePatient } = useDiary();
  const toast = useToast();
  const navigate = useNavigate();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [checked, setChecked] = useState(false);
  const p = diary.patient;

  // Każda zmiana jest od razu zapisywana na urządzeniu.
  const update = (patch: Partial<Patient>) => {
    const next = { ...p, ...patch };
    savePatient(next);
    if (checked) setErrors(validatePatient(next));
  };

  function confirm() {
    const normalized: Patient = {
      ...p,
      startTime: p.startTime ? (normalizeTime(p.startTime) ?? p.startTime) : '',
      endTime: p.endTime ? (normalizeTime(p.endTime) ?? p.endTime) : '',
    };
    savePatient(normalized);
    const errs = validatePatient(normalized);
    setErrors(errs);
    setChecked(true);
    if (Object.keys(errs).length > 0) {
      toast('Uzupełnij lub popraw zaznaczone pola.', 'error');
      return;
    }
    toast('Dane pacjenta i badania są zapisane.');
    navigate('/');
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Dane pacjenta i badania</h1>
        <p className="mt-2 text-[15px] text-navy/80">Zmiany zapisują się automatycznie. Godzinę zakończenia badania możesz uzupełnić później.</p>
      </div>

      <div className="card space-y-5">
        <TextField label="Imię pacjenta (imię zwierzęcia)" value={p.petName} onChange={(petName) => update({ petName })} error={errors.petName} maxLength={LIMITS.short} />
        <TextField
          label="Nazwisko opiekuna"
          hint="Nazwisko, pod którym pacjent jest zarejestrowany w przychodni."
          value={p.ownerName}
          onChange={(ownerName) => update({ ownerName })}
          error={errors.ownerName}
          maxLength={LIMITS.short}
          autoComplete="family-name"
        />
        <ChoiceGrid<Species>
          label="Gatunek"
          columns={3}
          value={p.species}
          onChange={(species) => update({ species })}
          options={[
            { value: 'pies', label: 'Pies' },
            { value: 'kot', label: 'Kot' },
            { value: 'inne', label: 'Inne' },
          ]}
          error={errors.species}
        />
        {p.species === 'inne' && (
          <TextField label="Jaki gatunek?" optional value={p.speciesOther} onChange={(speciesOther) => update({ speciesOther })} error={errors.speciesOther} maxLength={LIMITS.short} />
        )}
      </div>

      <div className="card space-y-5">
        <DateTimeField
          label="Rozpoczęcie badania"
          date={p.startDate}
          time={p.startTime}
          onDate={(startDate) => update({ startDate })}
          onTime={(startTime) => update({ startTime })}
          dateError={errors.startDate}
          timeError={errors.startTime}
          hint="Godzina założenia Holtera."
          onNow={() => {
            const n = nowLocal();
            update({ startDate: n.date, startTime: n.time });
          }}
        />
        <DateTimeField
          label="Zakończenie badania"
          optional
          date={p.endDate}
          time={p.endTime}
          onDate={(endDate) => update({ endDate })}
          onTime={(endTime) => update({ endTime })}
          dateError={errors.endDate}
          timeError={errors.endTime}
          hint="Do uzupełnienia po zdjęciu Holtera."
          onNow={() => {
            const n = nowLocal();
            update({ endDate: n.date, endTime: n.time });
          }}
        />
        <TextField label="Dodatkowe uwagi" optional multiline value={p.notes} onChange={(notes) => update({ notes })} error={errors.notes} maxLength={LIMITS.long} />
      </div>

      <StorageNote />

      <button type="button" className="btn-primary w-full text-lg" onClick={confirm}>
        Gotowe – przejdź do dzienniczka
      </button>
    </div>
  );
}
