import { describe, expect, it } from 'vitest';
import { calculate } from '../calculate';
import { makeProject } from '../project';
import { applyScenario, initialScenario, scenarioSummary } from '../scenarios';
import type { Project } from '../types';

function zeroAnswers(project: Project): Project {
  return {
    ...project,
    answers: Object.fromEntries(
      Object.entries(project.answers).map(([key, value]) => [key, typeof value === 'number' ? 0 : value]),
    ),
    customLines: [],
    assumptions: {},
    touched: [],
  };
}

function company(overrides: Partial<Project> = {}): Project {
  return zeroAnswers(makeProject('company', { detail: 'quick', ...overrides }));
}

describe('motor de carbono', () => {
  it('calcula electricidad de red peruana con el factor documentado', () => {
    const project = company({ country: 'PE' });
    project.answers.c_electricity = 1000;
    const result = calculate(project);
    expect(result.totalKgCO2e).toBeCloseTo(430, 6);
    expect(result.byScope['2']).toBeCloseTo(430, 6);
    expect(result.water.blue).toBeCloseTo(1.2, 5);
  });

  it('calcula la combustión de diésel con el factor DEFRA 2025', () => {
    const project = company();
    project.answers.c_diesel = 100;
    const result = calculate(project);
    expect(result.totalKgCO2e).toBeCloseTo(257.082, 6);
    expect(result.byScope['1']).toBeCloseTo(257.082, 6);
  });

  it('separa Scope 2 location-based y market-based y no los suma', () => {
    const project = company({ scope2Method: 'market', marketElectricityFactor: 0 });
    project.answers.c_electricity = 1000;
    const result = calculate(project);
    expect(result.totalKgCO2e).toBeCloseTo(0, 6);
    expect(result.scope2.location).toBeCloseTo(430, 6);
    expect(result.scope2.market).toBeCloseTo(0, 6);
    expect(result.totalLocationKgCO2e).toBeCloseTo(430, 6);
  });

  it('aplica el multiplicador de clase y el forzamiento radiativo de aviación', () => {
    const project = makeProject('person', { detail: 'quick' });
    project.answers.p_flight_long = 10000;
    project.answers.p_flight_class = 'economy';
    project.answers.p_flight_short = 0;
    project.answers.p_car_km = 0;
    project.answers.p_electricity = 0;
    project.answers.p_gas = 0;
    project.answers.p_transit_km = 0;
    project.answers.p_water = 0;
    project.answers.p_waste = 0;
    project.answers.p_digital = 0;
    project.answers.p_car_fuel = 'none';
    const withoutRf = calculate(project);
    const line = withoutRf.lines.find((item) => item.questionId === 'p_flight_long')!;
    expect(line.kgCO2e).toBeCloseTo(10000 * 0.09043 * 0.766, 4);

    const withRf = calculate({ ...project, rf: true });
    const lineRf = withRf.lines.find((item) => item.questionId === 'p_flight_long')!;
    expect(lineRf.kgCO2e).toBeCloseTo(10000 * 0.15282 * 0.766, 4);
  });

  it('calcula agua azul, verde y gris de la carne y su suma WFN', () => {
    const project = company();
    project.customLines = [{ id: 'x', factorId: 'beef', quantity: 1, unit: 'kg' }];
    const result = calculate(project);
    expect(result.totalKgCO2e).toBeCloseTo(60, 6);
    expect(result.water.blue).toBeCloseTo(0.55, 6);
    expect(result.water.green).toBeCloseTo(14.193, 6);
    expect(result.water.grey).toBeCloseTo(0.672, 6);
    expect(result.water.total).toBeCloseTo(15.415, 6);
  });

  it('cambia el GWP de refrigerantes entre AR5 y AR6', () => {
    const base = company();
    base.customLines = [{ id: 'r', factorId: 'refrigerant_r410a', quantity: 1, unit: 'kg' }];
    const ar5 = calculate({ ...base, gwp: 'AR5' });
    const ar6 = calculate({ ...base, gwp: 'AR6' });
    expect(ar5.totalKgCO2e).toBe(2088);
    expect(ar6.totalKgCO2e).toBe(2256);
  });

  it('propaga incertidumbre por cuadratura y devuelve un rango', () => {
    const project = company();
    project.answers.c_diesel = 100;
    const result = calculate(project);
    const sigma = 257.082 * 0.03;
    expect(result.lowKgCO2e).toBeCloseTo(257.082 - sigma, 4);
    expect(result.highKgCO2e).toBeCloseTo(257.082 + sigma, 4);
  });

  it('rechaza unidades incompatibles en vez de calcular silenciosamente', () => {
    const project = company();
    project.customLines = [{ id: 'bad', factorId: 'elec_pe', quantity: 10, unit: 'kg' }];
    expect(() => calculate(project)).toThrow(/Unidades incompatibles/);
  });

  it('pondera el agua azul por escasez solo cuando se activa', () => {
    const project = company({ country: 'PE', waterStress: false });
    project.customLines = [{ id: 'w', factorId: 'beef', quantity: 1, unit: 'kg' }];
    const normal = calculate(project);
    const weighted = calculate({ ...project, waterStress: true });
    expect(normal.water.blueScarce).toBeCloseTo(0.55, 6);
    expect(weighted.water.blueScarce).toBeCloseTo(0.55 * 2.2, 6);
    expect(weighted.water.blue).toBeCloseTo(normal.water.blue, 6);
  });

  it('suma agua directa y virtual en totales separados', () => {
    const project = company();
    project.answers.c_water = 100;
    project.customLines = [{ id: 'beef', factorId: 'beef', quantity: 1, unit: 'kg' }];
    const result = calculate(project);
    expect(result.water.direct).toBeCloseTo(120, 6);
    expect(result.water.indirect).toBeCloseTo(15.415, 6);
  });

  it('advierte si se elige market-based sin instrumento contractual', () => {
    const project = company({ scope2Method: 'market' });
    project.answers.c_electricity = 1;
    const result = calculate(project);
    expect(result.warnings.some((warning) => warning.id === 'market')).toBe(true);
  });

  it('un escenario de reducción baja vuelos y energía de forma consistente', () => {
    const project = makeProject('person', { detail: 'quick' });
    project.answers.p_flight_long = 20000;
    project.answers.p_electricity = 3000;
    const base = calculate(project);
    const scenario = applyScenario(project, { ...initialScenario, flights: 50, energy: 20 });
    const summary = scenarioSummary(base, calculate(scenario));
    expect(summary.reductionKg).toBeGreaterThan(0);
    expect(summary.reductionPct).toBeGreaterThan(0);
    expect(summary.scenario.totalKgCO2e).toBeLessThan(base.totalKgCO2e);
  });
});
