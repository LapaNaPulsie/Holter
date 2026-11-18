import { describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handleSend, LIMITS, type Deps, type KV, type MailMessage, type Mailer } from './send-core';
import { mailerFromEnv, resendMailer } from './mailers';
import { sampleDiary } from '../../src/core/fixtures';
import { generateDiaryPdf, warsawStamp } from '../../src/core/pdf';
import { fsAssets } from '../../src/core/pdf.test';
import { RECIPIENT_EMAIL } from '../../src/core/labels';

class MemKV implements KV {
  data = new Map<string, string>();
  async get(k: string) {
    return this.data.get(k) ?? null;
  }
  async set(k: string, v: string, o?: { onlyIfNew?: boolean }) {
    if (o?.onlyIfNew && this.data.has(k)) return { modified: false };
    this.data.set(k, v);
    return { modified: true };
  }
  async delete(k: string) {
    this.data.delete(k);
  }
}

function fakeMailer(fail = false, delayMs = 0) {
  const sent: MailMessage[] = [];
  const mailer: Mailer = {
    async send(m) {
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      if (fail) throw new Error('smtp_550');
      sent.push(m);
      return { id: `id-${sent.length}` };
    },
  };
  return { mailer, sent };
}

function deps(over: Partial<Deps> = {}): Deps & { logs: string[] } {
  const logs: string[] = [];
  return {
    store: new MemKV(),
    mailer: fakeMailer().mailer,
    loadAssets: async () => fsAssets(),
    clientIp: '203.0.113.7',
    secret: 's',
    allowedOrigins: [],
    now: () => Date.UTC(2026, 10, 20, 9, 0),
    log: (c) => logs.push(c),
    logs,
    ...over,
  };
}

const req = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://holter.lapanapulsie.pl/.netlify/functions/send-diary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://holter.lapanapulsie.pl', ...headers },
    body: JSON.stringify(body),
  });

function pdfText(base64: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'pdf-'));
  const f = join(dir, 'a.pdf');
  writeFileSync(f, Buffer.from(base64, 'base64'));
  return execFileSync('pdftotext', ['-layout', f, '-']).toString();
}

