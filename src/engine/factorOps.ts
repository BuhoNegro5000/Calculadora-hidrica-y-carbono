/**
 * Operaciones puras del gestor de factores: validación, versionado, diff,
 * importación/exportación CSV y JSON. Sin IndexedDB ni React, para poder
 * probarlas con Vitest y reutilizarlas desde la UI y el motor.
 */

import type { CountryCode, GWPSet, Scope, Status, UnitCode } from './types';
import {
  BASE_DATA_VERSION, CATEGORY_OPTIONS, COUNTRY_OPTIONS, UNIT_OPTIONS,
  co2eFromGases, customFactorId, factorDiff, isNegativeAllowed,
  nextFactorVersion, normalizeUnitValue, nowIso, recordTotalWater, today,
  type FactorDiff, type FactorHistoryEntry, type FactorQuality,
  type FactorRecord, type FactorRole, type GasAmount,
} from './factorTypes';
import { unitsCompatible } from './catalog';

export interface FactorIssue {
  field: string;
  code: string;
  severity: 'error' | 'warning';
  message: { es: string; en: string };
}

export interface FactorValidationContext {
  base?: FactorRecord;
  existing?: FactorRecord;
  all?: FactorRecord[];
  threshold?: number;
  confirmLargeChange?: boolean;
  allowDuplicate?: boolean;
}

const PLAUSIBLE_MAX: Record<string, { carbon: number; water: number }> = {
  energy: { carbon: 100, water: 1000 },
  transport: { carbon: 100, water: 1000 },
  food: { carbon: 500, water: 100000 },
  goods: { carbon: 5000, water: 100000 },
  water: { carbon: 100, water: 100000 },
  waste: { carbon: 1000, water: 10000 },
  events: { carbon: 1000, water: 10000 },
  digital: { carbon: 100, water: 1000 },
  logistics: { carbon: 100, water: 1000 },
  refrigerants: { carbon: 100000, water: 1000 },
  credits: { carbon: 100000, water: 1000 },
  capture: { carbon: 100000, water: 1000 },
  other: { carbon: 10000, water: 100000 },
};

function issue(
  field: string,
  code: string,
  severity: 'error' | 'warning',
  es: string,
  en: string,
): FactorIssue {
  return { field, code, severity, message: { es, en } };
}

