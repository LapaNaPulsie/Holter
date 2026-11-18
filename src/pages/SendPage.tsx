import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleCheck, Copy, Download, LoaderCircle, Mail, Printer, Send, TriangleAlert } from 'lucide-react';
import { useDiary } from '../hooks/useDiary';
import { useEntryEditor } from '../components/EntryEditor';
import { useToast } from '../components/Toast';
import { DiaryPreview } from '../components/DiaryViews';
import { buildReport, emailBody, studyPeriodText } from '../core/report';
import { RECIPIENT_EMAIL, REPORT_FOOTER } from '../core/labels';
import { parseDiary } from '../core/validation';
import { downloadFile, makePdfFile } from '../lib/pdfClient';
import { copyText, deviceCanShareFiles, mailtoUrl, shareFile } from '../lib/share';

type Status = null | { kind: 'shared' } | { kind: 'mail' } | { kind: 'error'; text: string };

export function SendPage() {
  const { diary } = useDiary();
  const { edit } = useEntryEditor();
  const toast = useToast();
  const navigate = useNavigate();
  const model = useMemo(() => buildReport(diary), [diary]);
  const check = useMemo(() => parseDiary(diary, { requireComplete: true }), [diary]);
  const body = useMemo(() => emailBody(diary), [diary]);
  const canShare = useMemo(() => deviceCanShareFiles(), []);
  const [pdf, setPdf] = useState<File | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  // PDF przygotowywany z wyprzedzeniem – udostępnianie musi ruszyć od razu po dotknięciu przycisku.
  useEffect(() => {
    let alive = true;
    setPdf(null);
    setStatus(null);
    const t = setTimeout(() => {
      makePdfFile(diary)
        .then((f) => alive && setPdf(f))
        .catch(() => alive && setPdf(null));
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [diary]);

  async function getPdf(): Promise<File | null> {
    if (pdf) return pdf;
    setPdfBusy(true);
    try {
      const f = await makePdfFile(diary);
      setPdf(f);
      return f;
    } catch {
      toast('Nie udało się przygotować pliku PDF. Spróbuj ponownie.', 'error');
      return null;
    } finally {
      setPdfBusy(false);
    }
  }

  async function download() {
    const f = await getPdf();
    if (f) downloadFile(f);
  }

  async function sendToDoctor() {
    if (!check.ok) return;
    if (canShare && pdf) {
      // Adres do schowka – w programie pocztowym wystarczy go wkleić w polu „Do”.
      void copyText(RECIPIENT_EMAIL);
      const res = await shareFile(pdf, model.subject, `Do: ${RECIPIENT_EMAIL}\n\n${body}`);
      if (res === 'shared') setStatus({ kind: 'shared' });
      else if (res === 'error' || res === 'unsupported') fallbackMail(pdf);
      return;
    }
    const f = await getPdf();
    if (f) fallbackMail(f);
  }

  /** Komputer / brak udostępniania: pobierz PDF i otwórz e-mail z adresem, tematem i treścią. */
  function fallbackMail(f: File) {
    downloadFile(f);
    setStatus({ kind: 'mail' });
    setTimeout(() => {
      window.location.href = mailtoUrl(model.subject, body);
    }, 600);
  }

  async function copy(text: string, label: string) {
    toast((await copyText(text)) ? `Skopiowano ${label}.` : 'Nie udało się skopiować – zaznacz tekst ręcznie.', 'success');
  }

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
        <button type="button" className="btn-secondary" onClick={download} disabled={pdfBusy}>
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
          Wyślij do lekarza
        </h2>

        <div className="space-y-2 rounded-2xl bg-cream/60 p-3.5">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 shrink-0" />
            <p className="flex-1 text-[15px]">
              Adres: <strong className="break-all">{RECIPIENT_EMAIL}</strong>
            </p>
            <button type="button" className="inline-flex min-h-[40px] items-center gap-1 rounded-full bg-navy px-3 text-sm font-bold text-offwhite" onClick={() => copy(RECIPIENT_EMAIL, 'adres')}>
              <Copy className="h-4 w-4" /> Kopiuj
            </button>
          </div>
          <p className="text-[13px] font-semibold text-navy/75">Temat: {model.subject}</p>
        </div>

        <ol className="list-decimal space-y-1.5 pl-5 text-[15px] leading-snug text-navy/85">
          {canShare ? (
            <>
              <li>Dotknij „Wyślij do lekarza” i wybierz <b>Pocztę</b> lub <b>Gmail</b>. Plik PDF będzie już dołączony.</li>
              <li>
                W polu <b>Do</b> przytrzymaj palec i wybierz <b>Wklej</b> – adres jest już skopiowany.
              </li>
              <li>Wyślij wiadomość.</li>
            </>
          ) : (
            <>
              <li>Dotknij „Wyślij do lekarza” – plik PDF zostanie pobrany, a program pocztowy otworzy się z wpisanym adresem i tematem.</li>
              <li>Dołącz pobrany plik PDF (zwykle w folderze „Pobrane”) i wyślij wiadomość.</li>
            </>
          )}
        </ol>

        <button type="button" className="btn-primary w-full text-lg" disabled={!check.ok || pdfBusy || (canShare && !pdf)} onClick={sendToDoctor}>
          {canShare && !pdf && check.ok ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} Wyślij do lekarza
        </button>

        {status?.kind === 'shared' && (
          <div className="flex gap-3 rounded-2xl bg-navy p-4 text-offwhite" role="status">
            <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-[14px] font-semibold leading-snug">
              Sprawdź w programie pocztowym, czy wiadomość została wysłana na {RECIPIENT_EMAIL} z dołączonym plikiem PDF. Dane pozostają zapisane na tym urządzeniu.
            </p>
          </div>
        )}
        {status?.kind === 'mail' && (
          <div className="space-y-2 rounded-2xl bg-navy p-4 text-offwhite" role="status">
            <p className="text-[14px] font-semibold leading-snug">
              Plik PDF został pobrany. Dołącz go do wiadomości i wyślij. Jeśli program pocztowy się nie otworzył, napisz na {RECIPIENT_EMAIL} i dołącz plik {model.fileName}.
            </p>
            <a href={mailtoUrl(model.subject, body)} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-offwhite px-4 text-sm font-bold text-navy">
              <Mail className="h-4 w-4" /> Otwórz e-mail ponownie
            </a>
          </div>
        )}

        <details className="text-[14px]">
          <summary className="cursor-pointer font-bold text-navy/80">Nie działa? Wyślij ręcznie</summary>
          <div className="mt-2 space-y-2 text-navy/85">
            <p>Pobierz PDF przyciskiem powyżej, napisz nową wiadomość na {RECIPIENT_EMAIL} i dołącz plik. Możesz skopiować gotową treść:</p>
            <button type="button" className="btn-secondary w-full !min-h-[44px] text-sm" onClick={() => copy(body, 'treść wiadomości')}>
              <Copy className="h-4 w-4" /> Kopiuj treść wiadomości
            </button>
          </div>
        </details>
      </section>
    </div>
  );
}
