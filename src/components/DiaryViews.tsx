import { useState } from 'react';
import { Pencil } from 'lucide-react';
import type { DayGroup, ReportModel, TimelineItem } from '../core/report';
import { KIND_STYLE } from './kinds';

/** Wspólna lista zdarzeń podzielona na dni. */
export function Timeline({ days, onEdit, compact }: { days: DayGroup[]; onEdit?: (entryId: string) => void; compact?: boolean }) {
  return (
    <div className="space-y-6">
      {days.map((day) => (
        <section key={day.date} aria-label={day.label}>
          <h3 className="sticky top-16 z-10 -mx-1 mb-2 rounded-xl bg-offwhite/95 px-1 py-1.5 text-[15px] font-extrabold capitalize text-navy backdrop-blur print:static">
            {day.label}
          </h3>
          <ol className="space-y-2.5">
            {day.items.map((it) => (
              <TimelineCard key={it.key} it={it} onEdit={onEdit} compact={compact} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function TimelineCard({ it, onEdit, compact }: { it: TimelineItem; onEdit?: (id: string) => void; compact?: boolean }) {
  const { Icon, badge, bar } = KIND_STYLE[it.kind];
  const [open, setOpen] = useState(false);
  const longText = it.details.some((d) => d.value.length > 220);
  const collapse = compact && longText && !open;
  const [start, rest = ''] = it.timeLabel.split('–');
  const end = rest.split(' ')[0];
  const nextDay = rest.includes('(do');
  return (
    <li className={`break-inside-avoid rounded-2xl border border-powder/80 border-l-[6px] bg-white p-3.5 shadow-sm ${bar} ${it.kind === 'symptom' ? 'bg-[#FBF1F1]' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="w-[64px] shrink-0">
          <p className="text-[17px] font-extrabold leading-tight tabular-nums">{start}</p>
          {end && <p className="text-[13px] font-bold leading-tight text-navy/70 tabular-nums">do {end}</p>}
          {nextDay && <p className="text-[11px] font-semibold leading-tight text-navy/60">następnego dnia</p>}
        </div>
        <div className="min-w-0 flex-1">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${badge}`}>
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {it.kindLabel}
          </span>
          <p className={`mt-1 text-[16px] font-bold leading-snug ${it.kind === 'symptom' ? 'text-burgundy' : ''}`}>{it.title}</p>
          {it.details.length > 0 && (
            <dl className={`mt-1.5 space-y-1 text-[14px] leading-snug text-navy/85 ${collapse ? 'line-clamp-4' : ''}`}>
              {it.details.map((d) => (
                <div key={d.label}>
                  <dt className="inline font-bold">{d.label}: </dt>
                  <dd className="inline whitespace-pre-wrap break-words">{d.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {compact && longText && (
            <button type="button" className="mt-1 text-sm font-bold text-navy underline print:hidden" onClick={() => setOpen((v) => !v)}>
              {open ? 'Zwiń opis' : 'Pokaż cały opis'}
            </button>
          )}
          {it.added && <p className="mt-1.5 text-[12px] font-medium text-navy/55">{it.added}</p>}
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(it.entryId)}
            className="-m-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-navy/70 hover:bg-cream print:hidden"
            aria-label={`Edytuj lub usuń: ${it.title}, ${it.timeLabel}`}
          >
            <Pencil className="h-5 w-5" />
          </button>
        )}
      </div>
    </li>
  );
}

/** Podgląd całego dzienniczka – ta sama treść, co w PDF. */
export function DiaryPreview({ model, onEdit, onEditPatient }: { model: ReportModel; onEdit?: (id: string) => void; onEditPatient?: () => void }) {
  return (
    <div className="space-y-6" id="podglad">
      <section className="card">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="section-title">Dane pacjenta i badania</h3>
          {onEditPatient && (
            <button type="button" className="btn-ghost !min-h-[40px] text-sm print:hidden" onClick={onEditPatient}>
              <Pencil className="h-4 w-4" /> Popraw
            </button>
          )}
        </div>
        <dl className="space-y-2 text-[15px]">
          {model.patientRows.map((r) => (
            <div key={r.label} className="grid grid-cols-[minmax(0,40%)_1fr] gap-3">
              <dt className="text-navy/65">{r.label}</dt>
              <dd className="whitespace-pre-wrap break-words font-semibold">{r.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[13px] font-semibold text-navy/65">
          Wpisy: aktywności {model.counts.activity} · okresy snu {model.counts.sleep} · objawy / zdarzenia {model.counts.symptom} · podania leków {model.counts.medication}
        </p>
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="section-title">Leki podawane na stałe</h3>
          {onEditPatient && (
            <button type="button" className="btn-ghost !min-h-[40px] text-sm print:hidden" onClick={onEditPatient}>
              <Pencil className="h-4 w-4" /> Popraw
            </button>
          )}
        </div>
        {model.medications.length === 0 ? (
          <p className="text-[15px] text-navy/70">Nie wpisano leków podawanych na stałe.</p>
        ) : (
          <ul className="divide-y divide-powder">
            {model.medications.map((m) => (
              <li key={m.id} className="py-2.5 text-[15px]">
                <p className="font-bold">
                  {m.name} <span className="font-semibold text-navy/75">– {m.dose}</span>
                </p>
                {m.schedule && <p className="text-navy/80">Kiedy: {m.schedule}</p>}
                {m.notes && <p className="whitespace-pre-wrap break-words text-navy/80">Uwagi: {m.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h3 className="section-title mb-3">Okresy snu</h3>
        {model.sleeps.length === 0 ? (
          <p className="text-[15px] text-navy/70">Nie zapisano okresów snu.</p>
        ) : (
          <ol className="divide-y divide-powder">
            {model.sleeps.map((s, i) => (
              <li key={s.entryId} className="flex items-start gap-3 py-2.5 text-[15px]">
                <span className="w-6 shrink-0 font-bold text-navy/60">{i + 1}.</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {s.start} → {s.end}
                  </p>
                  <p className="text-navy/75">Czas snu: {s.duration}</p>
                  {s.notes && <p className="whitespace-pre-wrap break-words text-navy/85">Uwagi: {s.notes}</p>}
                </div>
                {onEdit && (
                  <button type="button" onClick={() => onEdit(s.entryId)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-navy/70 hover:bg-cream print:hidden" aria-label={`Popraw sen ${s.start}`}>
                    <Pencil className="h-5 w-5" />
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h3 className="section-title mb-3 px-1">Przebieg badania – wszystkie wpisy chronologicznie</h3>
        {model.days.length === 0 ? <p className="card text-[15px] text-navy/70">Brak wpisów.</p> : <Timeline days={model.days} onEdit={onEdit} />}
      </section>
    </div>
  );
}
