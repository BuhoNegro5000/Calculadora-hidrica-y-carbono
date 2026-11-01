import type { UnitCode } from './types';

type Dimension = 'energy' | 'volume' | 'mass' | 'distance' | 'passenger' | 'freight' | 'count' | 'money' | 'data' | 'time' | 'area';

/** Factores de conversión a la unidad canónica de cada dimensión. */
const TO_CANONICAL: Record<UnitCode, { dimension: Dimension; factor: number }> = {
  kWh: { dimension: 'energy', factor: 1 },
  MWh: { dimension: 'energy', factor: 1000 },
  L: { dimension: 'volume', factor: 0.001 },
  m3: { dimension: 'volume', factor: 1 },
  kg: { dimension: 'mass', factor: 1 },
  t: { dimension: 'mass', factor: 1000 },
  km: { dimension: 'distance', factor: 1 },
  pkm: { dimension: 'passenger', factor: 1 },
  tkm: { dimension: 'freight', factor: 1 },
  night: { dimension: 'count', factor: 1 },
  meal: { dimension: 'count', factor: 1 },
  unit: { dimension: 'count', factor: 1 },
  USD: { dimension: 'money', factor: 1 },
  GB: { dimension: 'data', factor: 1 },
  hour: { dimension: 'time', factor: 1 },
  year: { dimension: 'time', factor: 1 },
  m2: { dimension: 'area', factor: 1 },
};

export class UnitMismatchError extends Error {
  constructor(from: UnitCode, to: UnitCode) {
    super(`Unidades incompatibles: ${from} → ${to}`);
    this.name = 'UnitMismatchError';
  }
}

/** Convierte de forma segura entre unidades de la misma dimensión. */
export function convert(value: number, from: UnitCode, to: UnitCode): number {
  if (from === to) return value;
  const a = TO_CANONICAL[from];
  const b = TO_CANONICAL[to];
  if (!a || !b) throw new UnitMismatchError(from, to);
  if (a.dimension !== b.dimension) throw new UnitMismatchError(from, to);
  return (value * a.factor) / b.factor;
}

/** Formatea una cantidad con separadores locales y precisión adaptativa. */
export function formatNumber(value: number, lang: 'es' | 'en' = 'es', digits = 0): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const max = digits > 0 ? digits : abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return new Intl.NumberFormat(lang === 'es' ? 'es-PE' : 'en-GB', {
    maximumFractionDigits: max,
    minimumFractionDigits: 0,
  }).format(value);
}

export function clamp(value: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  return Math.min(max, Math.max(min, value));
}

/** Redondeo "bonito" para ejes de gráficos. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}
