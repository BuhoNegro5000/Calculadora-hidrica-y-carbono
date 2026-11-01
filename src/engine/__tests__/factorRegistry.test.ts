import { describe, expect, it } from 'vitest';
import { calculate } from '../calculate';
import { makeProject } from '../project';
import { GWP100 } from '../gwp';
import type { Project } from '../types';
import {
  BASE_DATA_VERSION, co2eFromGases, emptyFactorRecord, nextFactorVersion,
  revertFactorVersion, type FactorRecord,
} from '../factorTypes';
import {
  baseRecordById, baseFactorRecords, buildCatalog, baseCatalog, catalogSnapshots, baseUpdatedOverrides,
} from '../catalog';
import {
  createOverride, parseFactorCsv, validateFactor, hasErrors, factorsToCsv,
} from '../factorOps';
import { convert, UnitMismatchError } from '../units';

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

function customFactor(overrides: Partial<FactorRecord> = {}): FactorRecord {
  return emptyFactorRecord({
    id: 'custom_test_energy',
    label: { es: 'Electricidad de prueba', en: 'Test electricity' },
    description: { es: 'Factor de prueba con fuente verificable.', en: 'Test factor with a verifiable source.' },
    category: 'energy',
    scope: 2,
    unit: 'kWh',
    value: 0.5,
    gases: [{ gas: 'CO2', amount: 0.5 }],
    gasDetail: 'breakdown',
    gwpSet: 'AR6',
    country: 'PE',
    dataYear: 2024,
    publicationYear: 2024,
    sourceOrg: 'MINEM',
    sourceTitle: 'Factor de prueba',
    sourceUrl: 'https://example.org/factor',
    license: 'CC BY 4.0',
    downloadedAt: '2026-10-30',
    quality: 'official',
    status: 'verified',
    changeReason: 'Importación de prueba con fuente oficial',
    ...overrides,
  });
}

describe('resolución de prioridad base vs personalizada', () => {
  it('mantiene identificadores únicos entre carbono y agua', () => {
    const ids = baseRecordById.size;
    expect(baseFactorRecords).toHaveLength(ids);
    expect(baseFactorRecords.filter((record) => record.kind === 'carbon').length).toBeGreaterThan(70);
    expect(baseFactorRecords.filter((record) => record.kind === 'water').length).toBeGreaterThan(30);
  });

  it('usa el override personalizado sin modificar el factor base', () => {
    const base = baseRecordById.get('elec_pe');
    expect(base).toBeDefined();
    const originalValue = base!.value;

    const override = createOverride(base!, { value: 0.9 }, {
      reason: 'Ajuste documentado al factor de red peruana',
      user: 'QA',
      role: 'admin',
    });
    const catalog = buildCatalog([override]);

    expect(catalog.records.get('elec_pe')?.value).toBe(0.9);
    expect(catalog.records.get('elec_pe')?.layer).toBe('custom');
    // La capa base permanece intacta.
    expect(baseRecordById.get('elec_pe')?.value).toBe(originalValue);
    expect(catalog.baseRecords.get('elec_pe')?.value).toBe(originalValue);
    expect(baseCatalog.records.get('elec_pe')?.value).toBe(originalValue);
  });

  it('vuelve a la base cuando el override está en la papelera', () => {
    const base = baseRecordById.get('elec_pe')!;
    const override = createOverride(base, { value: 0.9 }, {
      reason: 'Ajuste temporal para probar la papelera',
      user: 'QA',
      role: 'admin',
    });
    const trashed = buildCatalog([{ ...override, deletedAt: new Date().toISOString() }]);
    expect(trashed.records.get('elec_pe')?.value).toBe(base.value);
    expect(trashed.records.get('elec_pe')?.layer).toBe('base');
    expect(trashed.customCount).toBe(0);
  });

  it('detecta overrides creados sobre otra versión del paquete base', () => {
    const base = baseRecordById.get('elec_pe')!;
    const override = createOverride(base, { value: 0.9 }, {
      reason: 'Override sobre versión antigua',
      user: 'QA',
      role: 'admin',
    });
    expect(baseUpdatedOverrides([override])).toHaveLength(0);
    expect(baseUpdatedOverrides([{ ...override, baseVersion: '2025.01' }])).toHaveLength(1);
    expect(baseUpdatedOverrides([{ ...override, baseValue: base.value + 1 }])).toHaveLength(1);
  });
});

