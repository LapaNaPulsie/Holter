import { parseDiary, canonicalJson } from '../../src/core/validation';
import { buildReport, studyPeriodText } from '../../src/core/report';
import { generateDiaryPdf, warsawStamp, type PdfAssets } from '../../src/core/pdf';
import { RECIPIENT_EMAIL, speciesText } from '../../src/core/labels';
import type { Diary } from '../../src/core/types';

/**
 * Logika wysyłki dzienniczka – niezależna od Netlify, dzięki czemu można ją testować.
 *
 * Zasady:
 *  - adres odbiorcy jest ustawiony na stałe (RECIPIENT_EMAIL), klient nie może go zmienić,
 *  - dane są ponownie sprawdzane na serwerze, a PDF jest generowany na serwerze z tych samych danych
 *    i tym samym kodem, co PDF do pobrania w aplikacji,
 *  - sukces jest zwracany wyłącznie po potwierdzeniu przyjęcia wiadomości przez usługę pocztową,
 *  - ten sam dzienniczek (identyczna treść) nie zostanie wysłany drugi raz,
 *  - limit liczby wysyłek z jednego adresu IP i łącznie na dobę,
 *  - w logach i w magazynie zapisywane są wyłącznie kody zdarzeń i skróty (hash), nigdy treść dzienniczka.
 */

export const MAX_BODY_BYTES = 600_000;
export const LIMITS = { perIpHour: 6, perIpDay: 20, globalDay: 200 } as const;
const PENDING_TTL_MS = 3 * 60_000;

export interface KV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { onlyIfNew?: boolean }): Promise<{ modified: boolean }>;
  delete(key: string): Promise<void>;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachment: { filename: string; contentBase64: string };
  idempotencyKey: string;
}

export interface Mailer {
  /** Musi rzucić wyjątek, jeśli usługa pocztowa nie przyjęła wiadomości. */
  send(msg: MailMessage): Promise<{ id: string }>;
}

