import { jsPDF } from 'jspdf';
import autoTable, { type CellHookData, type RowInput } from 'jspdf-autotable';
import type { Diary } from './types';
import { buildReport, type TimelineItem } from './report';
import { BRAND_LINE, REPORT_FOOTER } from './labels';

/**
 * Generator PDF dzienniczka. Ten sam kod działa w przeglądarce (przycisk „Pobierz PDF”)
 * i na serwerze (załącznik e-maila), dlatego oba pliki mają identyczną treść.
 * Kolory są dobrane tak, by raport był czytelny także w wydruku czarno-białym:
 * rodzaj wpisu jest zawsze opisany tekstem, a nie tylko kolorem.
 */

export interface PdfAssets {
  /** Czcionki Montserrat TTF zakodowane w base64. */
  regular: string;
  bold: string;
  extraBold: string;
  /** Logo PNG jako data URL. */
  logo: string;
  logoRatio: number;
}

export const LOGO_RATIO = 484 / 192;

type RGB = [number, number, number];
const NAVY: RGB = [20, 46, 73];
const BURGUNDY: RGB = [107, 31, 37];
const CREAM: RGB = [239, 219, 205];
const POWDER: RGB = [229, 209, 193];
const OFFWHITE: RGB = [255, 245, 235];
const MUTED: RGB = [80, 94, 110];

