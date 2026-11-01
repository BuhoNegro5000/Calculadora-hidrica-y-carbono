/**
 * Módulo de factores · Green Owl Labs
 * -----------------------------------
 * Esquema único para factores de carbono y agua. La capa BASE se deriva de
 * /src/data y es de solo lectura; la capa PERSONALIZADA vive en IndexedDB y
 * puede sobrescribir un factor base (override) o crear uno nuevo.
 *
 * Regla de resolución: personalizado > base. Nunca se muta un factor base.
 */

import type {
  Bilingual, CountryCode, GWPSet, Scope, SourceRef, Status, UnitCode,
} from './types';
import { convert } from './units';
import { GWP100 } from './gwp';

export type FactorKind = 'carbon' | 'water';
export type FactorLayer = 'base' | 'custom';
export type FactorQuality = 'official' | 'literature' | 'primary' | 'estimated';
export type FactorMethod = 'physical' | 'spend' | 'proxy';
export type WaterType = 'blue' | 'green' | 'grey' | 'mixed';
export type FactorApproval = 'approved' | 'proposed' | 'draft';
export type FactorRole = 'reader' | 'editor' | 'admin';
export type FactorAction =
  | 'create' | 'update' | 'delete' | 'restore' | 'approve' | 'revert'
  | 'import' | 'export' | 'role' | 'restore-base';

export interface GasAmount {
  gas: string;
  /** kg de gas por unidad de actividad. */
  amount: number;
  /** GWP aplicado; si falta se toma del set declarado. */
  gwp?: number;
}

export interface FactorHistoryEntry {
  version: number;
  at: string;
  user: string;
  reason: string;
  value: number;
  unit: UnitCode;
  uncertainty: number;
  dataYear: number;
  country: CountryCode | 'GLOBAL';
  region?: string;
  sourceOrg: string;
  sourceTitle: string;
  sourceUrl: string;
  license: string;
  quality: FactorQuality;
  notes?: Bilingual;
  water?: { blue: number; green: number; grey: number };
  byGwp?: Partial<Record<GWPSet, number>>;
}

export interface FactorRecord {
  id: string;
  /** Presente solo cuando el registro personalizado sobrescribe un factor base. */
  baseId?: string;
  kind: FactorKind;
  label: Bilingual;
  description: Bilingual;
  category: string;
  scope: Scope;
  scope3Category?: number;
  unit: UnitCode;
  /** Carbono: kg CO₂e/unidad. Agua: m³ totales/unidad. */
  value: number;
  gases: GasAmount[];
  /** 'breakdown' = suma por gas; 'aggregate' = CO₂e agregado sin desglose. */
  gasDetail: 'breakdown' | 'aggregate';
  gwpSet: GWPSet;
  byGwp?: Partial<Record<GWPSet, number>>;
  valueRf?: number;
  water?: { blue: number; green: number; grey: number };
  waterType?: WaterType;
  waterFactorId?: string;
  direct?: boolean;
  country: CountryCode | 'GLOBAL';
  region?: string;
  dataYear: number;
  publicationYear: number;
  sourceId: string;
  sourceOrg: string;
  sourceTitle: string;
  sourceUrl: string;
  license: string;
  downloadedAt: string;
  uncertainty: number;
  method: FactorMethod;
  quality: FactorQuality;
  status: Status;
  layer: FactorLayer;
  version: number;
  notes?: Bilingual;
  changeReason?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  approval: FactorApproval;
  approvedBy?: string;
  deletedAt?: string;
  /** Valor del factor base en el momento de crear el override. */
  baseValue?: number;
  baseVersion?: string;
  history?: FactorHistoryEntry[];
  /** Solo para importaciones: avisos de fila. */
  importWarnings?: string[];
}

export interface FactorAuditEntry {
  id: string;
  at: string;
  action: FactorAction;
  factorId: string;
  factorLabel: string;
  version?: number;
  before?: Partial<FactorRecord>;
  after?: Partial<FactorRecord>;
  reason: string;
  user: string;
  role: FactorRole;
}

export interface FactorSnapshot {
  id: string;
  kind: FactorKind;
  version: number;
  layer: FactorLayer;
  value: number;
  unit: UnitCode;
  sourceId: string;
  dataYear: number;
  changeReason?: string;
}

export interface FactorDiff {
  baseValue: number;
  nextValue: number;
  /** Diferencia relativa; se normaliza la unidad del factor base. */
  pct: number;
  unit: UnitCode;
  convertedBase: number;
}

export const BASE_DATA_VERSION = '2026.10';
export const DEFAULT_CHANGE_THRESHOLD = 30;
export const NEGATIVE_ALLOWED_CATEGORIES = ['credits', 'capture', 'removals', 'sumideros'];

export const GAS_OPTIONS = [
  'CO2', 'CH4', 'N2O', 'HFC-32', 'HFC-134a', 'HFC-410A', 'HCFC-22', 'SF6', 'NF3', 'other',
] as const;

