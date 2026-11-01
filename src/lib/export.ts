import type { FootprintResult, Lang, Project, SourceRef } from '../engine/types';
import {
  benchmarks, carbonFactors, sourceRegistry, stressEntries, waterFactors,
} from '../engine/factors';
import { baseFactorRecords } from '../engine/catalog';
import { auditSentence } from '../engine/calculate';
import { countryLabel, sectorLabel } from '../engine/benchmarks';
import { download, slug, timestamp } from './download';
import { nf, statusLabel } from './format';

export const DATA_VERSION = '2026.10';

function escapeCsv(value: string | number | undefined): string {
  const text = value === undefined || value === null ? '' : String(value);
  if (/[";\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function linesToCsv(project: Project, result: FootprintResult, lang: Lang): string {
  const header = lang === 'es'
    ? ['Proyecto', 'Entidad', 'País', 'Periodo inicio', 'Periodo fin', 'Año base', 'Método GWP', 'Scope 2',
      'Categoría', 'Alcance', 'Categoría Scope 3', 'Actividad', 'Cantidad', 'Unidad',
      'ID factor', 'Factor', 'Valor factor', 'Unidad factor', 'Capa factor', 'Versión factor', 'Motivo del cambio',
      'kg CO2e', 'kg CO2e location', 'kg CO2e market',
      'Agua azul m3', 'Agua verde m3', 'Agua gris m3', 'Incertidumbre %', 'Fuente', 'Organización fuente',
      'Año factor', 'Estado factor', 'Supuestos', 'Cálculo']
    : ['Project', 'Entity', 'Country', 'Period start', 'Period end', 'Base year', 'GWP set', 'Scope 2',
      'Category', 'Scope', 'Scope 3 category', 'Activity', 'Quantity', 'Unit',
      'Factor ID', 'Factor', 'Factor value', 'Factor unit', 'Factor layer', 'Factor version', 'Change reason',
      'kg CO2e', 'kg CO2e location', 'kg CO2e market',
      'Blue water m3', 'Green water m3', 'Grey water m3', 'Uncertainty %', 'Source', 'Source organisation',
      'Factor year', 'Factor status', 'Assumptions', 'Calculation'];

  const rows = result.lines.map((line) => [
    project.name,
    project.entity,
    project.country,
    project.periodStart,
    project.periodEnd,
    project.baseYear,
    project.gwp,
    project.scope2Method,
    line.categoryLabel[lang],
    line.scope,
    line.scope3Category ?? '',
    line.label[lang],
    line.quantity,
    line.unit,
    line.factorId,
    line.factorLabel[lang],
    line.factorValue,
    line.factorUnit,
    line.factorLayer,
    line.factorVersion,
    line.factorChangeReason ?? '',
    line.kgCO2e,
    line.kgCO2eLocation ?? '',
    line.kgCO2eMarket ?? '',
    line.water.blue,
    line.water.green,
    line.water.grey,
    Math.round(line.uncertaintyPct * 1000) / 10,
    line.source.title,
    line.source.org,
    line.factorYear,
    statusLabel(line.factorStatus, lang),
    line.assumptions.join(' | '),
    auditSentence(line, lang),
  ]);

  return `\uFEFFsep=;\r\n${[header, ...rows].map((row) => row.map(escapeCsv).join(';')).join('\r\n')}\r\n`;
}

export function exportLinesCsv(project: Project, result: FootprintResult, lang: Lang): void {
  download(`gol-inventario-${slug(project.name)}-${timestamp()}.csv`, linesToCsv(project, result, lang), 'text/csv');
}

export function exportProjectJson(project: Project, result: FootprintResult, lang: Lang): void {
  const payload = {
    schema: 'green-owl-labs/project-export@1',
    exportedAt: new Date().toISOString(),
    dataVersion: DATA_VERSION,
    language: lang,
    project,
    result,
    metadata: {
      method: ['GHG Protocol Corporate Standard', 'GHG Protocol Scope 2 Guidance', 'ISO 14064-1', 'ISO 14046', 'Water Footprint Network'],
      gwp: project.gwp,
      scope2Method: project.scope2Method,
      uncertainty: 'Propagación por cuadratura de incertidumbres por línea (screening)',
      factorCount: carbonFactors.length + waterFactors.length,
      customFactorCount: result.factorSnapshot.filter((snapshot) => snapshot.layer === 'custom').length,
      factorSnapshot: result.factorSnapshot,
      customFactors: result.factorSnapshot.filter((snapshot) => snapshot.layer === 'custom'),
      disclaimer: 'Estimación trazable. No constituye verificación de tercera parte ni certificación de neutralidad.',
    },
  };
  download(`gol-proyecto-${slug(project.name)}-${timestamp()}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

export function exportCatalogJson(): void {
  const payload = {
    schema: 'green-owl-labs/factor-catalog@1',
    exportedAt: new Date().toISOString(),
    dataVersion: DATA_VERSION,
    carbonFactors: carbonFactors.map(({ source: _source, ...factor }) => factor),
    waterFactors: waterFactors.map(({ source: _source, ...factor }) => factor),
    unifiedFactors: baseFactorRecords,
    sources: sourceRegistry,
    benchmarks,
    waterStress: stressEntries,
    counts: { carbon: carbonFactors.length, water: waterFactors.length, sources: Object.keys(sourceRegistry).length, unified: baseFactorRecords.length },
    note: 'Cada factor incluye valor, unidad, fuente, año, región, incertidumbre, estado, licencia, fecha de descarga y —cuando existe— desglose por gas.',
  };
  download(`gol-catalogo-factores-${DATA_VERSION}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

export function resultSummaryText(project: Project, result: FootprintResult, lang: Lang): string {
  const carbon = nf(result.totalKgCO2e / 1000, lang, 2);
  const water = nf(result.water.total, lang, 0);
  const scope2 = project.scope2Method === 'market'
    ? `${nf(result.scope2.market / 1000, lang, 2)} t`
    : `${nf(result.scope2.location / 1000, lang, 2)} t`;
  if (lang === 'es') {
    return [
      `Proyecto: ${project.name}`,
      `Entidad: ${project.entity} · País: ${countryLabel(project.country, 'es')}${project.entity === 'company' ? ` · Sector: ${sectorLabel(project.sector, 'es')}` : ''}`,
      `Periodo: ${project.periodStart} → ${project.periodEnd} · Año base: ${project.baseYear}`,
      `Huella de carbono: ${carbon} t CO₂e (${project.gwp}, Scope 2 ${project.scope2Method}: ${scope2})`,
      `Huella hídrica: ${water} m³ (azul ${nf(result.water.blue, lang, 0)} · verde ${nf(result.water.green, lang, 0)} · gris ${nf(result.water.grey, lang, 0)})`,
      `Incertidumbre: ±${nf(result.uncertaintyPct * 100, lang, 0)} % (screening)`,
      `Completitud: ${nf(result.completeness * 100, lang, 0)} %`,
      'Green Owl Labs · estimación trazable, no certificación.',
    ].join('\n');
  }
  return [
    `Project: ${project.name}`,
    `Entity: ${project.entity} · Country: ${countryLabel(project.country, 'en')}${project.entity === 'company' ? ` · Sector: ${sectorLabel(project.sector, 'en')}` : ''}`,
    `Period: ${project.periodStart} → ${project.periodEnd} · Base year: ${project.baseYear}`,
    `Carbon footprint: ${carbon} t CO₂e (${project.gwp}, Scope 2 ${project.scope2Method}: ${scope2})`,
    `Water footprint: ${water} m³ (blue ${nf(result.water.blue, lang, 0)} · green ${nf(result.water.green, lang, 0)} · grey ${nf(result.water.grey, lang, 0)})`,
    `Uncertainty: ±${nf(result.uncertaintyPct * 100, lang, 0)} % (screening)`,
    `Completeness: ${nf(result.completeness * 100, lang, 0)} %`,
    'Green Owl Labs · traceable estimate, not certification.',
  ].join('\n');
}

export function sourceList(result: FootprintResult): SourceRef[] {
  const seen = new Map<string, SourceRef>();
  for (const line of result.lines) {
    const key = `${line.source.org}|${line.source.title}|${line.source.year}`;
    if (!seen.has(key)) seen.set(key, line.source);
  }
  return [...seen.values()].sort((a, b) => a.org.localeCompare(b.org));
}
