import type { GWPSet } from './types';

/**
 * Potenciales de calentamiento global a 100 años.
 * AR5: IPCC Fifth Assessment Report (2014), Tabla 8.7.
 * AR6: IPCC Sixth Assessment Report (2021), Tabla 7.15 / 7.SM.7.
 * Los valores de mezclas (R-410A) son los publicados por IPCC/Defra para el blend.
 */
export const GWP100: Record<GWPSet, Record<string, number>> = {
  AR5: {
    CO2: 1,
    CH4: 28,
    N2O: 265,
    'HFC-32': 677,
    'HFC-134a': 1300,
    'HFC-410A': 2088,
    'HCFC-22': 1810,
    SF6: 23500,
    NF3: 16100,
  },
  AR6: {
    CO2: 1,
    CH4: 29.8, // combustibles fósiles; 27,0 para CH4 no fósil
    N2O: 273,
    'HFC-32': 771,
    'HFC-134a': 1530,
    'HFC-410A': 2256,
    'HCFC-22': 1960,
    SF6: 25200,
    NF3: 17400,
  },
};

export function gwpFor(gas: string, set: GWPSet): number {
  const value = GWP100[set][gas];
  if (value === undefined) throw new Error(`Gas sin GWP documentado: ${gas}`);
  return value;
}

export const GWP_META: Record<GWPSet, { label: string; source: string; year: number; url: string }> = {
  AR5: {
    label: 'IPCC AR5 (2014)',
    source: 'IPCC Fifth Assessment Report, WG1, Chapter 8',
    year: 2014,
    url: 'https://www.ipcc.ch/report/ar5/wg1/',
  },
  AR6: {
    label: 'IPCC AR6 (2021)',
    source: 'IPCC Sixth Assessment Report, WG1, Chapter 7',
    year: 2021,
    url: 'https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-7/',
  },
};