export interface Deps {
  store: KV;
  mailer: Mailer | null;
  loadAssets: () => Promise<PdfAssets>;
  clientIp: string;
  secret: string;
  allowedOrigins: string[];
  now?: () => number;
  log?: (code: string) => void;
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

function toBase64(buf: ArrayBuffer): string {
  return Buffer.from(new Uint8Array(buf)).toString('base64');
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildEmail(diary: Diary, fileName: string): { subject: string; text: string; html: string } {
  const model = buildReport(diary);
  const p = diary.patient;
  const c = model.counts;
  const rows: [string, string][] = [
    ['Pacjent', p.petName.trim()],
    ['Nazwisko opiekuna', p.ownerName.trim()],
    ['Gatunek', speciesText(p.species, p.speciesOther)],
    ['Okres badania', studyPeriodText(diary)],
    ['Liczba wpisów', `aktywności ${c.activity}, okresy snu ${c.sleep}, objawy / zdarzenia ${c.symptom}, podania leków ${c.medication}`],
  ];
  const attachmentInfo = `Pełny dzienniczek (dane pacjenta, okresy snu, aktywności, objawy, podane leki i wszystkie uwagi opiekuna) znajduje się w załączniku PDF: ${fileName}`;
  const footer = 'Wiadomość wysłana automatycznie z aplikacji Dzienniczek holterowski | Łapa na Pulsie. Adres nadawcy nie jest adresem opiekuna.';
  const text = [
    'Dzień dobry,',
    '',
    'opiekun przesłał dzienniczek holterowski.',
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    attachmentInfo,
    '',
    '--',
    footer,
  ].join('\n');
  const html = `<!doctype html><html lang="pl"><body style="font-family:Arial,Helvetica,sans-serif;color:#142E49;font-size:15px;line-height:1.5">
<p>Dzień dobry,</p><p>opiekun przesłał <strong>dzienniczek holterowski</strong>.</p>
<table cellpadding="4" style="border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="color:#5C6C7D;padding-right:16px;vertical-align:top">${escapeHtml(k)}</td><td><strong>${escapeHtml(v)}</strong></td></tr>`)
    .join('')}</table>
<p>${escapeHtml(attachmentInfo)}</p>
<p style="color:#5C6C7D;font-size:12px;border-top:1px solid #E5D1C1;padding-top:8px">${escapeHtml(footer)}</p></body></html>`;
  return { subject: model.subject, text, html };
}

function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

async function bump(store: KV, key: string): Promise<number> {
  const current = Number((await store.get(key)) ?? '0') || 0;
  const next = current + 1;
  await store.set(key, String(next));
  return next;
}

export async function handleSend(req: Request, deps: Deps): Promise<Response> {
  const now = deps.now ?? Date.now;
  const log = deps.log ?? (() => {});

  if (req.method !== 'POST') return json(405, { code: 'method_not_allowed' });

  // Żądania tylko z tej samej strony (lub z adresów dopuszczonych w konfiguracji)
  const origin = req.headers.get('origin');
  if (origin) {
    let ok = false;
    try {
      const o = new URL(origin);
      ok = o.host === new URL(req.url).host || deps.allowedOrigins.includes(o.origin);
    } catch {
      ok = false;
    }
    if (!ok) {
      log('forbidden_origin');
      return json(403, { code: 'forbidden', message: 'Niedozwolone źródło żądania.' });
    }
  }
  if (!(req.headers.get('content-type') ?? '').includes('application/json')) return json(415, { code: 'invalid', message: 'Nieprawidłowy format danych.' });
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES) return json(413, { code: 'invalid', message: 'Dzienniczek jest zbyt duży.' });

  let body: { diary?: unknown; website?: unknown };
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return json(413, { code: 'invalid', message: 'Dzienniczek jest zbyt duży.' });
    body = JSON.parse(text);
  } catch {
    return json(400, { code: 'invalid', message: 'Nieprawidłowy format danych.' });
  }

  // Pole-pułapka: wypełniają je tylko automaty
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    log('honeypot');
    return json(400, { code: 'invalid', message: 'Nie można wysłać formularza.' });
  }

  const parsed = parseDiary(body.diary, { requireComplete: true });
  if (!parsed.ok) {
    log('invalid_diary');
    return json(400, { code: 'invalid', message: parsed.error });
  }
  const diary = parsed.diary;

  if (!deps.mailer) {
    log('not_configured');
    return json(503, { code: 'not_configured' });
  }

  const t = now();
  const fp = await sha256(canonicalJson(diary));
  const sentKey = `sent/${fp}`;

  // Duplikat – ten sam dzienniczek już przyjęty przez usługę pocztową (bez liczenia do limitu)
  const existing = await deps.store.get(sentKey);
  if (existing) {
    const rec = JSON.parse(existing) as { state: string; at: number };
    if (rec.state === 'sent') {
      log('duplicate');
      return json(200, { status: 'already_sent' });
    }
    if (rec.state === 'pending' && t - rec.at < PENDING_TTL_MS) return json(409, { code: 'in_progress' });
  }

  // Limity
  const ipHash = (await sha256(`${deps.secret}|${deps.clientIp}`)).slice(0, 24);
  const day = dayKey(t);
  const hour = new Date(t).toISOString().slice(0, 13);
  const [h, d, g] = await Promise.all([
    deps.store.get(`rl/h/${hour}/${ipHash}`),
    deps.store.get(`rl/d/${day}/${ipHash}`),
    deps.store.get(`rl/g/${day}`),
  ]);
  if (Number(h ?? 0) >= LIMITS.perIpHour || Number(d ?? 0) >= LIMITS.perIpDay || Number(g ?? 0) >= LIMITS.globalDay) {
    log('rate_limited');
    return json(429, { code: 'rate_limited' });
  }

  // Rezerwacja – chroni przed równoczesnym wysłaniem tego samego dzienniczka
  const pending = JSON.stringify({ state: 'pending', at: t });
  const reserved = existing ? await deps.store.set(sentKey, pending) : await deps.store.set(sentKey, pending, { onlyIfNew: true });
  if (!reserved.modified) return json(409, { code: 'in_progress' });

  await Promise.all([bump(deps.store, `rl/h/${hour}/${ipHash}`), bump(deps.store, `rl/d/${day}/${ipHash}`), bump(deps.store, `rl/g/${day}`)]);

  let pdfBase64: string;
  const model = buildReport(diary);
  try {
    const assets = await deps.loadAssets();
    pdfBase64 = toBase64(generateDiaryPdf(diary, assets, warsawStamp(new Date(t))));
  } catch {
    await deps.store.delete(sentKey);
    log('pdf_error');
    return json(500, { code: 'server_error' });
  }

  const email = buildEmail(diary, model.fileName);
  let messageId: string;
  try {
    const res = await deps.mailer.send({
      to: RECIPIENT_EMAIL,
      subject: email.subject,
      text: email.text,
      html: email.html,
      attachment: { filename: model.fileName, contentBase64: pdfBase64 },
      idempotencyKey: fp,
    });
    messageId = res.id;
  } catch (e) {
    await deps.store.delete(sentKey);
    log(`provider_error:${e instanceof Error ? e.message.slice(0, 80) : 'unknown'}`);
    return json(502, { code: 'provider_error' });
  }

  await deps.store.set(sentKey, JSON.stringify({ state: 'sent', at: t, id: messageId }));
  log('sent');
  return json(200, { status: 'sent' });
}