export function validateFactor(
  record: FactorRecord,
  context: FactorValidationContext = {},
): FactorIssue[] {
  const issues: FactorIssue[] = [];
  const { base, existing, all = [], threshold = 30, confirmLargeChange = false } = context;

  if (!record.label.es.trim() && !record.label.en.trim()) {
    issues.push(issue('label', 'required', 'error', 'La etiqueta es obligatoria.', 'A label is required.'));
  } else if (!record.label.es.trim() || !record.label.en.trim()) {
    issues.push(issue('label', 'bilingual', 'warning', 'Falta la etiqueta en uno de los idiomas; se usará la disponible.', 'One language is missing; the available label will be used.'));
  }
  if (!record.description.es.trim() && !record.description.en.trim()) {
    issues.push(issue('description', 'required', 'error', 'La descripción es obligatoria.', 'A description is required.'));
  }
  if (!record.category.trim()) {
    issues.push(issue('category', 'required', 'error', 'Selecciona una categoría.', 'Select a category.'));
  } else if (!CATEGORY_OPTIONS.includes(record.category)) {
    issues.push(issue('category', 'enum', 'error', `La categoría «${record.category}» no está soportada.`, `The category "${record.category}" is not supported.`));
  }
  if (![1, 2, 3].includes(record.scope)) {
    issues.push(issue('scope', 'required', 'error', 'El alcance debe ser 1, 2 o 3.', 'Scope must be 1, 2 or 3.'));
  }
  if (!UNIT_OPTIONS.includes(record.unit)) {
    issues.push(issue('unit', 'enum', 'error', `La unidad «${record.unit}» no está soportada.`, `The unit "${record.unit}" is not supported.`));
  }
  if (!COUNTRY_OPTIONS.includes(record.country)) {
    issues.push(issue('country', 'enum', 'error', `El país o región «${record.country}» no está soportado.`, `The country or region "${record.country}" is not supported.`));
  }
  if (!(['official', 'literature', 'primary', 'estimated'] as FactorQuality[]).includes(record.quality)) {
    issues.push(issue('quality', 'enum', 'error', 'La etiqueta de calidad no es válida.', 'The quality label is not valid.'));
  }
  if (!(['physical', 'spend', 'proxy'] as FactorRecord['method'][]).includes(record.method)) {
    issues.push(issue('method', 'enum', 'error', 'El método debe ser físico, de gasto o proxy.', 'The method must be physical, spend or proxy.'));
  }
  if (!Number.isFinite(record.value)) {
    issues.push(issue('value', 'number', 'error', 'El valor debe ser numérico.', 'Value must be numeric.'));
  }
  if (record.value < 0 && !isNegativeAllowed(record.category)) {
    issues.push(issue('value', 'negative', 'error', 'No se permiten valores negativos en esta categoría.', 'Negative values are not allowed in this category.'));
  }
  if (record.value === 0) {
    issues.push(issue('value', 'zero', 'warning', 'Un factor con valor 0 no aporta al cálculo.', 'A zero factor contributes nothing to the calculation.'));
  }
  if (record.uncertainty < 0 || record.uncertainty > 1) {
    issues.push(issue('uncertainty', 'range', 'error', 'La incertidumbre debe estar entre 0 % y 100 %.', 'Uncertainty must be between 0% and 100%.'));
  }
  if (!Number.isInteger(record.dataYear) || record.dataYear < 1990 || record.dataYear > new Date().getFullYear() + 1) {
    issues.push(issue('dataYear', 'range', 'error', 'El año del dato no es plausible.', 'The data year is not plausible.'));
  }
  if (!Number.isInteger(record.publicationYear) || record.publicationYear < 1990 || record.publicationYear > new Date().getFullYear() + 1) {
    issues.push(issue('publicationYear', 'range', 'error', 'El año de publicación no es plausible.', 'The publication year is not plausible.'));
  }
  if (!record.sourceOrg.trim()) {
    issues.push(issue('sourceOrg', 'required', 'error', 'La organización de la fuente es obligatoria.', 'The source organisation is required.'));
  }
  if (!record.sourceTitle.trim()) {
    issues.push(issue('sourceTitle', 'required', 'error', 'La cita o título de la fuente es obligatorio.', 'The source citation or title is required.'));
  }
  if (!record.sourceUrl.trim() && record.quality !== 'primary') {
    issues.push(issue('sourceUrl', 'required', 'error', 'Añade una URL o marca el factor como dato primario propio.', 'Add a URL or mark the factor as own primary data.'));
  }
  if (record.sourceUrl.trim() && !/^https?:\/\/\S+$/i.test(record.sourceUrl.trim())) {
    issues.push(issue('sourceUrl', 'url', 'error', 'La URL debe empezar por http:// o https://.', 'The URL must start with http:// or https://.'));
  }
  if (!record.license.trim()) {
    issues.push(issue('license', 'required', 'error', 'La licencia o condición de uso es obligatoria.', 'The licence or use condition is required.'));
  }
  if (!record.downloadedAt || Number.isNaN(Date.parse(record.downloadedAt))) {
    issues.push(issue('downloadedAt', 'date', 'error', 'La fecha de descarga no es válida.', 'The download date is invalid.'));
  }
  if (!record.changeReason || record.changeReason.trim().length < 6) {
    issues.push(issue('changeReason', 'required', 'error', 'Explica el motivo del cambio (mínimo 6 caracteres).', 'Explain the reason for the change (at least 6 characters).'));
  }

  if (record.kind === 'carbon') {
    if (record.gasDetail === 'breakdown') {
      const gasTotal = co2eFromGases(record.gases, record.gwpSet);
      if (record.gases.length === 0 || gasTotal <= 0) {
        issues.push(issue('gases', 'required', 'error', 'Añade al menos un gas con cantidad y GWP.', 'Add at least one gas with an amount and GWP.'));
      } else if (Math.abs(gasTotal - record.value) > Math.max(0.001, Math.abs(record.value) * 0.005)) {
        issues.push(issue(
          'value', 'co2e-mismatch', 'error',
          `El CO₂e declarado (${record.value}) no coincide con Σ(gas × GWP) = ${gasTotal.toFixed(4)}.`,
          `Declared CO₂e (${record.value}) does not match Σ(gas × GWP) = ${gasTotal.toFixed(4)}.`,
        ));
      }
    } else if (!record.gases.length) {
      issues.push(issue('gasDetail', 'aggregate', 'warning', 'Factor expresado como CO₂e agregado: no hay desglose por gas.', 'Factor expressed as aggregate CO₂e: no gas breakdown.'));
    }
    if (!record.gwpSet) {
      issues.push(issue('gwpSet', 'required', 'error', 'Selecciona el set de GWP (AR5 o AR6).', 'Select the GWP set (AR5 or AR6).'));
    } else if (record.gwpSet !== 'AR5' && record.gwpSet !== 'AR6') {
      issues.push(issue('gwpSet', 'enum', 'error', 'El set de GWP debe ser AR5 o AR6.', 'The GWP set must be AR5 or AR6.'));
    }
  }

  if (record.kind === 'water') {
    const water = record.water ?? { blue: 0, green: 0, grey: 0 };
    if (!record.water) {
      issues.push(issue('water', 'required', 'error', 'Define los componentes azul, verde y gris.', 'Define blue, green and grey components.'));
    }
    if ([water.blue, water.green, water.grey].some((component) => !Number.isFinite(component) || component < 0)) {
      issues.push(issue('water', 'range', 'error', 'Los componentes de agua no pueden ser negativos.', 'Water components cannot be negative.'));
    }
    const total = water.blue + water.green + water.grey;
    if (Math.abs(total - record.value) > 0.0001) {
      issues.push(issue(
        'value', 'water-total', 'error',
        `El total (${record.value}) no coincide con azul + verde + gris (${total.toFixed(4)}).`,
        `Total (${record.value}) does not match blue + green + grey (${total.toFixed(4)}).`,
      ));
    }
    if (total <= 0) {
      issues.push(issue('water', 'zero', 'error', 'Al menos un componente de agua debe ser mayor que cero.', 'At least one water component must be greater than zero.'));
    }
  }

  if (base) {
    if (base.unit !== record.unit && !unitsCompatible(base.unit, record.unit)) {
      issues.push(issue('unit', 'incompatible', 'error', 'La unidad no es compatible con el factor base.', 'The unit is not compatible with the base factor.'));
    }
    const diff = factorDiff(base, record.value, record.unit);
    if (Math.abs(diff.pct) > threshold && !confirmLargeChange) {
      issues.push(issue(
        'value', 'large-change', 'warning',
        `El cambio es de ${diff.pct.toFixed(1)} % respecto al factor base (umbral ±${threshold} %). Confírmalo para guardar.`,
        `The change is ${diff.pct.toFixed(1)}% versus the base factor (threshold ±${threshold}%). Confirm it to save.`,
      ));
    }
  }

  if (!existing && !base && all.some((item) => item.id === record.id && !item.deletedAt)) {
    issues.push(issue('id', 'duplicate-id', 'error', 'Ya existe un factor con ese identificador.', 'A factor with that identifier already exists.'));
  }

  const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const duplicate = all.find((item) => (
    !item.deletedAt
    && item.id !== record.id
    && item.kind === record.kind
    && item.country === record.country
    && item.dataYear === record.dataYear
    && normalized(item.label.es) === normalized(record.label.es)
  ));
  if (duplicate && !context.allowDuplicate) {
    issues.push(issue(
      'label', 'duplicate', 'warning',
      `Posible duplicado de «${duplicate.label.es}» (${duplicate.country}, ${duplicate.dataYear}).`,
      `Possible duplicate of “${duplicate.label.en}” (${duplicate.country}, ${duplicate.dataYear}).`,
    ));
  }

  const range = PLAUSIBLE_MAX[record.category] ?? PLAUSIBLE_MAX.other;
  const limit = record.kind === 'carbon' ? range.carbon : range.water;
  if (Math.abs(record.value) > limit) {
    issues.push(issue(
      'value', 'implausible', 'warning',
      `El valor supera el rango plausible de la categoría (${limit}). Revisa la unidad.`,
      `The value exceeds the plausible range for this category (${limit}). Check the unit.`,
    ));
  }

  if (record.kind === 'carbon' && record.waterFactorId) {
    const dependency = all.find((item) => item.id === record.waterFactorId && item.kind === 'water');
    if (!dependency) {
      issues.push(issue('waterFactorId', 'orphan', 'error', 'El factor de agua vinculado no existe.', 'The linked water factor does not exist.'));
    }
  }

  return issues;
}

