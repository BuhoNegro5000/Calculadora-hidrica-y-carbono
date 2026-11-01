import { z } from 'zod';
import carbonRaw from '../data/carbonFactors.json';
import waterRaw from '../data/waterFactors.json';
import sourcesRaw from '../data/sources.json';
import benchmarksRaw from '../data/benchmarks.json';
import stressRaw from '../data/stress.json';
import dietRaw from '../data/dietProfiles.json';
import type {
  BenchmarkSet, Bilingual, CarbonFactor, CountryCode, GWPSet, SourceRef, StressEntry, WaterFactor,
} from './types';

const bilingual = z.object({ es: z.string(), en: z.string() });
const sourceSchema = z.object({
  org: z.string(), title: z.string(), year: z.number().int(), url: z.string(),
});

const sourceIdSchema = z.string().min(1);
const statusSchema = z.enum(['verified', 'pending', 'screening']);
const unitSchema = z.enum([
  'kWh', 'MWh', 'L', 'm3', 'kg', 't', 'km', 'pkm', 'tkm',
  'night', 'meal', 'unit', 'USD', 'GB', 'hour', 'year',
]);
const countrySchema = z.enum(['PE', 'US', 'GB', 'ES', 'MX', 'CO', 'CL', 'AR', 'BR', 'DE', 'FR', 'EU', 'GLOBAL']);

const carbonSchema = z.object({
  id: z.string(),
  label: bilingual,
  category: z.string(),
  scope: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  scope3Category: z.number().optional(),
  unit: unitSchema,
  value: z.number(),
  byGwp: z.object({ AR5: z.number().optional(), AR6: z.number().optional() }).optional(),
  valueRf: z.number().optional(),
  uncertainty: z.number().min(0).max(1),
  sourceId: sourceIdSchema,
  country: countrySchema,
  year: z.number().int(),
  lastVerified: z.string(),
  status: statusSchema,
  waterFactorId: z.string().optional(),
  notes: bilingual.optional(),
  direct: z.boolean().optional(),
});

const waterSchema = z.object({
  id: z.string(),
  label: bilingual,
  unit: unitSchema,
  blue: z.number().min(0),
  green: z.number().min(0),
  grey: z.number().min(0),
  uncertainty: z.number().min(0).max(1),
  sourceId: sourceIdSchema,
  country: countrySchema,
  year: z.number().int(),
  lastVerified: z.string(),
  status: statusSchema,
  direct: z.boolean().optional(),
  notes: bilingual.optional(),
});

const sourcesSchema = z.record(z.string(), sourceSchema);
export const sources = sourcesSchema.parse(sourcesRaw) as Record<string, SourceRef>;
export const sourceRegistry = sources;

function resolveSource(id: string): SourceRef {
  const source = sources[id];
  if (!source) throw new Error(`Fuente desconocida: ${id}`);
  return source;
}

export const carbonFactors: CarbonFactor[] = z.array(carbonSchema).parse(carbonRaw).map((f) => ({
  ...f,
  source: resolveSource(f.sourceId),
}));

export const waterFactors: WaterFactor[] = z.array(waterSchema).parse(waterRaw).map((f) => ({
  ...f,
  source: resolveSource(f.sourceId),
}));

export const carbonById = new Map(carbonFactors.map((f) => [f.id, f]));
export const waterById = new Map(waterFactors.map((f) => [f.id, f]));

// Integridad referencial: fallar al cargar es preferible a calcular con datos huérfanos.
for (const factor of carbonFactors) {
  if (factor.waterFactorId && !waterById.has(factor.waterFactorId)) {
    throw new Error(`Factor de agua inexistente «${factor.waterFactorId}» referenciado por «${factor.id}»`);
  }
  if (factor.byGwp && !factor.byGwp.AR5 && !factor.byGwp.AR6) {
    throw new Error(`Factor «${factor.id}» sin valores GWP utilizables`);
  }
}
for (const [id, factor] of carbonById) {
  if (carbonById.get(id) !== factor) throw new Error(`Factor duplicado: ${id}`);
}

const electricityByCountry: Record<CountryCode, string> = {
  PE: 'elec_pe', US: 'elec_us', GB: 'elec_gb', ES: 'elec_es', MX: 'elec_mx',
  CO: 'elec_co', CL: 'elec_cl', AR: 'elec_ar', BR: 'elec_br', DE: 'elec_de',
  FR: 'elec_fr', EU: 'elec_eu', GLOBAL: 'elec_global',
};

export function electricityFactor(country: CountryCode): CarbonFactor {
  const factor = carbonById.get(electricityByCountry[country] ?? 'elec_global');
  if (!factor) throw new Error(`Sin factor eléctrico para ${country}`);
  return factor;
}

/** Resuelve el valor de un factor según el set de GWP y el tratamiento de RF. */
export function factorValue(factor: CarbonFactor, gwp: GWPSet, rf = false): number {
  const base = factor.byGwp?.[gwp] ?? factor.value;
  return rf && factor.valueRf !== undefined ? factor.valueRf : base;
}

const benchmarkSchema = z.object({
  carbonPerCapita: z.record(z.string(), z.number()),
  waterPerCapita: z.record(z.string(), z.number()),
  carbonSector: z.record(z.string(), z.number()),
  eventPerAttendee: z.number(),
  eventWaterPerAttendee: z.number(),
  source: sourceSchema,
  lastVerified: z.string(),
});

export const benchmarks: BenchmarkSet = benchmarkSchema.parse(benchmarksRaw) as BenchmarkSet;

const stressSchema = z.array(z.object({
  country: countrySchema,
  aware: z.number().positive(),
  wriCategory: z.enum(['Low', 'Low-Medium', 'Medium-High', 'High', 'Extremely High']),
  sourceId: z.string(),
  lastVerified: z.string(),
}));

export const stressEntries: StressEntry[] = stressSchema.parse(stressRaw).map((entry) => ({
  ...entry,
  source: resolveSource(entry.sourceId),
}));
export const stressByCountry = new Map(stressEntries.map((e) => [e.country, e]));

export function waterStress(country: CountryCode): StressEntry {
  return stressByCountry.get(country) ?? stressByCountry.get('GLOBAL')!;
}

const dietSchema = z.object({
  sourceId: z.string(),
  assumption: bilingual,
  profiles: z.array(z.object({
    id: z.string(),
    label: bilingual,
    description: bilingual,
    kgPerYear: z.record(z.string(), z.number()),
  })),
});

export const dietData = dietSchema.parse(dietRaw);
export const dietProfiles = dietData.profiles;

export const FOOD_FACTOR_IDS = [
  'beef', 'lamb', 'pork', 'poultry', 'fish', 'eggs', 'milk', 'cheese',
  'legumes', 'vegetables', 'fruit', 'cereals', 'rice', 'oils', 'sugar', 'coffee', 'chocolate',
] as const;

export function sourceById(id: string): SourceRef {
  return resolveSource(id);
}

export function factorLabel(value: { label: Bilingual }, lang: 'es' | 'en'): string {
  return value.label[lang];
}
