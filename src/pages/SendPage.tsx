import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleCheck, Download, LoaderCircle, Mail, Printer, Send, TriangleAlert } from 'lucide-react';
import { useDiary } from '../hooks/useDiary';
import { useEntryEditor } from '../components/EntryEditor';
import { useToast } from '../components/Toast';
import { DiaryPreview } from '../components/DiaryViews';
import { Modal } from '../components/Modal';
import { buildReport, stampLabel, studyPeriodText } from '../core/report';
import { RECIPIENT_EMAIL, REPORT_FOOTER, SENT_TEXT } from '../core/labels';
import { parseDiary } from '../core/validation';
import { downloadFile, makePdfFile } from '../lib/pdfClient';
import { sendDiary } from '../lib/sendClient';

type SendState = { phase: 'idle' } | { phase: 'confirm' } | { phase: 'sending' } | { phase: 'error'; message: string; retryable: boolean };

export function SendPage() {
  const { diary, meta, changedSinceSent, markSent } = useDiary();
  const { edit } = useEntryEditor();
  const toast = useToast();
  const navigate = useNavigate();
  const model = useMemo(() => buildReport(diary), [diary]);
  const check = useMemo(() => parseDiary(diary, { requireComplete: true }), [diary]);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [send, setSend] = useState<SendState>({ phase: 'idle' });
  const [justSent, setJustSent] = useState<null | { duplicate: boolean }>(null);
  const [honeypot, setHoneypot] = useState('');
  const sendingRef = useRef(false);

  async function downloadPdf() {
    setPdfBusy(true);
    try {
      downloadFile(await makePdfFile(diary));
    } catch (e) {
      console.error(e);
      toast('Nie udało się przygotować pliku PDF. Spróbuj ponownie.', 'error');
    } finally {
      setPdfBusy(false);
    }
  }

  async function doSend() {
    // Blokada wielokrotnego kliknięcia – niezależna od odświeżenia widoku
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSend({ phase: 'sending' });
    try {
      const res = await sendDiary(diary, honeypot);
      if (res.ok) {
        markSent(res.duplicate);
        setJustSent({ duplicate: res.duplicate });
        setSend({ phase: 'idle' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setSend({ phase: 'error', message: res.message, retryable: res.retryable });
      }
    } finally {
      sendingRef.current = false;
    }
  }

  const sentBanner = justSent ?? (meta.lastSent && !changedSinceSent ? { duplicate: false } : null);

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <h1 className="page-title">Podgląd, PDF i wysyłka</h1>
        <p className="mt-2 text-[15px] text-navy/80">Sprawdź dzienniczek. Każdy wpis możesz jeszcze poprawić – dotknij ikony ołówka.</p>
      </div>

      {/* Nagłówek widoczny tylko w wydruku */}
      <div className="hidden items-center gap-5 border-b-2 border-powder pb-3 print:flex">
        <img src="/assets/01_brand/logo_lapa_poziome_granat_transparent.png" alt="Łapa na Pulsie" className="h-12 w-auto" />
        <div>
          <p className="text-xl font-extrabold">Dzienniczek holterowski</p>
          <p className="text-sm">Obserwacje opiekuna w czasie badania Holter EKG · {studyPeriodText(diary)}</p>
        </div>
      </div>

      {sentBanner && (
        <div className="flex gap-3 rounded-3xl bg-navy p-4 text-offwhite shadow-soft print:hidden" role="status">
          <CircleCheck className="mt-0.5 h-6 w-6 shrink-0" />
          <div className="text-[15px] font-semibold leading-snug">
            <p className="font-extrabold">{SENT_TEXT}</p>
            {justSent?.duplicate && <p className="mt-1 text-offwhite/85">Ten sam dzienniczek był już wcześniej przekazany – nie wysłaliśmy go drugi raz.</p>}
            {meta.lastSent && <p className="mt-1 text-offwhite/85">Wysłano: {stampLabel(meta.lastSent.at)}. Dane pozostają zapisane na tym urządzeniu.</p>}
          </div>
        </div>
      )}
      {meta.lastSent && changedSinceSent && !justSent && (
        <div className="card-cream text-[15px] font-semibold print:hidden">
          Dzienniczek wysłano {stampLabel(meta.lastSent.at)}, ale od tego czasu wprowadzono zmiany. Możesz wysłać zaktualizowaną wersję.
        </div>
      )}

      {!check.ok && (
        <div className="flex gap-3 rounded-3xl border-2 border-burgundy/40 bg-white p-4 print:hidden" role="alert">
          <TriangleAlert className="mt-0.5 h-6 w-6 shrink-0 text-burgundy" />
          <div className="text-[15px] font-semibold leading-snug">
            <p>{check.error}</p>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <Link to="/dane" className="underline">
                Dane pacjenta i badania
              </Link>
              <Link to="/" className="underline">
                Lista wpisów
              </Link>
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 print:hidden">
        <button type="button" className="btn-secondary" onClick={downloadPdf} disabled={pdfBusy}>
          {pdfBusy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />} Pobierz dzienniczek PDF
        </button>
        <button type="button" className="btn-secondary" onClick={() => window.print()}>
          <Printer className="h-5 w-5" /> Drukuj
        </button>
      </div>

      <DiaryPreview model={model} onEdit={edit} onEditPatient={() => navigate('/dane')} />

      <p className="hidden text-xs print:block">{REPORT_FOOTER}</p>

      <section className="card space-y-4 print:hidden" aria-labelledby="wysylka">
        <h2 id="wysylka" className="section-title">
          Wysyłka do lekarza
        </h2>
        <div className="flex items-center gap-3 rounded-2xl bg-cream/60 p-3.5">
          <Mail className="h-5 w-5 shrink-0" />
          <p className="text-[15px]">
            Odbiorca: <strong className="break-all">{RECIPIENT_EMAIL}</strong>
          </p>
        </div>
        <p className="text-[14px] leading-snug text-navy/80">Wiadomość zawiera dane pacjenta, okres badania oraz pełny dzienniczek w załączniku PDF (taki sam jak powyższy podgląd).</p>
        <button type="button" className="btn-primary w-full text-lg" disabled={!check.ok} onClick={() => setSend({ phase: 'confirm' })}>
          <Send className="h-5 w-5" /> Wyślij do lekarza
        </button>
      </section>

      <Modal
        open={send.phase !== 'idle'}
        title={send.phase === 'error' ? 'Nie udało się wysłać' : 'Wysłać dzienniczek?'}
        onClose={() => send.phase !== 'sending' && setSend({ phase: 'idle' })}
        dismissOnBackdrop={false}
      >
        {send.phase === 'error' ? (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-2xl bg-burgundy p-4 text-white" role="alert">
              <TriangleAlert className="mt-0.5 h-6 w-6 shrink-0" />
              <p className="text-[15px] font-semibold leading-snug">{send.message}</p>
            </div>
            <p className="text-[14px] text-navy/80">Wszystkie wpisy pozostały zapisane na tym urządzeniu.</p>
            {send.retryable && (
              <button type="button" className="btn-primary w-full" onClick={doSend}>
                Spróbuj ponownie
              </button>
            )}
            <button type="button" className="btn-secondary w-full" onClick={downloadPdf} disabled={pdfBusy}>
              <Download className="h-5 w-5" /> Pobierz dzienniczek PDF
            </button>
            <button type="button" className="btn-ghost w-full" onClick={() => setSend({ phase: 'idle' })}>
              Zamknij
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <dl className="space-y-2 rounded-2xl bg-white p-4 text-[15px]">
              <div>
                <dt className="text-navy/65">Odbiorca</dt>
                <dd className="break-all font-bold">{RECIPIENT_EMAIL}</dd>
              </div>
              <div>
                <dt className="text-navy/65">Temat</dt>
                <dd className="font-semibold">{model.subject}</dd>
              </div>
              <div>
                <dt className="text-navy/65">Okres badania</dt>
                <dd className="font-semibold">{studyPeriodText(diary)}</dd>
              </div>
              <div>
                <dt className="text-navy/65">Załącznik</dt>
                <dd className="break-all font-semibold">{model.fileName}</dd>
              </div>
            </dl>
            {/* Pole-pułapka na automaty spamujące – niewidoczne dla ludzi */}
            <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
              <label>
                Strona internetowa
                <input type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
              </label>
            </div>
            {send.phase === 'sending' ? (
              <div className="flex min-h-[52px] items-center justify-center gap-3 rounded-2xl bg-navy px-5 font-bold text-offwhite" role="status" aria-live="assertive">
                <LoaderCircle className="h-5 w-5 animate-spin" /> Wysyłanie dzienniczka…
              </div>
            ) : (
              <button type="button" className="btn-primary w-full text-lg" onClick={doSend}>
                Potwierdzam – wyślij
              </button>
            )}
            <button type="button" className="btn-secondary w-full" disabled={send.phase === 'sending'} onClick={() => setSend({ phase: 'idle' })}>
              Wróć i popraw
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
