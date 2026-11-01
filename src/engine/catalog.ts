/**
 * Catálogo resuelto de factores.
 * Base (solo lectura) + capa personalizada (overrides y factores nuevos).
 * La UI y el motor consumen este catálogo; nunca mutan los JSON base.
 */

import type { CarbonFactor, CountryCode, SourceRef, WaterFactor } from './types';
import {
  carbonFactors, sourceById, waterFactors,
} from './factors';
import type { FactorRecord, FactorSnapshot } from './factorTypes';
import {
  BASE_DATA_VERSION, factorRecordToSnapshot, qualityForStatus, statusForQuality,
} from './factorTypes';
import { convert } from './units';

export interface FactorCatalog {
  carbon: Map<string, CarbonFactor>;
  water: Map<string, WaterFactor>;
  records: Map<string, FactorRecord>;
  baseCarbon: Map<string, CarbonFactor>;
  baseWater: Map<string, WaterFactor>;
  baseRecords: Map<string, FactorRecord>;
  customCount: number;
  overrideCount: number;
  version: string;
}

/** Licencia de la fuente. Se muestra en la ficha y en el catálogo exportado. */
export const SOURCE_LICENSES: Record<string, string> = {
  defra2025: 'Open Government Licence v3.0',
  ipcc_ar5: 'IPCC · cita requerida',
  ipcc_ar6: 'IPCC · cita requerida',
  epa_egrid: 'Dominio público (US Government)',
  iea: 'IEA · licencia de datos, revisar términos',
  minam_pe: 'Datos abiertos del Estado peruano',
  coes_pe: 'Datos abiertos / uso con atribución',
  ree_es: 'Datos abiertos con atribución',
  semarnat_mx: 'Datos abiertos del Estado mexicano',
  xm_co: 'Datos abiertos con atribución',
  coord_cl: 'Datos abiertos con atribución',
  cammesa_ar: 'Datos abiertos con atribución',
  mcti_br: 'Datos abiertos del Gobierno de Brasil',
  uba_de: 'Datos abiertos con atribución',
  rte_fr: 'Datos abiertos con atribución',
  eea_eu: 'Datos abiertos UE con atribución',
  poore_nemecek: 'CC BY 4.0 (artículo científico)',
  wfn_food: 'Water Footprint Network · uso con atribución',
  wfn: 'Water Footprint Network · uso con atribución',
  aware: 'WULCA · uso con atribución',
  wri_aqueduct: 'CC BY 4.0',
  epa_useeio: 'Dominio público (US Government)',
  iea_4e: 'IEA 4E · uso con atribución',
  carbon_trust: 'Carbon Trust · uso con atribución',
  wrap: 'WRAP · uso con atribución',
  gfn: 'Global Footprint Network · uso con atribución',
  ghg_protocol: 'GHG Protocol · uso con atribución',
  iso_14064: 'ISO · derechos reservados, referencia normativa',
  iso_14046: 'ISO · derechos reservados, referencia normativa',
  iso_20121: 'ISO · derechos reservados, referencia normativa',
  hotel_footprint: 'ITP / Greenview · uso con atribución',
  ana_pe: 'Datos abiertos del Estado peruano',
  fao: 'FAO · CC BY 4.0 (revisar serie)',
  benchmark_compilation: 'Green Owl Labs · compilación propia',
  custom: 'Dato primario / fuente declarada por el usuario',
};

function licenseFor(sourceId: string): string {
  return SOURCE_LICENSES[sourceId] ?? 'Ver términos de la fuente';
}

function sourceRef(sourceId: string, fallback: SourceRef): SourceRef {
  try { return sourceById(sourceId); } catch { return fallback; }
}

function waterCategory(id: string): string {
  if (id.includes('elec') || id.includes('fuel') || id.includes('energy')) return 'energy';
  if (id.includes('food') || id.includes('beef') || id.includes('crop') || id.includes('agri')) return 'food';
  if (id.includes('waste')) return 'waste';
  if (id.includes('event')) return 'events';
  if (id.includes('textile') || id.includes('good')) return 'goods';
  return 'water';
}

