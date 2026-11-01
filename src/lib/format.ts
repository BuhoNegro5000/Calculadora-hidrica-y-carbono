import type { Lang, Status } from '../engine/types';

const locale = (lang: Lang) => (lang === 'es' ? 'es-PE' : 'en-GB');

export function nf(value: number, lang: Lang, digits = 0): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(locale(lang), {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
}

export function smart(value: number, lang: Lang): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 0 : abs >= 100 ? 1 : abs >= 10 ? 2 : 3;
  return nf(value, lang, digits);
}

export function tonnes(kg: number, lang: Lang): string {
  return smart(kg / 1000, lang);
}

export function m3(value: number, lang: Lang): string {
  return smart(value, lang);
}

export function pct(value: number, lang: Lang, digits = 0): string {
  return `${nf(value * 100, lang, digits)} %`;
}

export function signedPct(value: number, lang: Lang): string {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${nf(value * 100, lang, 0)} %`;
}

export function dateLabel(iso: string, lang: Lang): string {
  if (!iso) return '—';
  const date = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale(lang), { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function monthLabel(iso: string, lang: Lang): string {
  if (!iso) return '—';
  const date = new Date(`${iso.slice(0, 7)}-01T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale(lang), { month: 'short', year: 'numeric' }).format(date);
}

export function statusLabel(status: Status, lang: Lang): string {
  return lang === 'es'
    ? status === 'verified' ? 'Verificado' : status === 'pending' ? 'Pendiente' : 'Screening'
    : status === 'verified' ? 'Verified' : status === 'pending' ? 'Pending' : 'Screening';
}

export function statusClass(status: Status): string {
  return status === 'verified' ? 'badge-ok' : status === 'pending' ? 'badge-warn' : 'badge-info';
}

export function flag(code: string): string {
  const map: Record<string, string> = {
    PE: '🇵🇪', US: '🇺🇸', GB: '🇬🇧', ES: '🇪🇸', MX: '🇲🇽', CO: '🇨🇴', CL: '🇨🇱',
    AR: '🇦🇷', BR: '🇧🇷', DE: '🇩🇪', FR: '🇫🇷', EU: '🇪🇺', GLOBAL: '🌍',
  };
  return map[code] ?? '🌍';
}