export function hasErrors(issues: FactorIssue[]): boolean {
  return issues.some((item) => item.severity === 'error');
}

export function issueText(issue: FactorIssue, lang: 'es' | 'en'): string {
  return issue.message[lang];
}

/** Crea un override de un factor base preservando el original. */
export function createOverride(
  base: FactorRecord,
  patch: Partial<FactorRecord>,
  meta: { reason: string; user: string; role: FactorRole; at?: string; threshold?: number },
): FactorRecord {
  const at = meta.at ?? nowIso();
  const merged: FactorRecord = {
    ...base,
    ...patch,
    id: base.id,
    baseId: base.id,
    layer: 'custom',
    version: 1,
    baseValue: base.value,
    baseVersion: BASE_DATA_VERSION,
    createdAt: at,
    updatedAt: at,
    createdBy: meta.user,
    approvedBy: meta.role === 'admin' ? meta.user : undefined,
    approval: meta.role === 'admin' ? 'approved' : 'proposed',
    changeReason: meta.reason,
    history: [],
  };
  return merged;
}

/** Aplica un parche a un registro existente y produce la siguiente versión. */
export function updateCustom(
  existing: FactorRecord,
  patch: Partial<FactorRecord>,
  meta: { reason: string; user: string; at?: string },
): FactorRecord {
  return nextFactorVersion(existing, patch, meta);
}

