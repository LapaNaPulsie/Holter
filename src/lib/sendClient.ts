import type { Diary } from '../core/types';

export const SEND_ENDPOINT = '/.netlify/functions/send-diary';

export type SendResult =
  | { ok: true; duplicate: boolean }
  | { ok: false; code: string; message: string; retryable: boolean };

const MESSAGES: Record<string, string> = {
  network: 'Brak połączenia z internetem albo serwer nie odpowiedział. Sprawdź połączenie i spróbuj ponownie – Twoje dane są zapisane.',
  timeout:
    'Nie otrzymaliśmy potwierdzenia wysyłki w wyznaczonym czasie. Spróbuj ponownie – jeśli wiadomość jednak dotarła, ponowna próba nie wyśle jej drugi raz.',
  not_configured: 'Wysyłka z aplikacji nie jest jeszcze uruchomiona. Pobierz PDF i przekaż go lekarzowi w inny sposób.',
  rate_limited: 'Wysłano zbyt wiele wiadomości w krótkim czasie. Odczekaj chwilę i spróbuj ponownie albo pobierz PDF.',
  in_progress: 'Ten dzienniczek jest właśnie wysyłany. Odczekaj chwilę i sprawdź ponownie.',
  invalid: 'Dzienniczek zawiera niepełne lub niepoprawne dane. Popraw je i spróbuj ponownie.',
  provider_error: 'Usługa pocztowa nie przyjęła wiadomości. Dzienniczek NIE został wysłany. Spróbuj ponownie później albo pobierz PDF.',
  server_error: 'Wystąpił błąd serwera. Dzienniczek NIE został wysłany. Spróbuj ponownie później albo pobierz PDF.',
};

export function sendErrorMessage(code: string, serverMessage?: string): string {
  if (code === 'invalid' && serverMessage) return `${serverMessage} Popraw dane i spróbuj ponownie.`;
  return MESSAGES[code] ?? MESSAGES.server_error;
}

/**
 * Wysyła dzienniczek do funkcji serwerowej. Sukces zwracany jest wyłącznie wtedy,
 * gdy serwer potwierdzi, że usługa pocztowa przyjęła wiadomość.
 */
export async function sendDiary(diary: Diary, honeypot: string, timeoutMs = 45_000): Promise<SendResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(SEND_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diary, website: honeypot }),
      signal: ctrl.signal,
    });
  } catch (e) {
    const code = e instanceof DOMException && e.name === 'AbortError' ? 'timeout' : 'network';
    return { ok: false, code, message: sendErrorMessage(code), retryable: true };
  } finally {
    clearTimeout(timer);
  }
  let body: { status?: string; code?: string; message?: string } = {};
  try {
    body = await res.json();
  } catch {
    /* odpowiedź bez JSON */
  }
  if (res.ok && (body.status === 'sent' || body.status === 'already_sent')) {
    return { ok: true, duplicate: body.status === 'already_sent' };
  }
  const code = body.code ?? (res.status === 404 ? 'not_configured' : 'server_error');
  return { ok: false, code, message: sendErrorMessage(code, body.message), retryable: code !== 'invalid' };
}