describe('conversión de unidades', () => {
  it('convierte energía y masa dentro de la misma dimensión', () => {
    expect(convert(1, 'MWh', 'kWh')).toBeCloseTo(1000, 6);
    expect(convert(2500, 'kWh', 'MWh')).toBeCloseTo(2.5, 6);
    expect(convert(1000, 'kg', 't')).toBeCloseTo(1, 6);
    expect(convert(1, 'm3', 'L')).toBeCloseTo(1000, 6);
    expect(convert(3, 'km', 'km')).toBe(3);
  });

  it('rechaza unidades de dimensiones distintas', () => {
    expect(() => convert(1, 'kWh', 'kg')).toThrow(UnitMismatchError);
    expect(() => convert(1, 'km', 'm3')).toThrow(UnitMismatchError);
  });
});

describe('CO₂e por gas y GWP', () => {
  it('suma Σ(gas × GWP) con el set declarado', () => {
    const gases = [
      { gas: 'CO2', amount: 2 },
      { gas: 'CH4', amount: 1 },
      { gas: 'N2O', amount: 0.5 },
    ];
    const ar6 = co2eFromGases(gases, 'AR6');
    const ar5 = co2eFromGases(gases, 'AR5');
    expect(ar6).toBeCloseTo(2 + GWP100.AR6.CH4 + 0.5 * GWP100.AR6.N2O, 6);
    expect(ar5).toBeCloseTo(2 + GWP100.AR5.CH4 + 0.5 * GWP100.AR5.N2O, 6);
    expect(ar6).not.toBeCloseTo(ar5, 3);
  });

  it('respeta un GWP explícito del factor por encima del set', () => {
    const total = co2eFromGases([{ gas: 'CH4', amount: 1, gwp: 30 }], 'AR6');
    expect(total).toBe(30);
  });

  it('marca error si el CO₂e declarado no coincide con la suma de gases', () => {
    const record = customFactor({ value: 1 });
    const issues = validateFactor(record, { all: [] });
    expect(hasErrors(issues)).toBe(true);
    expect(issues.some((item) => item.code === 'co2e-mismatch')).toBe(true);
  });
});

describe('importación con vista previa y errores', () => {
  it('rechaza un CSV sin las columnas obligatorias', () => {
    const parsed = parseFactorCsv('kind;label_es;value\ncarbon;Prueba;0,5\n');
    expect(parsed.records).toHaveLength(0);
    expect(parsed.errors[0]?.field).toBe('headers');
    expect(parsed.errors[0]?.row).toBe(0);
  });

  it('acepta una fila válida y bloquea la fila con valor negativo', () => {
    const csv = factorsToCsv([
      customFactor({ id: 'custom_csv_ok' }),
      customFactor({ id: 'custom_csv_bad', value: -1, gases: [{ gas: 'CO2', amount: -1 }] }),
    ]);
    const parsed = parseFactorCsv(csv);
    expect(parsed.records.map((record) => record.id)).toEqual(['custom_csv_ok']);
    expect(parsed.errors.length).toBeGreaterThan(0);
    expect(parsed.errors.every((item) => item.row >= 2)).toBe(true);
    expect(parsed.errors.some((item) => item.field === 'value')).toBe(true);
  });

  it('rechaza importaciones sin fuente ni motivo', () => {
    const csv = factorsToCsv([
      customFactor({ id: 'custom_no_source', sourceOrg: '', sourceTitle: '', changeReason: '' }),
    ]);
    const parsed = parseFactorCsv(csv);
    expect(parsed.records).toHaveLength(0);
    const fields = parsed.errors.map((item) => item.field);
    expect(fields).toContain('sourceOrg');
    expect(fields).toContain('sourceTitle');
    expect(fields).toContain('changeReason');
  });

  it('rechaza unidades, países y calidades no soportadas', () => {
    const csv = factorsToCsv([
      customFactor({
        id: 'custom_bad_enums',
        unit: 'banana' as FactorRecord['unit'],
        country: 'ZZ' as FactorRecord['country'],
        quality: 'informal' as FactorRecord['quality'],
      }),
    ]);
    const parsed = parseFactorCsv(csv);
    expect(parsed.records).toHaveLength(0);
    const fields = parsed.errors.map((item) => item.field);
    expect(fields).toContain('unit');
    expect(fields).toContain('country');
    expect(fields).toContain('quality');
  });
});