export const UNIT_OPTIONS: UnitCode[] = [
  'kWh', 'MWh', 'L', 'm3', 'kg', 't', 'km', 'pkm', 'tkm',
  'night', 'meal', 'unit', 'USD', 'GB', 'hour', 'year', 'm2',
];

export const COUNTRY_OPTIONS: (CountryCode | 'GLOBAL')[] = [
  'GLOBAL', 'PE', 'US', 'GB', 'ES', 'MX', 'CO', 'CL', 'AR', 'BR', 'DE', 'FR', 'EU',
];

export const CATEGORY_OPTIONS = [
  'energy', 'transport', 'food', 'goods', 'water', 'waste', 'events',
  'digital', 'logistics', 'refrigerants', 'credits', 'capture', 'other',
];

export function nowIso(): string {
  return new Date().toISOString();
}

export function today(): string {
  return nowIso().slice(0, 10);
}

export function emptyBilingual(): Bilingual {
  return { es: '', en: '' };
}

export function gasLabel(gas: string): string {
  return gas === 'other' ? 'Otro' : gas;
}

export function gwpForFactorSet(gas: string, set: GWPSet): number | undefined {
  return GWP100[set][gas];
}

/** Suma CO₂e a partir de kg de cada gas y el GWP declarado o del set. */
export function co2eFromGases(gases: GasAmount[], set: GWPSet): number {
  return gases.reduce((sum, item) => {
    const gwp = item.gwp ?? gwpForFactorSet(item.gas, set) ?? 0;
    return sum + (Number.isFinite(item.amount) ? item.amount * gwp : 0);
  }, 0);
}

export function normalizeUnitValue(value: number, from: UnitCode, to: UnitCode): number {
  return from === to ? value : convert(value, from, to);
}

export function factorDiff(base: FactorRecord, nextValue: number, nextUnit: UnitCode): FactorDiff {
  const convertedBase = base.unit === nextUnit
    ? base.value
    : (() => {
      try { return convert(base.value, base.unit, nextUnit); } catch { return base.value; }
    })();
  const pct = convertedBase === 0 ? 0 : ((nextValue - convertedBase) / convertedBase) * 100;
  return { baseValue: base.value, nextValue, pct, unit: nextUnit, convertedBase };
}

export function isNegativeAllowed(category: string): boolean {
  return NEGATIVE_ALLOWED_CATEGORIES.includes(category);
}

export function qualityForStatus(status: Status): FactorQuality {
  return status === 'verified' ? 'official' : status === 'pending' ? 'literature' : 'estimated';
}

export function statusForQuality(quality: FactorQuality): Status {
  return quality === 'official' ? 'verified' : quality === 'estimated' ? 'screening' : 'pending';
}

export function qualityLabel(quality: FactorQuality, lang: 'es' | 'en'): string {
  const labels: Record<FactorQuality, Bilingual> = {
    official: { es: 'Oficial', en: 'Official' },
    literature: { es: 'Literatura', en: 'Literature' },
    primary: { es: 'Dato primario', en: 'Primary data' },
    estimated: { es: 'Estimado', en: 'Estimated' },
  };
  return labels[quality][lang];
}

export function methodLabel(method: FactorMethod, lang: 'es' | 'en'): string {
  const labels: Record<FactorMethod, Bilingual> = {
    physical: { es: 'Físico', en: 'Physical' },
    spend: { es: 'Gasto', en: 'Spend-based' },
    proxy: { es: 'Proxy', en: 'Proxy' },
  };
  return labels[method][lang];
}

export function waterTypeLabel(type: WaterType | undefined, lang: 'es' | 'en'): string {
  if (!type) return lang === 'es' ? 'No aplica' : 'Not applicable';
  const labels: Record<WaterType, Bilingual> = {
    blue: { es: 'Azul', en: 'Blue' },
    green: { es: 'Verde', en: 'Green' },
    grey: { es: 'Gris', en: 'Grey' },
    mixed: { es: 'Mixta', en: 'Mixed' },
  };
  return labels[type][lang];
}

export function layerLabel(layer: FactorLayer, lang: 'es' | 'en'): string {
  return layer === 'base'
    ? (lang === 'es' ? 'Base' : 'Base')
    : (lang === 'es' ? 'Personalizado' : 'Custom');
}

export function approvalLabel(approval: FactorApproval, lang: 'es' | 'en'): string {
  const labels: Record<FactorApproval, Bilingual> = {
    approved: { es: 'Aprobado', en: 'Approved' },
    proposed: { es: 'Propuesto', en: 'Proposed' },
    draft: { es: 'Borrador', en: 'Draft' },
  };
  return labels[approval][lang];
}

export function roleLabel(role: FactorRole, lang: 'es' | 'en'): string {
  const labels: Record<FactorRole, Bilingual> = {
    reader: { es: 'Lector', en: 'Reader' },
    editor: { es: 'Editor', en: 'Editor' },
    admin: { es: 'Administrador', en: 'Administrator' },
  };
  return labels[role][lang];
}