export function factorDiffForUi(base: FactorRecord, record: FactorRecord): FactorDiff {
  return factorDiff(base, record.value, record.unit);
}

/* ── CSV / Excel / JSON ─────────────────────────────────── */

export const FACTOR_CSV_HEADERS = [
  'id', 'kind', 'label_es', 'label_en', 'description_es', 'description_en', 'category', 'scope',
  'unit', 'value', 'gas_detail', 'gwp_set', 'gas_co2', 'gas_ch4', 'gas_n2o', 'gas_other_name',
  'gas_other_amount', 'water_blue', 'water_green', 'water_grey', 'country', 'region', 'data_year',
  'publication_year', 'source_org', 'source_title', 'source_url', 'license', 'downloaded_at',
  'uncertainty_pct', 'method', 'quality', 'status', 'notes_es', 'notes_en', 'change_reason',
] as const;

function csvEscape(value: string | number | undefined): string {
  const text = value === undefined || value === null ? '' : String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function factorsToCsv(records: FactorRecord[]): string {
  const rows = records.map((record) => {
    const gas = (name: string) => record.gases.find((item) => item.gas === name)?.amount ?? '';
    const other = record.gases.find((item) => !['CO2', 'CH4', 'N2O'].includes(item.gas));
    return [
      record.id, record.kind, record.label.es, record.label.en,
      record.description.es, record.description.en, record.category, record.scope,
      record.unit, record.value, record.gasDetail, record.gwpSet,
      gas('CO2'), gas('CH4'), gas('N2O'), other?.gas ?? '', other?.amount ?? '',
      record.water?.blue ?? '', record.water?.green ?? '', record.water?.grey ?? '',
      record.country, record.region ?? '', record.dataYear, record.publicationYear,
      record.sourceOrg, record.sourceTitle, record.sourceUrl, record.license, record.downloadedAt,
      Math.round(record.uncertainty * 1000) / 10, record.method, record.quality, record.status,
      record.notes?.es ?? '', record.notes?.en ?? '', record.changeReason ?? '',
    ].map(csvEscape).join(';');
  });
  return `\uFEFFsep=;\r\n${FACTOR_CSV_HEADERS.join(';')}\r\n${rows.join('\r\n')}\r\n`;
}

export interface CsvParseResult {
  records: FactorRecord[];
  errors: { row: number; field: string; message: { es: string; en: string } }[];
  warnings: { row: number; field: string; message: { es: string; en: string } }[];
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function numberFrom(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const cleaned = text.replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '');
  const normalized = cleaned.includes(',') && !cleaned.includes('.')
    ? cleaned.replace(',', '.')
    : cleaned.replace(/,/g, '');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
}

export function parseFactorCsv(text: string, context: { baseRecords?: Map<string, FactorRecord>; all?: FactorRecord[] } = {}): CsvParseResult {
  const result: CsvParseResult = { records: [], errors: [], warnings: [] };
  const clean = text.replace(/^\uFEFF/, '');
  const lines = clean.split(/\r?\n/).filter((line) => line.trim().length > 0 && !/^sep=/i.test(line.trim()));
  if (lines.length < 2) {
    result.errors.push({ row: 0, field: 'file', message: { es: 'El CSV no contiene filas de datos.', en: 'The CSV has no data rows.' } });
    return result;
  }
  const delimiter = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const headers = parseDelimitedLine(lines[0], delimiter).map((header) => header.toLowerCase().trim());
  const col = (cells: string[], name: string) => {
    const index = headers.indexOf(name);
    return index >= 0 ? cells[index] : undefined;
  };

  const required = ['kind', 'label_es', 'category', 'unit', 'value', 'country', 'data_year', 'source_org', 'source_title', 'change_reason'];
  const missing = required.filter((name) => !headers.includes(name));
  if (missing.length > 0) {
    result.errors.push({
      row: 0,
      field: 'headers',
      message: {
        es: `Faltan columnas obligatorias: ${missing.join(', ')}.`,
        en: `Missing required columns: ${missing.join(', ')}.`,
      },
    });
    return result;
  }

  const batch = [...(context.all ?? [])];
  for (let index = 1; index < lines.length; index += 1) {
    const cells = parseDelimitedLine(lines[index], delimiter);
    const rowNumber = index + 1;
    const kind = (col(cells, 'kind') ?? '').toLowerCase().includes('water') ? 'water' : 'carbon';
    const labelEs = col(cells, 'label_es') ?? '';
    const labelEn = col(cells, 'label_en') || labelEs;
    const quality = ((col(cells, 'quality') ?? 'literature') as FactorQuality);
    const gwpSet = ((col(cells, 'gwp_set') ?? 'AR6') as GWPSet);
    const gasDetail = (col(cells, 'gas_detail') ?? 'breakdown') === 'aggregate' ? 'aggregate' : 'breakdown';
    const gases: GasAmount[] = [];
    if (kind === 'carbon' && gasDetail === 'breakdown') {
      const co2 = numberFrom(col(cells, 'gas_co2'));
      const ch4 = numberFrom(col(cells, 'gas_ch4'));
      const n2o = numberFrom(col(cells, 'gas_n2o'));
      const otherName = col(cells, 'gas_other_name');
      const otherAmount = numberFrom(col(cells, 'gas_other_amount'));
      if (co2 !== undefined) gases.push({ gas: 'CO2', amount: co2 });
      if (ch4 !== undefined) gases.push({ gas: 'CH4', amount: ch4 });
      if (n2o !== undefined) gases.push({ gas: 'N2O', amount: n2o });
      if (otherName && otherAmount !== undefined) gases.push({ gas: otherName, amount: otherAmount });
    }
    const blue = numberFrom(col(cells, 'water_blue')) ?? 0;
    const green = numberFrom(col(cells, 'water_green')) ?? 0;
    const grey = numberFrom(col(cells, 'water_grey')) ?? 0;
    const declaredValue = numberFrom(col(cells, 'value'));
    const value = declaredValue ?? (kind === 'water' ? blue + green + grey : co2eFromGases(gases, gwpSet));
    const id = col(cells, 'id') || customFactorId(kind);
    const base = context.baseRecords?.get(id);
    const uncertaintyPct = numberFrom(col(cells, 'uncertainty_pct')) ?? 20;
    const record: FactorRecord = {
      id,
      baseId: base ? base.id : undefined,
      kind,
      label: { es: labelEs, en: labelEn },
      description: {
        es: col(cells, 'description_es') || labelEs,
        en: col(cells, 'description_en') || labelEn,
      },
      category: col(cells, 'category') || 'other',
      scope: (Number(col(cells, 'scope') ?? 3) as Scope),
      unit: (col(cells, 'unit') || 'kg') as UnitCode,
      value,
      gases,
      gasDetail,
      gwpSet,
      water: kind === 'water' ? { blue, green, grey } : undefined,
      waterType: kind === 'water' ? 'mixed' : undefined,
      country: (col(cells, 'country') || 'GLOBAL') as CountryCode | 'GLOBAL',
      region: col(cells, 'region') || undefined,
      dataYear: Number(col(cells, 'data_year') ?? new Date().getFullYear()),
      publicationYear: Number(col(cells, 'publication_year') ?? col(cells, 'data_year') ?? new Date().getFullYear()),
      sourceId: 'custom',
      sourceOrg: col(cells, 'source_org') ?? '',
      sourceTitle: col(cells, 'source_title') ?? '',
      sourceUrl: col(cells, 'source_url') ?? '',
      license: col(cells, 'license') || 'Dato primario / fuente declarada por el usuario',
      downloadedAt: col(cells, 'downloaded_at') || today(),
      uncertainty: uncertaintyPct > 1 ? uncertaintyPct / 100 : uncertaintyPct,
      method: ((col(cells, 'method') ?? 'physical') as FactorRecord['method']),
      quality,
      status: ((col(cells, 'status') ?? (quality === 'official' ? 'verified' : quality === 'estimated' ? 'screening' : 'pending')) as Status),
      layer: 'custom',
      version: 1,
      notes: {
        es: col(cells, 'notes_es') || '',
        en: col(cells, 'notes_en') || '',
      },
      changeReason: col(cells, 'change_reason') ?? '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      createdBy: 'Importación CSV',
      approval: 'draft',
      history: [],
      baseValue: base?.value,
      baseVersion: base ? BASE_DATA_VERSION : undefined,
    };
    const issues = validateFactor(record, { base, all: batch });
    const errors = issues.filter((item) => item.severity === 'error');
    const warnings = issues.filter((item) => item.severity === 'warning');
    if (errors.length > 0) {
      for (const item of errors) {
        result.errors.push({ row: rowNumber, field: item.field, message: item.message });
      }
    } else {
      if (warnings.length > 0) {
        for (const item of warnings) {
          result.warnings.push({ row: rowNumber, field: item.field, message: item.message });
        }
      }
      result.records.push(record);
      batch.push(record);
    }
  }
  return result;
}

export function parseFactorJson(text: string): { records: FactorRecord[]; error?: string } {
  try {
    const parsed = JSON.parse(text);
    const raw = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.factors)
        ? parsed.factors
        : Array.isArray(parsed.customFactors)
          ? parsed.customFactors
          : null;
    if (!raw) return { records: [], error: 'El JSON no contiene un arreglo «factors» o «customFactors».' };
    const records = raw.filter((item: unknown): item is FactorRecord => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as Partial<FactorRecord>;
      return typeof candidate.id === 'string' && (candidate.kind === 'carbon' || candidate.kind === 'water');
    }).map((record: FactorRecord) => ({
      ...record,
      layer: 'custom' as const,
      version: Number(record.version) || 1,
      createdAt: record.createdAt || nowIso(),
      updatedAt: record.updatedAt || nowIso(),
      history: Array.isArray(record.history) ? record.history : [],
      approval: record.approval ?? 'draft',
      gases: Array.isArray(record.gases) ? record.gases : [],
      description: record.description ?? record.label ?? { es: '', en: '' },
    }));
    return { records };
  } catch (error) {
    return { records: [], error: error instanceof Error ? error.message : 'JSON inválido' };
  }
}