describe('wysyłka dzienniczka', () => {
  it('wysyła na stały adres z poprawnym tematem i pełnym PDF w załączniku', async () => {
    const { mailer, sent } = fakeMailer();
    const d = deps({ mailer });
    const res = await handleSend(req({ diary: sampleDiary(), website: '', to: 'atak@example.com' }), d);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'sent' });
    expect(sent).toHaveLength(1);
    const m = sent[0];
    expect(m.to).toBe(RECIPIENT_EMAIL);
    expect(m.subject).toBe('Dzienniczek holterowski — Łatka Żółkiewska-Ćwik — 18.11.2026');
    expect(m.text).toContain('Okres badania: 18.11.2026, 09:15 – 20.11.2026, 09:40');
    expect(m.text).toContain('w załączniku PDF');
    expect(m.attachment.filename).toBe('dzienniczek-holter-latka-zolkiewska-cwik-2026-11-18.pdf');
    const text = pdfText(m.attachment.contentBase64);
    for (const s of ['Łatka', 'Żółkiewska-Ćwik', 'Zażółć gęślą jaźń', 'Pimobendan', '23:30–00:15', 'Przebudzenie', 'nie zapisano', 'Wizyta gości', 'Kilka kaszlnięć']) {
      expect(text).toContain(s);
    }
    // pełny długi opis – ostatnie zdanie opisu musi być w PDF
    expect(text.replace(/\s+/g, ' ')).toContain('gdzie wypił wodę i zasnął. (Wpis dodany: 19.11.2026, 07:30)');
    // w logach tylko kody, bez danych pacjenta
    expect(d.logs.join(' ')).not.toMatch(/Łatka|Żółkiewska|Pimobendan/);
    // w magazynie tylko skróty i liczniki
    expect(JSON.stringify([...(d.store as MemKV).data])).not.toMatch(/Łatka|Pimobendan/);
  });

  it('załącznik e-mail ma tę samą treść co PDF pobrany w aplikacji', async () => {
    const { mailer, sent } = fakeMailer();
    await handleSend(req({ diary: sampleDiary(), website: '' }), deps({ mailer }));
    const server = pdfText(sent[0].attachment.contentBase64);
    // ten sam moment wygenerowania co na serwerze (czas polski)
    const stamp = warsawStamp(new Date(Date.UTC(2026, 10, 20, 9, 0)));
    expect(stamp).toBe('20.11.2026, 10:00');
    const client = pdfText(Buffer.from(generateDiaryPdf(sampleDiary(), fsAssets(), stamp)).toString('base64'));
    expect(server).toBe(client);
  });

  it('nie wysyła drugi raz tego samego dzienniczka', async () => {
    const { mailer, sent } = fakeMailer();
    const d = deps({ mailer });
    expect((await handleSend(req({ diary: sampleDiary(), website: '' }), d)).status).toBe(200);
    const again = await handleSend(req({ diary: sampleDiary(), website: '' }), d);
    expect(await again.json()).toEqual({ status: 'already_sent' });
    expect(sent).toHaveLength(1);
  });

  it('równoczesne kliknięcia wysyłają tylko jedną wiadomość', async () => {
    const { mailer, sent } = fakeMailer(false, 30);
    const d = deps({ mailer });
    const results = await Promise.all([1, 2, 3].map(() => handleSend(req({ diary: sampleDiary(), website: '' }), d)));
    expect(sent).toHaveLength(1);
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(2);
  });

  it('po zmianie dzienniczka można wysłać nową wersję', async () => {
    const { mailer, sent } = fakeMailer();
    const d = deps({ mailer });
    await handleSend(req({ diary: sampleDiary(), website: '' }), d);
    const changed = sampleDiary();
    changed.patient.endTime = '10:00';
    expect((await handleSend(req({ diary: changed, website: '' }), d)).status).toBe(200);
    expect(sent).toHaveLength(2);
  });

  it('błąd usługi pocztowej: brak sukcesu, możliwe ponowienie', async () => {
    const store = new MemKV();
    const bad = await handleSend(req({ diary: sampleDiary(), website: '' }), deps({ store, mailer: fakeMailer(true).mailer }));
    expect(bad.status).toBe(502);
    expect(await bad.json()).toEqual({ code: 'provider_error' });
    const { mailer, sent } = fakeMailer();
    const ok = await handleSend(req({ diary: sampleDiary(), website: '' }), deps({ store, mailer }));
    expect(ok.status).toBe(200);
    expect(sent).toHaveLength(1);
  });

  it('brak konfiguracji poczty → 503 not_configured', async () => {
    const res = await handleSend(req({ diary: sampleDiary(), website: '' }), deps({ mailer: null }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ code: 'not_configured' });
  });

  it('odrzuca boty (pole-pułapka), obce źródła i niepoprawne dane', async () => {
    const { mailer, sent } = fakeMailer();
    expect((await handleSend(req({ diary: sampleDiary(), website: 'http://spam' }), deps({ mailer }))).status).toBe(400);
    expect((await handleSend(req({ diary: sampleDiary(), website: '' }, { Origin: 'https://zla-strona.example' }), deps({ mailer }))).status).toBe(403);
    const broken = sampleDiary();
    broken.patient.petName = '';
    const r = await handleSend(req({ diary: broken, website: '' }), deps({ mailer }));
    expect(r.status).toBe(400);
    expect((await r.json()).code).toBe('invalid');
    expect((await handleSend(new Request('https://holter.lapanapulsie.pl/x', { method: 'GET' }), deps({ mailer }))).status).toBe(405);
    expect(sent).toHaveLength(0);
  });

  it('limit wysyłek z jednego adresu IP', async () => {
    const { mailer, sent } = fakeMailer();
    const d = deps({ mailer });
    const statuses: number[] = [];
    for (let i = 0; i < LIMITS.perIpHour + 1; i++) {
      const diary = sampleDiary();
      diary.patient.notes = `wersja ${i}`;
      statuses.push((await handleSend(req({ diary, website: '' }), d)).status);
    }
    expect(statuses.slice(0, LIMITS.perIpHour).every((s) => s === 200)).toBe(true);
    expect(statuses[LIMITS.perIpHour]).toBe(429);
    expect(sent).toHaveLength(LIMITS.perIpHour);
  });
});

describe('usługi pocztowe', () => {
  it('Resend: klucz w nagłówku, idempotencja, załącznik; błąd HTTP = wyjątek', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'abc' }), { status: 200 }));
    const m = resendMailer('re_test', 'Dzienniczek <dzienniczek@lapanapulsie.pl>', fetchMock as unknown as typeof fetch);
    const msg: MailMessage = { to: RECIPIENT_EMAIL, subject: 'T', text: 't', html: 'h', attachment: { filename: 'a.pdf', contentBase64: 'JVBERg==' }, idempotencyKey: 'k1' };
    expect(await m.send(msg)).toEqual({ id: 'abc' });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const h = init.headers as Record<string, string>;
    expect(h.Authorization).toBe('Bearer re_test');
    expect(h['Idempotency-Key']).toBe('k1');
    const body = JSON.parse(init.body as string);
    expect(body.to).toEqual([RECIPIENT_EMAIL]);
    expect(body.attachments[0].filename).toBe('a.pdf');
    const failing = resendMailer('k', 'f', (async () => new Response('{}', { status: 422 })) as unknown as typeof fetch);
    await expect(failing.send(msg)).rejects.toThrow('resend_http_422');
  });
  it('bez zmiennych środowiskowych wysyłka jest wyłączona', async () => {
    expect(await mailerFromEnv({})).toBeNull();
    expect(await mailerFromEnv({ RESEND_API_KEY: 'x' })).toBeNull();
    expect(await mailerFromEnv({ RESEND_API_KEY: 'x', MAIL_FROM: 'a@b.pl' })).not.toBeNull();
    expect(await mailerFromEnv({ SMTP_HOST: 'h', SMTP_USER: 'u', SMTP_PASS: 'p', MAIL_FROM: 'a@b.pl' })).not.toBeNull();
  });
});