function carbonToRecord(factor: CarbonFactor): FactorRecord {
  const source = sourceRef(factor.sourceId, factor.source);
  const createdAt = `${factor.lastVerified}T00:00:00.000Z`;
  return {
    id: factor.id,
    kind: 'carbon',
    label: factor.label,
    description: factor.notes ?? factor.label,
    category: factor.category,
    scope: factor.scope,
    scope3Category: factor.scope3Category,
    unit: factor.unit,
    value: factor.value,
    gases: [],
    gasDetail: 'aggregate',
    gwpSet: factor.byGwp?.AR6 ? 'AR6' : factor.byGwp?.AR5 ? 'AR5' : 'AR6',
    byGwp: factor.byGwp,
    valueRf: factor.valueRf,
    waterType: factor.waterFactorId ? 'mixed' : undefined,
    waterFactorId: factor.waterFactorId,
    direct: factor.direct,
    country: factor.country,
    dataYear: factor.year,
    publicationYear: source.year,
    sourceId: factor.sourceId,
    sourceOrg: source.org,
    sourceTitle: source.title,
    sourceUrl: source.url,
    license: licenseFor(factor.sourceId),
    downloadedAt: factor.lastVerified,
    uncertainty: factor.uncertainty,
    method: factor.unit === 'USD' ? 'spend' : 'physical',
    quality: qualityForStatus(factor.status),
    status: factor.status,
    layer: 'base',
    version: 1,
    notes: factor.notes,
    changeReason: 'Factor base de la aplicación',
    createdAt,
    updatedAt: createdAt,
    createdBy: 'Green Owl Labs',
    approval: 'approved',
    approvedBy: 'Green Owl Labs',
    history: [],
  };
}

function waterToRecord(factor: WaterFactor): FactorRecord {
  const source = sourceRef(factor.sourceId, factor.source);
  const createdAt = `${factor.lastVerified}T00:00:00.000Z`;
  return {
    id: factor.id,
    kind: 'water',
    label: factor.label,
    description: factor.notes ?? factor.label,
    category: waterCategory(factor.id),
    scope: factor.direct ? 1 : 3,
    unit: factor.unit,
    value: factor.blue + factor.green + factor.grey,
    gases: [],
    gasDetail: 'aggregate',
    gwpSet: 'AR6',
    water: { blue: factor.blue, green: factor.green, grey: factor.grey },
    waterType: 'mixed',
    direct: factor.direct,
    country: factor.country,
    dataYear: factor.year,
    publicationYear: source.year,
    sourceId: factor.sourceId,
    sourceOrg: source.org,
    sourceTitle: source.title,
    sourceUrl: source.url,
    license: licenseFor(factor.sourceId),
    downloadedAt: factor.lastVerified,
    uncertainty: factor.uncertainty,
    method: 'physical',
    quality: qualityForStatus(factor.status),
    status: factor.status,
    layer: 'base',
    version: 1,
    notes: factor.notes,
    changeReason: 'Factor base de la aplicación',
    createdAt,
    updatedAt: createdAt,
    createdBy: 'Green Owl Labs',
    approval: 'approved',
    approvedBy: 'Green Owl Labs',
    history: [],
  };
}

export function recordToCarbon(record: FactorRecord): CarbonFactor {
  return {
    id: record.id,
    label: record.label,
    category: record.category,
    scope: record.scope,
    scope3Category: record.scope3Category,
    unit: record.unit,
    value: record.value,
    byGwp: record.byGwp,
    valueRf: record.valueRf,
    uncertainty: record.uncertainty,
    sourceId: record.sourceId,
    source: {
      org: record.sourceOrg,
      title: record.sourceTitle,
      year: record.publicationYear,
      url: record.sourceUrl,
    },
    country: record.country,
    year: record.dataYear,
    lastVerified: record.updatedAt.slice(0, 10),
    status: record.status,
    waterFactorId: record.waterFactorId,
    notes: record.notes ?? record.description,
    direct: record.direct,
  };
}

export function recordToWater(record: FactorRecord): WaterFactor {
  const water = record.water ?? { blue: record.value, green: 0, grey: 0 };
  return {
    id: record.id,
    label: record.label,
    unit: record.unit,
    blue: water.blue,
    green: water.green,
    grey: water.grey,
    uncertainty: record.uncertainty,
    sourceId: record.sourceId,
    source: {
      org: record.sourceOrg,
      title: record.sourceTitle,
      year: record.publicationYear,
      url: record.sourceUrl,
    },
    country: record.country,
    year: record.dataYear,
    lastVerified: record.updatedAt.slice(0, 10),
    status: record.status,
    direct: record.direct,
    notes: record.notes ?? record.description,
  };
}

