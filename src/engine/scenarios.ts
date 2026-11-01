import { visibleQuestions } from './calculate';
import type { FootprintResult, Project, ScenarioLever, ScenarioValues } from './types';

export const initialScenario: ScenarioValues = {
  energy: 0,
  mobility: 0,
  flights: 0,
  diet: 0,
  waste: 0,
  hotels: 0,
  purchases: 0,
};

export const LEVERS: ScenarioLever[] = [
  {
    id: 'energy',
    label: { es: 'Energía', en: 'Energy' },
    description: { es: 'Electricidad y gas de la vivienda, sede o planta.', en: 'Household, venue or plant electricity and gas.' },
    fieldIds: ['p_electricity', 'p_gas', 'c_electricity', 'c_gas', 'e_electricity', 'e_gas', 'pr_electricity', 'pr_gas'],
    defaultPct: 20,
    maxPct: 80,
    color: '#b9df3b',
  },
  {
    id: 'mobility',
    label: { es: 'Movilidad', en: 'Mobility' },
    description: { es: 'Menos kilómetros en coche, moto o flota; más transporte público.', en: 'Fewer car, motorcycle or fleet kilometres; more public transport.' },
    fieldIds: ['p_car_km', 'p_transit_km', 'p_taxi_km', 'p_moto_km', 'c_commute_car', 'c_commute_public', 'c_diesel', 'c_petrol', 'e_car_km', 'pr_truck'],
    defaultPct: 15,
    maxPct: 70,
    color: '#1e7fa8',
  },
  {
    id: 'flights',
    label: { es: 'Vuelos', en: 'Flights' },
    description: { es: 'Sustituir o acortar vuelos de negocio y personales.', en: 'Replace or shorten business and personal flights.' },
    fieldIds: ['p_flight_short', 'p_flight_long', 'c_flight_short', 'c_flight_long', 'e_flight_pkm'],
    defaultPct: 30,
    maxPct: 100,
    color: '#6f5bd6',
  },
  {
    id: 'diet',
    label: { es: 'Alimentación', en: 'Food' },
    description: { es: 'Menos carne y pescado; menús plant-forward en eventos.', en: 'Less meat and fish; plant-forward event menus.' },
    fieldIds: ['p_diet', 'e_meals_standard'],
    defaultPct: 20,
    maxPct: 80,
    color: '#d99a2b',
  },
  {
    id: 'waste',
    label: { es: 'Residuos', en: 'Waste' },
    description: { es: 'Prevención, separación y compostaje.', en: 'Prevention, separation and composting.' },
    fieldIds: ['p_waste', 'c_waste', 'e_waste', 'pr_eol'],
    defaultPct: 25,
    maxPct: 80,
    color: '#c2603f',
  },
  {
    id: 'hotels',
    label: { es: 'Alojamiento', en: 'Accommodation' },
    description: { es: 'Menos noches y hoteles con mejor desempeño.', en: 'Fewer nights and better-performing hotels.' },
    fieldIds: ['p_hotel', 'c_hotel', 'e_hotel'],
    defaultPct: 15,
    maxPct: 60,
    color: '#2a9d8f',
  },
  {
    id: 'purchases',
    label: { es: 'Compras', en: 'Purchases' },
    description: { es: 'Menos compras, más reparación y proveedores con datos.', en: 'Fewer purchases, more repair and suppliers with data.' },
    fieldIds: ['p_clothing', 'p_electronics', 'p_paper', 'c_paper', 'c_services', 'c_it', 'c_furniture'],
    defaultPct: 15,
    maxPct: 60,
    color: '#8a6d3b',
  },
];

export function availableLevers(project: Project): ScenarioLever[] {
  const visible = new Set(visibleQuestions(project).map((question) => question.id));
  return LEVERS.filter((lever) => lever.fieldIds.some((id) => visible.has(id)));
}

function reduceField(answers: Record<string, number | string>, id: string, pct: number) {
  const value = Number(answers[id] ?? 0);
  if (!Number.isFinite(value)) return;
  answers[id] = Math.max(0, value * (1 - pct / 100));
}

export function applyScenario(project: Project, values: ScenarioValues): Project {
  const answers = { ...project.answers };
  const leverById = new Map(LEVERS.map((lever) => [lever.id, lever]));

  for (const [key, pct] of Object.entries(values) as [keyof ScenarioValues, number][]) {
    if (!pct) continue;
    const lever = leverById.get(key);
    if (!lever) continue;
    for (const field of lever.fieldIds) {
      if (field === 'p_diet' || field === 'e_meals_standard') continue;
      reduceField(answers, field, pct);
    }
    if (key === 'diet') {
      answers.__dietReduction = pct;
      if (project.entity === 'event') {
        const standard = Number(answers.e_meals_standard ?? 0);
        const veg = Number(answers.e_meals_veg ?? 0);
        const moved = standard * (pct / 100);
        answers.e_meals_standard = standard - moved;
        answers.e_meals_veg = veg + moved;
      }
    }
  }
  return { ...project, answers };
}

export function scenarioSummary(current: FootprintResult, scenario: FootprintResult) {
  const reductionKg = Math.max(0, current.totalKgCO2e - scenario.totalKgCO2e);
  const reductionWater = Math.max(0, current.water.total - scenario.water.total);
  return {
    reductionKg,
    reductionPct: current.totalKgCO2e > 0 ? (reductionKg / current.totalKgCO2e) * 100 : 0,
    reductionWater,
    reductionWaterPct: current.water.total > 0 ? (reductionWater / current.water.total) * 100 : 0,
    scenario,
  };
}

export function residualAfterActions(result: FootprintResult, actionsPct: number[]): number {
  const totalPct = Math.min(95, actionsPct.reduce((sum, pct) => sum + pct, 0));
  return result.totalKgCO2e * (1 - totalPct / 100);
}

export const TARGET_YEARS = [2030, 2040, 2050] as const;
export const SBTI_ANNUAL_LINEAR = 4.2;

export interface TrajectoryPoint {
  year: number;
  baseline: number;
  target: number;
  scenario: number;
}

export function buildTrajectory(
  currentKg: number,
  scenarioKg: number,
  targetYear: number,
  startYear: number,
): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = [];
  const horizon = Math.max(targetYear, startYear + 1);
  const years = horizon - startYear;
  const scenarioAnnual = years > 0 ? Math.pow(Math.max(0.05, scenarioKg / Math.max(currentKg, 1)), 1 / years) : 1;
  for (let year = startYear; year <= horizon; year += 1) {
    const t = year - startYear;
    const target = currentKg * (1 - 0.9 * (t / Math.max(1, years)));
    const scenario = currentKg * Math.pow(scenarioAnnual, t);
    points.push({ year, baseline: currentKg, target: Math.max(0, target), scenario: Math.max(0, scenario) });
  }
  return points;
}

export function requiredAnnualReductionPct(currentKg: number, targetYear: number, startYear: number): number {
  const years = Math.max(1, targetYear - startYear);
  return (1 - Math.pow(0.1, 1 / years)) * 100;
}