describe('versionado y reversión de factores personalizados', () => {
  it('crea una versión nueva al editar sin borrar la anterior', () => {
    const v1 = customFactor();
    const v2 = nextFactorVersion(v1, { value: 0.7, gases: [{ gas: 'CO2', amount: 0.7 }] }, {
      reason: 'Actualización del factor de red',
      user: 'QA',
      at: '2026-10-30T10:00:00.000Z',
    });

    expect(v2.version).toBe(2);
    expect(v2.value).toBe(0.7);
    expect(v2.history).toHaveLength(1);
    expect(v2.history?.[0]?.value).toBe(0.5);
    expect(v1.value).toBe(0.5);
    expect(v1.history).toHaveLength(0);
  });

  it('revierte a una versión anterior creando otra versión', () => {
    const v1 = customFactor();
    const v2 = nextFactorVersion(v1, { value: 0.7, gases: [{ gas: 'CO2', amount: 0.7 }] }, {
      reason: 'Subida documentada',
      user: 'QA',
    });
    const v3 = revertFactorVersion(v2, 1, {
      reason: 'Se restaura el valor publicado originalmente',
      user: 'QA',
    });

    expect(v3.version).toBe(3);
    expect(v3.value).toBe(0.5);
    expect(v3.history).toHaveLength(2);
    expect(v3.history?.map((entry) => entry.version)).toEqual([1, 2]);
    // La historia conserva el valor de la v2.
    expect(v3.history?.[1]?.value).toBe(0.7);
    expect(v3.changeReason).toContain('restaura');
  });

  it('falla si se intenta revertir a una versión inexistente', () => {
    const v1 = customFactor();
    expect(() => revertFactorVersion(v1, 9, { reason: 'Intento inválido', user: 'QA' }))
      .toThrow(/v9/);
  });
});

describe('snapshots de cálculo', () => {
  it('congela id, versión, capa y valor del factor usado', () => {
    const project = company({ country: 'PE' });
    project.answers.c_electricity = 1000;

    const base = baseRecordById.get('elec_pe')!;
    const override = createOverride(base, { value: 0.9 }, {
      reason: 'Factor ajustado para la prueba de snapshot',
      user: 'QA',
      role: 'admin',
    });
    const catalog = buildCatalog([override]);
    const result = calculate(project, catalog);

    expect(result.totalKgCO2e).toBeCloseTo(900, 6);
    const line = result.lines.find((item) => item.factorId === 'elec_pe');
    expect(line?.factorVersion).toBe(1);
    expect(line?.factorLayer).toBe('custom');
    expect(line?.factorChangeReason).toContain('snapshot');

    const snapshot = result.factorSnapshot.find((item) => item.id === 'elec_pe');
    expect(snapshot).toBeDefined();
    expect(snapshot?.value).toBe(0.9);
    expect(snapshot?.layer).toBe('custom');
    expect(snapshot?.version).toBe(1);
    expect(BASE_DATA_VERSION).toBeTruthy();
  });

  it('un resultado antiguo no cambia cuando el catálogo evoluciona', () => {
    const project = company({ country: 'PE' });
    project.answers.c_electricity = 1000;

    const base = baseRecordById.get('elec_pe')!;
    const v1 = createOverride(base, { value: 0.9 }, {
      reason: 'Primera versión del override eléctrico',
      user: 'QA',
      role: 'admin',
    });
    const oldResult = calculate(project, buildCatalog([v1]));

    const v2 = nextFactorVersion(v1, { value: 1.2 }, {
      reason: 'Segunda versión del override eléctrico',
      user: 'QA',
    });
    const newResult = calculate(project, buildCatalog([v2]));

    expect(oldResult.totalKgCO2e).toBeCloseTo(900, 6);
    expect(newResult.totalKgCO2e).toBeCloseTo(1200, 6);
    expect(oldResult.factorSnapshot.find((item) => item.id === 'elec_pe')?.value).toBe(0.9);
    expect(newResult.factorSnapshot.find((item) => item.id === 'elec_pe')?.value).toBe(1.2);
    expect(newResult.factorSnapshot.find((item) => item.id === 'elec_pe')?.version).toBe(2);
  });

  it('advierte cuando el cálculo usa factores personalizados', () => {
    const project = company({ country: 'PE' });
    project.answers.c_electricity = 100;
    const base = baseRecordById.get('elec_pe')!;
    const override = createOverride(base, { value: 0.9 }, {
      reason: 'Ajuste para comprobar el aviso de informe',
      user: 'QA',
      role: 'admin',
    });
    const result = calculate(project, buildCatalog([override]));
    const warning = result.warnings.find((item) => item.id === 'custom-factors');
    expect(warning).toBeDefined();
    expect(warning?.text.es).toContain('factores personalizados');
  });

  it('los snapshots ignoran ids inexistentes', () => {
    const snapshots = catalogSnapshots(baseCatalog, ['elec_pe', 'no_existe']);
    expect(snapshots.map((item) => item.id)).toEqual(['elec_pe']);
  });
});