export function factorsToJson(records: FactorRecord[], extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schema: 'green-owl-labs/factor-layer@1',
    exportedAt: nowIso(),
    baseVersion: BASE_DATA_VERSION,
    count: records.length,
    factors: records,
    ...extra,
  }, null, 2);
}

export function factorTemplateCsv(lang: 'es' | 'en'): string {
  const sample: Partial<Record<(typeof FACTOR_CSV_HEADERS)[number], string | number>> = {
    kind: 'carbon',
    label_es: lang === 'es' ? 'Electricidad de red · ejemplo' : 'Grid electricity · example',
    label_en: 'Grid electricity · example',
    description_es: lang === 'es' ? 'Factor de ejemplo para completar la plantilla' : 'Example factor to complete the template',
    description_en: 'Example factor to complete the template',
    category: 'energy',
    scope: 2,
    unit: 'kWh',
    value: 0.452,
    gas_detail: 'breakdown',
    gwp_set: 'AR6',
    gas_co2: 0.45,
    gas_ch4: 0.00002,
    gas_n2o: 0.000004,
    country: 'PE',
    data_year: 2024,
    publication_year: 2025,
    source_org: 'MINAM / COES',
    source_title: 'Factor de emisión del SEIN 2024',
    source_url: 'https://www.gob.pe/minam',
    license: 'Datos abiertos del Estado peruano',
    downloaded_at: today(),
    uncertainty_pct: 15,
    method: 'physical',
    quality: 'official',
    status: 'verified',
    notes_es: 'Reemplaza este ejemplo con tu dato.',
    notes_en: 'Replace this example with your data.',
    change_reason: lang === 'es' ? 'Alta de factor personalizado' : 'Custom factor creation',
  };
  const row = FACTOR_CSV_HEADERS.map((header) => csvEscape(sample[header] ?? '')).join(';');
  return `\uFEFFsep=;\r\n${FACTOR_CSV_HEADERS.join(';')}\r\n${row}\r\n`;
}

export function factorSummary(record: FactorRecord): string {
  return `${record.label.es} · ${record.value} ${record.unit} · ${record.country} ${record.dataYear}`;
}

export function factorHistory(record: FactorRecord): FactorHistoryEntry[] {
  return [...(record.history ?? [])].sort((a, b) => b.version - a.version);
}

export function recordToDisplayValue(record: FactorRecord, lang: 'es' | 'en'): string {
  const unit = record.kind === 'water' ? 'm³' : 'kg CO₂e';
  return `${record.value.toLocaleString(lang === 'es' ? 'es-PE' : 'en-GB', { maximumFractionDigits: 6 })} ${unit}/${record.unit}`;
}

export function totalWater(record: FactorRecord): number {
  return recordTotalWater(record);
}

export function baseUnitIn(record: FactorRecord, unit: UnitCode): number {
  return normalizeUnitValue(record.value, record.unit, unit);
}