/** Data i godzina wygenerowania raportu – zawsze w czasie polskim, niezależnie od strefy serwera. */
export function warsawStamp(d = new Date()): string {
  const parts = new Intl.DateTimeFormat('pl-PL', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('day')}.${get('month')}.${get('year')}, ${get('hour')}:${get('minute')}`;
}

function itemDetails(it: TimelineItem): string {
  const lines = it.details.map((d) => `${d.label}: ${d.value}`);
  if (it.added) lines.push(`(${it.added})`);
  return lines.join('\n');
}

export function generateDiaryPdf(diary: Diary, assets: PdfAssets, generatedAt: string): ArrayBuffer {
  const model = buildReport(diary);
  const p = diary.patient;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  doc.addFileToVFS('Montserrat-Regular.ttf', assets.regular);
  doc.addFont('Montserrat-Regular.ttf', 'Montserrat', 'normal');
  doc.addFileToVFS('Montserrat-Bold.ttf', assets.bold);
  doc.addFont('Montserrat-Bold.ttf', 'Montserrat', 'bold');
  doc.addFileToVFS('Montserrat-ExtraBold.ttf', assets.extraBold);
  doc.addFont('Montserrat-ExtraBold.ttf', 'MontserratXB', 'normal');
  doc.setProperties({
    title: model.subject,
    subject: 'Dzienniczek obserwacji opiekuna w czasie badania Holter EKG',
    author: 'Opiekun zwierzęcia',
    creator: BRAND_LINE,
  });

  const PAGE_W = 210;
  const PAGE_H = 297;
  const M = 15;
  const CONTENT_W = PAGE_W - 2 * M;
  const FOOTER_SPACE = 24;
  const BOTTOM = PAGE_H - FOOTER_SPACE;
  let y = 0;

  const newPage = () => {
    doc.addPage();
    y = M + 4;
  };
  const ensureSpace = (h: number) => {
    if (y + h > BOTTOM) newPage();
  };
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  const sectionTitle = (text: string) => {
    ensureSpace(18);
    doc.setFont('Montserrat', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text(text, M, y);
    doc.setDrawColor(...BURGUNDY);
    doc.setLineWidth(0.6);
    doc.line(M, y + 2, M + 14, y + 2);
    y += 8;
  };

  const muted = (text: string) => {
    doc.setFont('Montserrat', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    const lines = doc.splitTextToSize(text, CONTENT_W) as string[];
    for (const line of lines) {
      ensureSpace(5);
      doc.text(line, M, y);
      y += 4.6;
    }
    y += 2;
  };

  // ---------- Nagłówek ----------
  doc.setFillColor(...OFFWHITE);
  doc.rect(0, 0, PAGE_W, 38, 'F');
  doc.setFillColor(...CREAM);
  doc.rect(0, 38, PAGE_W, 1.2, 'F');
  const logoH = 16;
  const logoW = logoH * assets.logoRatio;
  doc.addImage(assets.logo, 'PNG', M, 11, logoW, logoH, undefined, 'FAST');
  const titleX = M + logoW + 9;
  doc.setFont('MontserratXB', 'normal');
  doc.setFontSize(17);
  doc.setTextColor(...NAVY);
  doc.text(model.title, titleX, 18);
  doc.setFont('Montserrat', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('Obserwacje opiekuna w czasie badania Holter EKG', titleX, 24);
  doc.text('Łapa na Pulsie · kardiologia', titleX, 28.5);
  y = 49;

  // ---------- Dane pacjenta i badania ----------
  sectionTitle('Dane pacjenta i badania');
  const labelW = 46;
  for (const row of model.patientRows) {
    const isName = row.label === 'Imię pacjenta';
    doc.setFont('Montserrat', isName ? 'bold' : 'normal');
    doc.setFontSize(10.5);
    const lines = doc.splitTextToSize(row.value, CONTENT_W - labelW) as string[];
    lines.forEach((line, i) => {
      ensureSpace(5.5);
      if (i === 0) {
        doc.setFont('Montserrat', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...MUTED);
        doc.text(row.label, M, y);
      }
      doc.setFont('Montserrat', isName ? 'bold' : 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(...NAVY);
      doc.text(line, M + labelW, y);
      y += 5.2;
    });
    y += 1;
  }
  y += 2;
  const c = model.counts;
  muted(`Liczba wpisów: aktywności ${c.activity} · okresy snu ${c.sleep} · objawy / zdarzenia ${c.symptom} · podania leków ${c.medication}`);
  y += 2;

  const tableBase = {
    margin: { left: M, right: M, bottom: FOOTER_SPACE, top: M + 4 },
    showHead: 'everyPage' as const,
    rowPageBreak: 'auto' as const,
    styles: {
      font: 'Montserrat',
      fontSize: 9,
      textColor: NAVY,
      cellPadding: 2,
      lineColor: POWDER,
      lineWidth: 0.2,
      overflow: 'linebreak' as const,
      valign: 'top' as const,
    },
    headStyles: { font: 'Montserrat', fontStyle: 'bold' as const, fillColor: NAVY, textColor: [255, 255, 255] as RGB, fontSize: 8.5 },
  };

  // ---------- Okresy snu ----------
  sectionTitle('Okresy snu');
  if (model.sleeps.length === 0) {
    muted('Opiekun nie zapisał okresów snu.');
  } else {
    autoTable(doc, {
      ...tableBase,
      startY: y - 3,
      head: [['Lp.', 'Zaśnięcie', 'Przebudzenie', 'Czas snu', 'Uwagi o śnie']],
      body: model.sleeps.map((s, i) => [String(i + 1), s.start, s.end, s.duration, s.notes]),
      alternateRowStyles: { fillColor: OFFWHITE },
      columnStyles: {
        0: { cellWidth: 9, halign: 'right' },
        1: { cellWidth: 31, fontStyle: 'bold' },
        2: { cellWidth: 31, fontStyle: 'bold' },
        3: { cellWidth: 22 },
        4: { cellWidth: 'auto' },
      },
    });
    y = lastY() + 10;
  }

  // ---------- Przebieg badania ----------
  sectionTitle('Przebieg badania – wszystkie wpisy chronologicznie');
  if (model.days.length === 0) {
    muted('Brak wpisów.');
  } else {
    const body: RowInput[] = [];
    const kinds: (TimelineItem['kind'] | 'day')[] = [];
    for (const day of model.days) {
      body.push([{ content: day.label.charAt(0).toUpperCase() + day.label.slice(1), colSpan: 4 }]);
      kinds.push('day');
      for (const it of day.items) {
        body.push([it.timeLabel, it.kindLabel.toUpperCase(), it.title, itemDetails(it)]);
        kinds.push(it.kind);
      }
    }
    autoTable(doc, {
      ...tableBase,
      startY: y - 3,
      head: [['Godzina', 'Rodzaj', 'Zdarzenie', 'Szczegóły i uwagi opiekuna']],
      body,
      columnStyles: {
        0: { cellWidth: 25, fontStyle: 'bold' },
        1: { cellWidth: 25, fontSize: 7.5, fontStyle: 'bold' },
        2: { cellWidth: 40, fontStyle: 'bold' },
        3: { cellWidth: 'auto' },
      },
      didParseCell: (data: CellHookData) => {
        if (data.section !== 'body') return;
        const kind = kinds[data.row.index];
        if (kind === 'day') {
          data.cell.styles.fillColor = CREAM;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 10;
          data.cell.styles.cellPadding = { top: 2.6, bottom: 2.6, left: 2, right: 2 };
        } else if (kind === 'symptom') {
          data.cell.styles.fillColor = [250, 236, 236];
          if (data.column.index <= 2) data.cell.styles.textColor = BURGUNDY;
        }
      },
      didDrawCell: (data: CellHookData) => {
        // Gruba lewa krawędź przy objawach – widoczna także w wydruku czarno-białym.
        if (data.section === 'body' && kinds[data.row.index] === 'symptom' && data.column.index === 0) {
          doc.setFillColor(...BURGUNDY);
          doc.rect(data.cell.x, data.cell.y, 1.2, data.cell.height, 'F');
        }
      },
    });
    y = lastY() + 8;
  }

  // ---------- Stopka na każdej stronie ----------
  const pages = doc.getNumberOfPages();
  const who = `${p.petName.trim()} (${p.ownerName.trim()})`;
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const fy = PAGE_H - FOOTER_SPACE + 7;
    doc.setDrawColor(...CREAM);
    doc.setLineWidth(0.5);
    doc.line(M, fy - 4, PAGE_W - M, fy - 4);
    doc.setFont('Montserrat', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    const footerLines = doc.splitTextToSize(REPORT_FOOTER, CONTENT_W - 30) as string[];
    doc.text(footerLines, M, fy);
    doc.text(`Strona ${i} z ${pages}`, PAGE_W - M, fy, { align: 'right' });
    const meta = doc.splitTextToSize(`Pacjent: ${who} · Wygenerowano: ${generatedAt}`, CONTENT_W - 30) as string[];
    doc.text(meta, M, fy + footerLines.length * 3.4 + 1.2);
  }

  return doc.output('arraybuffer');
}
