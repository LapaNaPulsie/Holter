import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { generateDiaryPdf, LOGO_RATIO, type PdfAssets } from './pdf';
import { sampleDiary } from './fixtures';

export function fsAssets(): PdfAssets {
  const b64 = (p: string) => readFileSync(p).toString('base64');
  return {
    regular: b64('public/fonts/Montserrat-Regular.ttf'),
    bold: b64('public/fonts/Montserrat-Bold.ttf'),
    extraBold: b64('public/fonts/Montserrat-ExtraBold.ttf'),
    logo: `data:image/png;base64,${b64('public/assets/01_brand/logo_lapa_poziome_granat_transparent.png')}`,
    logoRatio: LOGO_RATIO,
  };
}

describe('PDF', () => {
  it('generuje PDF z przykładowego dzienniczka', () => {
    const buf = generateDiaryPdf(sampleDiary(), fsAssets(), '18.11.2026, 17:00');
    const bytes = new Uint8Array(buf);
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-');
    if (process.env.PDF_OUT) writeFileSync(process.env.PDF_OUT, bytes);
    const f = `/tmp/pdf-test-${process.pid}.pdf`;
    writeFileSync(f, bytes);
    const text = execFileSync('pdftotext', ['-layout', f, '-']).toString();
    for (const s of ['Leki podawane na stałe', 'Furosemid', '½ tabletki 40 mg', 'Zażółć gęślą jaźń']) expect(text).toContain(s);
  });
});
