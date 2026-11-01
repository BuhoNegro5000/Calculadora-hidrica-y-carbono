/**
 * Inventario y detección de huecos.
 * Cruza la capa base y la personalizada para responder: qué falta por
 * categoría, país, año, gas y tipo de agua. Los huecos curados viven en
 * src/data/factorGaps.json y se marcan como cubiertos cuando aparece un factor.
 */

import gapsRaw from '../data/factorGaps.json';
import { catalogStats, type FactorCatalog } from './catalog';
import type { FactorKind, FactorRecord, WaterType } from './factorTypes';
import { COUNTRY_OPTIONS } from './factorTypes';

export interface GapSource {
  org: string;
  title: string;
  url: string;
  license: string;
}

export interface FactorGap {
  id: string;
  priority: 'high' | 'medium' | 'low';
  kind: FactorKind;
  category: string;
  country: string;
  year: number;
  gas: string;
  waterType?: WaterType;
  title: { es: string; en: string };
  rationale: { es: string; en: string };
  action: { es: string; en: string };
  sources: GapSource[];
}

export interface GapWithCoverage extends FactorGap {
  coveredBy?: string;
}

export interface CoverageRow {
  country: string;
  carbon: number;
  water: number;
  total: number;
  hasWater: boolean;
}

export interface GapMetrics {
  total: number;
  carbon: number;
  water: number;
  base: number;
  custom: number;
  overrides: number;
  verifiedShare: number;
  noGasBreakdown: number;
  stale: number;
  waterGreenZero: number;
  waterGreyZero: number;
  waterCountries: number;
  countriesWithFactors: number;
  countriesWithoutWater: number;
  categoriesCovered: number;
  yearMin: number;
  yearMax: number;
  pending: number;
}

export interface GapAnalysis {
  metrics: GapMetrics;
  coverage: CoverageRow[];
  gaps: GapWithCoverage[];
  byPriority: Record<'high' | 'medium' | 'low', number>;
}

const gapData = gapsRaw as { version: string; generatedAt: string; protocol: string; gaps: FactorGap[] };

function matchesGap(record: FactorRecord, gap: FactorGap): boolean {
  if (record.kind !== gap.kind) return false;
  if (gap.category !== 'other' && record.category !== gap.category) return false;
  if (gap.country !== 'GLOBAL' && record.country !== gap.country && record.country !== 'GLOBAL') return false;
  if (record.dataYear < gap.year - 1) return false;
  if (gap.waterType && record.water) {
    if (gap.waterType === 'blue' && record.water.blue <= 0) return false;
    if (gap.waterType === 'green' && record.water.green <= 0) return false;
    if (gap.waterType === 'grey' && record.water.grey <= 0) return false;
  }
  return true;
}

export function analyzeInventory(catalog: FactorCatalog): GapAnalysis {
  const records = [...catalog.records.values()];
  const stats = catalogStats(catalog);
  const currentYear = new Date().getFullYear();
  const countries = COUNTRY_OPTIONS.filter((country) => country !== 'GLOBAL');
  const coverage = countries.map<CoverageRow>((country) => {
    const carbon = records.filter((record) => record.kind === 'carbon' && record.country === country).length;
    const water = records.filter((record) => record.kind === 'water' && record.country === country).length;
    return { country, carbon, water, total: carbon + water, hasWater: water > 0 };
  });
  const waterRecords = records.filter((record) => record.kind === 'water');
  const carbonRecords = records.filter((record) => record.kind === 'carbon');
  const verified = records.filter((record) => record.status === 'verified').length;

  const gaps = gapData.gaps.map<GapWithCoverage>((gap) => {
    if (gap.id === 'gap_custom_governance') return { ...gap };
    const match = records.find((record) => matchesGap(record, gap));
    return { ...gap, coveredBy: match?.id };
  });

  const byPriority = gaps.reduce<Record<'high' | 'medium' | 'low', number>>((acc, gap) => {
    if (!gap.coveredBy) acc[gap.priority] += 1;
    return acc;
  }, { high: 0, medium: 0, low: 0 });

  return {
    metrics: {
      total: stats.total,
      carbon: stats.carbon,
      water: stats.water,
      base: stats.base,
      custom: stats.custom,
      overrides: stats.overrides,
      verifiedShare: stats.total ? verified / stats.total : 0,
      noGasBreakdown: carbonRecords.filter((record) => !record.gases.length).length,
      stale: records.filter((record) => record.dataYear < currentYear - 5).length,
      waterGreenZero: waterRecords.filter((record) => (record.water?.green ?? 0) <= 0).length,
      waterGreyZero: waterRecords.filter((record) => (record.water?.grey ?? 0) <= 0).length,
      waterCountries: new Set(waterRecords.map((record) => record.country)).size,
      countriesWithFactors: coverage.filter((row) => row.total > 0).length,
      countriesWithoutWater: coverage.filter((row) => !row.hasWater).length,
      categoriesCovered: new Set(records.map((record) => record.category)).size,
      yearMin: records.length ? Math.min(...records.map((record) => record.dataYear)) : currentYear,
      yearMax: records.length ? Math.max(...records.map((record) => record.dataYear)) : currentYear,
      pending: stats.pending,
    },
    coverage,
    gaps,
    byPriority,
  };
}

export const gapProtocol = gapData.protocol;
export const gapDataVersion = gapData.version;
