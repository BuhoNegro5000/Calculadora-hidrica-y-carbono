import { benchmarks } from './factors';
import type { CountryCode, FootprintResult, Project } from './types';

export const COUNTRIES: { code: CountryCode; label: { es: string; en: string } }[] = [
  { code: 'PE', label: { es: 'Perú', en: 'Peru' } },
  { code: 'MX', label: { es: 'México', en: 'Mexico' } },
  { code: 'CO', label: { es: 'Colombia', en: 'Colombia' } },
  { code: 'CL', label: { es: 'Chile', en: 'Chile' } },
  { code: 'AR', label: { es: 'Argentina', en: 'Argentina' } },
  { code: 'BR', label: { es: 'Brasil', en: 'Brazil' } },
  { code: 'ES', label: { es: 'España', en: 'Spain' } },
  { code: 'US', label: { es: 'Estados Unidos', en: 'United States' } },
  { code: 'GB', label: { es: 'Reino Unido', en: 'United Kingdom' } },
  { code: 'DE', label: { es: 'Alemania', en: 'Germany' } },
  { code: 'FR', label: { es: 'Francia', en: 'France' } },
  { code: 'EU', label: { es: 'Unión Europea', en: 'European Union' } },
  { code: 'GLOBAL', label: { es: 'Promedio mundial', en: 'World average' } },
];

export const SECTORS = [
  { id: 'services', label: { es: 'Servicios profesionales', en: 'Professional services' } },
  { id: 'technology', label: { es: 'Tecnología y software', en: 'Technology and software' } },
  { id: 'retail', label: { es: 'Comercio y retail', en: 'Retail' } },
  { id: 'manufacturing', label: { es: 'Manufactura', en: 'Manufacturing' } },
  { id: 'food', label: { es: 'Alimentos y bebidas', en: 'Food and beverage' } },
  { id: 'hospitality', label: { es: 'Turismo y hospitalidad', en: 'Hospitality and tourism' } },
  { id: 'education', label: { es: 'Educación', en: 'Education' } },
  { id: 'health', label: { es: 'Salud', en: 'Health' } },
  { id: 'construction', label: { es: 'Construcción', en: 'Construction' } },
  { id: 'logistics', label: { es: 'Logística y transporte', en: 'Logistics and transport' } },
  { id: 'energy', label: { es: 'Energía y utilities', en: 'Energy and utilities' } },
  { id: 'public', label: { es: 'Sector público', en: 'Public sector' } },
  { id: 'ngo', label: { es: 'ONG y fundaciones', en: 'NGO and foundations' } },
  { id: 'other', label: { es: 'Otro', en: 'Other' } },
];

export function countryLabel(code: CountryCode, lang: 'es' | 'en'): string {
  return COUNTRIES.find((country) => country.code === code)?.label[lang] ?? code;
}

export function sectorLabel(id: string, lang: 'es' | 'en'): string {
  return SECTORS.find((sector) => sector.id === id)?.label[lang] ?? id;
}

export function benchmarkCarbon(project: Project): { value: number; label: { es: string; en: string }; source: string } {
  if (project.entity === 'person') {
    return {
      value: (benchmarks.carbonPerCapita[project.country] ?? benchmarks.carbonPerCapita.GLOBAL) * (project.householdSize || 1),
      label: {
        es: `Promedio de ${countryLabel(project.country, 'es')} para un hogar de ${project.householdSize || 1}`,
        en: `${countryLabel(project.country, 'en')} average for a ${project.householdSize || 1}-person household`,
      },
      source: `${benchmarks.source.org} (${benchmarks.source.year})`,
    };
  }
  if (project.entity === 'company') {
    const perEmployee = benchmarks.carbonSector[project.sector] ?? benchmarks.carbonSector.other;
    return {
      value: perEmployee * (project.employees || 1),
      label: {
        es: `Referencia sectorial: ${sectorLabel(project.sector, 'es')} (${perEmployee} t/empleado/año)`,
        en: `Sector reference: ${sectorLabel(project.sector, 'en')} (${perEmployee} t/employee/year)`,
      },
      source: benchmarks.source.org,
    };
  }
  if (project.entity === 'event') {
    return {
      value: benchmarks.eventPerAttendee * (project.attendees || 1),
      label: {
        es: `Referencia de eventos: ${benchmarks.eventPerAttendee} kg CO₂e por asistente`,
        en: `Event reference: ${benchmarks.eventPerAttendee} kg CO₂e per attendee`,
      },
      source: benchmarks.source.org,
    };
  }
  return { value: 0, label: { es: 'Sin benchmark específico de producto', en: 'No product-specific benchmark' }, source: benchmarks.source.org };
}

