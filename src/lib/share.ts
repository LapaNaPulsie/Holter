import { RECIPIENT_EMAIL } from '../core/labels';

export function mailtoUrl(subject: string, body: string): string {
  return `mailto:${RECIPIENT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function canShareFile(file: File): boolean {
  try {
    return typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/** Czy urządzenie potrafi udostępnić plik PDF (telefon/tablet). Sprawdzane na próbnym pliku. */
export function deviceCanShareFiles(): boolean {
  try {
    return canShareFile(new File(['%PDF-'], 'test.pdf', { type: 'application/pdf' }));
  } catch {
    return false;
  }
}

export type ShareOutcome = 'shared' | 'cancelled' | 'unsupported' | 'error';

/** „shared” oznacza tylko wybranie aplikacji – NIE jest potwierdzeniem wysłania wiadomości. */
/** Safari na iPhonie/iPadzie (nie Chrome/Firefox/Edge na iOS, które działają poprawnie). */
export function isIosSafari(): boolean {
  const ua = navigator.userAgent || '';
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return ios && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//i.test(ua);
}

export async function shareFile(file: File, title: string): Promise<ShareOutcome> {
  if (!canShareFile(file)) return 'unsupported';
  try {
    // Safari na iOS gubi załącznik w Poczcie, gdy razem z plikiem dostaje tytuł – udostępniamy wtedy sam plik.
    await navigator.share(isIosSafari() ? { files: [file] } : { files: [file], title });
    return 'shared';
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    return 'error';
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
