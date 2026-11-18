import { HeartPulse, ShieldCheck, TriangleAlert } from 'lucide-react';
import { INSTRUCTION_TEXT, NOT_MONITORED_TEXT } from '../core/labels';

export function InstructionCard() {
  return (
    <div className="card flex gap-3 !p-4">
      <HeartPulse className="mt-0.5 h-6 w-6 shrink-0 text-burgundy" aria-hidden />
      <p className="text-[15px] font-medium leading-relaxed">{INSTRUCTION_TEXT}</p>
    </div>
  );
}

export function NotMonitoredNote() {
  return (
    <div className="flex gap-3 rounded-2xl border-2 border-burgundy/30 bg-white/80 p-3.5 text-[14px] font-semibold leading-snug text-burgundy" role="note">
      <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <p>{NOT_MONITORED_TEXT}</p>
    </div>
  );
}

export function StorageNote() {
  return (
    <div className="flex gap-3 rounded-2xl bg-cream/60 p-3.5 text-[14px] font-semibold leading-snug">
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-navy" aria-hidden />
      <p>
        Dane są zapisywane automatycznie w tej przeglądarce, na tym urządzeniu. Lekarz otrzyma je dopiero po użyciu przycisku „Wyślij do lekarza”.
      </p>
    </div>
  );
}