export function benchmarkWater(project: Project): { value: number; label: { es: string; en: string }; source: string } {
  if (project.entity === 'person') {
    return {
      value: (benchmarks.waterPerCapita[project.country] ?? benchmarks.waterPerCapita.GLOBAL) * (project.householdSize || 1),
      label: {
        es: `Huella hídrica de consumo de ${countryLabel(project.country, 'es')} (${benchmarks.waterPerCapita[project.country] ?? benchmarks.waterPerCapita.GLOBAL} m³/persona/año)`,
        en: `${countryLabel(project.country, 'en')} consumption water footprint (${benchmarks.waterPerCapita[project.country] ?? benchmarks.waterPerCapita.GLOBAL} m³/person/year)`,
      },
      source: 'Water Footprint Network',
    };
  }
  if (project.entity === 'company') {
    return {
      value: 120 * (project.employees || 1),
      label: {
        es: 'Referencia de screening: 120 m³ por empleado y año',
        en: 'Screening reference: 120 m³ per employee per year',
      },
      source: 'Water Footprint Network / ANA',
    };
  }
  if (project.entity === 'event') {
    return {
      value: benchmarks.eventWaterPerAttendee * (project.attendees || 1),
      label: {
        es: `Referencia de eventos: ${benchmarks.eventWaterPerAttendee} m³ por asistente`,
        en: `Event reference: ${benchmarks.eventWaterPerAttendee} m³ per attendee`,
      },
      source: 'Water Footprint Network',
    };
  }
  return { value: 0, label: { es: 'Sin benchmark específico de producto', en: 'No product-specific benchmark' }, source: '—' };
}

export type Semaphore = 'low' | 'medium' | 'high';

export function semaphore(ratio: number): Semaphore {
  if (!Number.isFinite(ratio) || ratio <= 0) return 'low';
  if (ratio <= 0.75) return 'low';
  if (ratio <= 1.25) return 'medium';
  return 'high';
}

export function woodEquivalentTrees(kg: number): number {
  // Captura aproximada de un árbol urbano maduro: 21 kg CO2e/año (US EPA).
  return kg / 21;
}

export function flightEquivalent(kg: number): number {
  // Lima–Madrid ida y vuelta ≈ 20.000 pkm × 0,09 kg/pkm ≈ 1.800 kg.
  return kg / 1800;
}

export function carKmEquivalent(kg: number): number {
  return kg / 0.17;
}

export function poolsEquivalent(m3: number): number {
  return m3 / 2500;
}

export function bottlesEquivalent(m3: number): number {
  return (m3 * 1000) / 0.5;
}

export function peopleWaterEquivalent(m3: number, country: CountryCode): number {
  return m3 / (benchmarks.waterPerCapita[country] ?? benchmarks.waterPerCapita.GLOBAL);
}

export function formatTonnes(kg: number, lang: 'es' | 'en'): string {
  const value = kg / 1000;
  return new Intl.NumberFormat(lang === 'es' ? 'es-PE' : 'en-GB', {
    maximumFractionDigits: value >= 100 ? 0 : value >= 10 ? 1 : 2,
  }).format(value);
}

export function formatWater(m3: number, lang: 'es' | 'en'): string {
  return new Intl.NumberFormat(lang === 'es' ? 'es-PE' : 'en-GB', {
    maximumFractionDigits: m3 >= 100 ? 0 : m3 >= 10 ? 1 : 2,
  }).format(m3);
}

export function resultComparison(project: Project, result: FootprintResult) {
  const carbon = benchmarkCarbon(project);
  const water = benchmarkWater(project);
  return {
    carbon: { ...carbon, ratio: carbon.value > 0 ? result.totalKgCO2e / carbon.value : 0 },
    water: { ...water, ratio: water.value > 0 ? result.water.total / water.value : 0 },
    carbonSemaphore: semaphore(carbon.value > 0 ? result.totalKgCO2e / carbon.value : 0),
    waterSemaphore: semaphore(water.value > 0 ? result.water.total / water.value : 0),
  };
}