export const baseCarbonById = new Map(carbonFactors.map((factor) => [factor.id, factor]));
export const baseWaterById = new Map(waterFactors.map((factor) => [factor.id, factor]));

export const baseFactorRecords: FactorRecord[] = [
  ...carbonFactors.map(carbonToRecord),
  ...waterFactors.map(waterToRecord),
];

export const baseRecordById = new Map(baseFactorRecords.map((record) => [record.id, record]));

export function buildCatalog(customRecords: FactorRecord[] = []): FactorCatalog {
  const records = new Map(baseRecordById);
  const carbon = new Map(baseCarbonById);
  const water = new Map(baseWaterById);
  let customCount = 0;
  let overrideCount = 0;

  for (const record of customRecords) {
    if (record.deletedAt) continue;
    customCount += 1;
    if (record.baseId) overrideCount += 1;
    records.set(record.id, record);
    if (record.kind === 'carbon') carbon.set(record.id, recordToCarbon(record));
    else water.set(record.id, recordToWater(record));
  }

  return {
    carbon,
    water,
    records,
    baseCarbon: baseCarbonById,
    baseWater: baseWaterById,
    baseRecords: baseRecordById,
    customCount,
    overrideCount,
    version: `${BASE_DATA_VERSION}.${customCount}`,
  };
}

export const baseCatalog = buildCatalog([]);

export function electricityFactorFrom(catalog: FactorCatalog, country: CountryCode): CarbonFactor {
  const byCountry: Record<CountryCode, string> = {
    PE: 'elec_pe', US: 'elec_us', GB: 'elec_gb', ES: 'elec_es', MX: 'elec_mx',
    CO: 'elec_co', CL: 'elec_cl', AR: 'elec_ar', BR: 'elec_br', DE: 'elec_de',
    FR: 'elec_fr', EU: 'elec_eu', GLOBAL: 'elec_global',
  };
  const factor = catalog.carbon.get(byCountry[country] ?? 'elec_global');
  if (!factor) throw new Error(`Sin factor eléctrico para ${country}`);
  return factor;
}

export function catalogRecord(catalog: FactorCatalog, id: string): FactorRecord | undefined {
  return catalog.records.get(id);
}

export function catalogSnapshots(catalog: FactorCatalog, ids: string[]): FactorSnapshot[] {
  const seen = new Set<string>();
  const snapshots: FactorSnapshot[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const record = catalog.records.get(id);
    if (!record) continue;
    seen.add(id);
    snapshots.push(factorRecordToSnapshot(record));
  }
  return snapshots;
}

export function baseUpdatedOverrides(customRecords: FactorRecord[]): FactorRecord[] {
  return customRecords.filter((record) => {
    if (!record.baseId || record.deletedAt) return false;
    const base = baseRecordById.get(record.baseId);
    if (!base) return false;
    return base.value !== record.baseValue
      || (record.baseVersion ?? BASE_DATA_VERSION) !== BASE_DATA_VERSION;
  });
}

/** Estado visual coherente para factores personalizados. */
export function customRecordStatus(record: FactorRecord): FactorRecord['status'] {
  return record.status ?? statusForQuality(record.quality);
}

export function catalogStats(catalog: FactorCatalog) {
  const all = [...catalog.records.values()];
  const base = all.filter((record) => record.layer === 'base');
  const custom = all.filter((record) => record.layer === 'custom');
  return {
    total: all.length,
    base: base.length,
    custom: custom.length,
    overrides: custom.filter((record) => record.baseId).length,
    carbon: all.filter((record) => record.kind === 'carbon').length,
    water: all.filter((record) => record.kind === 'water').length,
    verified: all.filter((record) => record.status === 'verified').length,
    pending: all.filter((record) => record.status === 'pending').length,
    screening: all.filter((record) => record.status === 'screening').length,
    estimated: all.filter((record) => record.quality === 'estimated').length,
  };
}

/** Compatibilidad de unidad entre factor base y override. */
export function unitsCompatible(a: FactorRecord['unit'], b: FactorRecord['unit']): boolean {
  try {
    // convert lanza UnitMismatchError si las dimensiones no coinciden.
    const probe = convert(1, a, b);
    return Number.isFinite(probe);
  } catch {
    return false;
  }
}
