import type { Diary } from '../core/types';
import type { PdfAssets } from '../core/pdf';

/** Czcionki i logo do PDF – wczytywane z tej samej strony (działa też offline dzięki pamięci aplikacji). */
let assetsPromise: Promise<PdfAssets> | null = null;

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

async function fetchBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Nie można wczytać pliku ${url}`);
  return arrayBufferToBase64(await res.arrayBuffer());
}

async function loadAssets(): Promise<PdfAssets> {
  if (!assetsPromise) {
    assetsPromise = (async () => {
      const { LOGO_RATIO } = await import('../core/pdf');
      const [regular, bold, extraBold, logo] = await Promise.all([
        fetchBase64('/fonts/Montserrat-Regular.ttf'),
        fetchBase64('/fonts/Montserrat-Bold.ttf'),
        fetchBase64('/fonts/Montserrat-ExtraBold.ttf'),
        fetchBase64('/assets/01_brand/logo_lapa_poziome_granat_transparent.png'),
      ]);
      return { regular, bold, extraBold, logo: `data:image/png;base64,${logo}`, logoRatio: LOGO_RATIO };
    })().catch((e) => {
      assetsPromise = null;
      throw e;
    });
  }
  return assetsPromise;
}

export async function makePdfFile(diary: Diary): Promise<File> {
  const [{ generateDiaryPdf, warsawStamp }, { reportFileName }, assets] = await Promise.all([
    import('../core/pdf'),
    import('../core/report'),
    loadAssets(),
  ]);
  const buf = generateDiaryPdf(diary, assets, warsawStamp());
  return new File([buf], reportFileName(diary), { type: 'application/pdf' });
}

export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
