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
export async function shareFile(file: File, title: string, text: string): Promise<ShareOutcome> {
  if (!canShareFile(file)) return 'unsupported';
  try {
    await navigator.share({ files: [file], title, text });
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
