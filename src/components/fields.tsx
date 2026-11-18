import { useId, type ReactNode } from 'react';
import { Clock } from 'lucide-react';
import { normalizeTime } from '../core/time';

interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}

export function Field({ label, error, hint, optional, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
        {optional && <span className="ml-1 font-semibold text-navy/55">(opcjonalnie)</span>}
      </label>
      {children(id, describedBy)}
      {hint && (
        <p id={hintId} className="mt-1.5 text-[13px] leading-snug text-navy/70">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface TextProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  autoComplete?: string;
}

export function TextField({ label, value, onChange, error, hint, optional, placeholder, multiline, maxLength, autoComplete }: TextProps) {
  return (
    <Field label={label} error={error} hint={hint} optional={optional}>
      {(id, describedBy) =>
        multiline ? (
          <textarea
            id={id}
            className={`field min-h-[110px] resize-y leading-relaxed ${error ? '!border-burgundy' : ''}`}
            value={value}
            placeholder={placeholder}
            maxLength={maxLength}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            id={id}
            type="text"
            className={`field ${error ? '!border-burgundy' : ''}`}
            value={value}
            placeholder={placeholder}
            maxLength={maxLength}
            autoComplete={autoComplete ?? 'off'}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      }
    </Field>
  );
}

interface DateTimeProps {
  label: string;
  date: string;
  time: string;
  onDate: (v: string) => void;
  onTime: (v: string) => void;
  dateError?: string;
  timeError?: string;
  optional?: boolean;
  hint?: ReactNode;
  /** Pokazuje przycisk „Teraz”, który wpisuje aktualną datę i godzinę (pola pozostają edytowalne). */
  onNow?: () => void;
  nowLabel?: string;
}

/** Data (kalendarz) + godzina w formacie 24-godzinnym wpisywana z klawiatury numerycznej. */
export function DateTimeField({ label, date, time, onDate, onTime, dateError, timeError, optional, hint, onNow, nowLabel = 'Teraz' }: DateTimeProps) {
  const id = useId();
  const err = dateError || timeError;
  return (
    <fieldset>
      <div className="mb-1.5 flex items-end justify-between gap-2">
        <legend className="label !mb-0">
          {label}
          {optional && <span className="ml-1 font-semibold text-navy/55">(opcjonalnie)</span>}
        </legend>
        {onNow && (
          <button type="button" onClick={onNow} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-navy px-4 text-sm font-bold text-offwhite active:scale-[0.97]">
            <Clock className="h-4 w-4" /> {nowLabel}
          </button>
        )}
      </div>
      <div className="grid grid-cols-[1.35fr_1fr] gap-2">
        <div>
          <label htmlFor={`${id}-d`} className="sr-only">
            {label} – data
          </label>
          <input
            id={`${id}-d`}
            type="date"
            className={`field ${dateError ? '!border-burgundy' : ''}`}
            value={date}
            min="2020-01-01"
            max="2100-12-31"
            aria-invalid={!!dateError}
            onChange={(e) => onDate(e.target.value)}
          />
        </div>
        <TimeInput id={`${id}-t`} label={`${label} – godzina`} value={time} onChange={onTime} invalid={!!timeError} />
      </div>
      {hint && <p className="mt-1.5 text-[13px] leading-snug text-navy/70">{hint}</p>}
      {err && (
        <p className="field-error" role="alert">
          {dateError ? dateError : timeError}
        </p>
      )}
    </fieldset>
  );
}

interface TimeInputProps {
  id?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  visibleLabel?: boolean;
}

export function TimeInput({ id: givenId, label, value, onChange, invalid, visibleLabel }: TimeInputProps) {
  const autoId = useId();
  const id = givenId ?? autoId;
  return (
    <div>
      <label htmlFor={id} className={visibleLabel ? 'label' : 'sr-only'}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="GG:MM"
        maxLength={5}
        className={`field text-center text-lg font-bold tracking-wide ${invalid ? '!border-burgundy' : ''}`}
        value={value}
        aria-invalid={!!invalid}
        onChange={(e) => {
          const v = e.target.value.replace(/[^\d:.,\s]/g, '');
          // Po wpisaniu 4 cyfr od razu formatujemy jako GG:MM
          if (/^\d{4}$/.test(v)) onChange(normalizeTime(v) ?? v);
          else onChange(v);
        }}
        onBlur={(e) => {
          const n = normalizeTime(e.target.value);
          if (n) onChange(n);
        }}
      />
    </div>
  );
}

export function ChoiceGrid<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
  columns = 2,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | '';
  onChange: (v: T) => void;
  error?: string;
  columns?: 1 | 2 | 3;
}) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className={`grid gap-2 ${columns === 3 ? 'grid-cols-3' : columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`} role="radiogroup">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`min-h-[52px] rounded-2xl border-2 px-3 py-2 text-left text-[15px] font-bold leading-tight transition active:scale-[0.98] ${
                active ? 'border-navy bg-navy text-offwhite' : 'border-powder bg-white text-navy hover:border-navy/30'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