export function recordSource(record: FactorRecord): SourceRef {
  return {
    org: record.sourceOrg,
    title: record.sourceTitle,
    year: record.publicationYear,
    url: record.sourceUrl,
  };
}

export function recordTotalWater(record: FactorRecord): number {
  return record.water ? record.water.blue + record.water.green + record.water.grey : 0;
}

export function factorRecordToSnapshot(record: FactorRecord): FactorSnapshot {
  return {
    id: record.id,
    kind: record.kind,
    version: record.version,
    layer: record.layer,
    value: record.value,
    unit: record.unit,
    sourceId: record.sourceId,
    dataYear: record.dataYear,
    changeReason: record.changeReason,
  };
}

export function historyFromRecord(record: FactorRecord, reason: string, user: string): FactorHistoryEntry {
  return {
    version: record.version,
    at: record.updatedAt,
    user,
    reason,
    value: record.value,
    unit: record.unit,
    uncertainty: record.uncertainty,
    dataYear: record.dataYear,
    country: record.country,
    region: record.region,
    sourceOrg: record.sourceOrg,
    sourceTitle: record.sourceTitle,
    sourceUrl: record.sourceUrl,
    license: record.license,
    quality: record.quality,
    notes: record.notes,
    water: record.water ? { ...record.water } : undefined,
    byGwp: record.byGwp ? { ...record.byGwp } : undefined,
  };
}

/** Crea la siguiente versión de un registro personalizado sin tocar el anterior. */
export function nextFactorVersion(
  existing: FactorRecord,
  patch: Partial<FactorRecord>,
  meta: { reason: string; user: string; at?: string },
): FactorRecord {
  const at = meta.at ?? nowIso();
  return {
    ...existing,
    ...patch,
    id: existing.id,
    baseId: existing.baseId,
    layer: 'custom',
    version: existing.version + 1,
    updatedAt: at,
    changeReason: meta.reason,
    history: [...(existing.history ?? []), historyFromRecord(existing, meta.reason, meta.user)],
  };
}

/** Revierte a una versión anterior creando una versión nueva (nunca borra historia). */
export function revertFactorVersion(
  record: FactorRecord,
  targetVersion: number,
  meta: { reason: string; user: string; at?: string },
): FactorRecord {
  const target = (record.history ?? []).find((entry) => entry.version === targetVersion);
  if (!target) throw new Error(`La versión v${targetVersion} no existe en el historial de ${record.id}`);
  const patch: Partial<FactorRecord> = {
    value: target.value,
    unit: target.unit,
    uncertainty: target.uncertainty,
    dataYear: target.dataYear,
    country: target.country,
    region: target.region,
    sourceOrg: target.sourceOrg,
    sourceTitle: target.sourceTitle,
    sourceUrl: target.sourceUrl,
    license: target.license,
    quality: target.quality,
    notes: target.notes,
    water: target.water ? { ...target.water } : undefined,
    byGwp: target.byGwp ? { ...target.byGwp } : undefined,
    gasDetail: target.water ? 'aggregate' : record.gasDetail,
  };
  return nextFactorVersion(record, patch, meta);
}

export function emptyFactorRecord(overrides: Partial<FactorRecord> = {}): FactorRecord {
  const at = nowIso();
  const base: FactorRecord = {
    id: '',
    kind: 'carbon',
    label: { es: '', en: '' },
    description: { es: '', en: '' },
    category: 'energy',
    scope: 3,
    unit: 'kWh',
    value: 0,
    gases: [{ gas: 'CO2', amount: 0, gwp: 1 }],
    gasDetail: 'breakdown',
    gwpSet: 'AR6',
    country: 'PE',
    dataYear: new Date().getFullYear(),
    publicationYear: new Date().getFullYear(),
    sourceId: 'custom',
    sourceOrg: '',
    sourceTitle: '',
    sourceUrl: '',
    license: '',
    downloadedAt: today(),
    uncertainty: 0.2,
    method: 'physical',
    quality: 'literature',
    status: 'pending',
    layer: 'custom',
    version: 1,
    changeReason: '',
    createdAt: at,
    updatedAt: at,
    createdBy: 'Local',
    approval: 'draft',
    history: [],
  };
  return { ...base, ...overrides };
}

export function cloneFactor(record: FactorRecord, id: string): FactorRecord {
  const at = nowIso();
  return {
    ...record,
    id,
    baseId: undefined,
    layer: 'custom',
    version: 1,
    createdAt: at,
    updatedAt: at,
    approvedBy: undefined,
    approval: 'draft',
    deletedAt: undefined,
    history: [],
    baseValue: undefined,
    baseVersion: undefined,
    changeReason: '',
    label: {
      es: `${record.label.es} (copia)`,
      en: `${record.label.en} (copy)`,
    },
    sourceId: 'custom',
  };
}

export function customFactorId(kind: FactorKind): string {
  return `${kind === 'carbon' ? 'cf' : 'wf'}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}
