import type { FactorRecord } from '../engine/factorTypes';
import { FACTOR_CSV_HEADERS, factorsToCsv, factorsToJson, factorTemplateCsv } from '../engine/factorOps';
import { download, timestamp } from './download';

export function downloadFactorTemplate(lang: 'es' | 'en'): void {
  download(`gol-plantilla-factores-${lang}.csv`, factorTemplateCsv(lang), 'text/csv');
}

export function downloadFactorsCsv(records: FactorRecord[]): void {
  download(`gol-factores-personalizados-${timestamp()}.csv`, factorsToCsv(records), 'text/csv');
}

export function downloadFactorsJson(records: FactorRecord[], extra: Record<string, unknown> = {}): void {
  download(`gol-factores-personalizados-${timestamp()}.json`, factorsToJson(records, extra), 'application/json');
}

export function downloadFactorsExcel(records: FactorRecord[]): void {
  const header = FACTOR_CSV_HEADERS.map((name) => `<th>${escapeHtml(name)}</th>`).join('');
  const rows = factorsToCsv(records)
    .replace(/^\uFEFFsep=;\r\n/, '')
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const cells = line.split(';').map((cell) => `<td>${escapeHtml(cell.replace(/^"|"$/g, ''))}</td>`).join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Green Owl Labs · Factores</title></head><body>
    <table border="1"><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>
  </body></html>`;
  download(`gol-factores-${timestamp()}.xls`, html, 'application/vnd.ms-excel');
}

export async function readFactorFile(file: File): Promise<{ format: 'json' | 'csv' | 'xls'; text: string }> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx')) {
    throw new Error('El formato .xlsx binario no está soportado sin backend. Exporta el libro como CSV o .xls (HTML) e inténtalo de nuevo.');
  }
  if (name.endsWith('.xls') || name.endsWith('.html') || name.endsWith('.htm')) {
    const raw = await file.text();
    return { format: 'xls', text: htmlTableToCsv(raw) };
  }
  if (name.endsWith('.json')) return { format: 'json', text: await file.text() };
  return { format: 'csv', text: await file.text() };
}

export function htmlTableToCsv(html: string): string {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const table = document.querySelector('table');
  if (!table) return html;
  const rows = [...table.querySelectorAll('tr')].map((row) => (
    [...row.querySelectorAll('th,td')]
      .map((cell) => `"${(cell.textContent ?? '').replace(/"/g, '""').trim()}"`)
      .join(';')
  ));
  return `\uFEFFsep=;\r\n${rows.join('\r\n')}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
