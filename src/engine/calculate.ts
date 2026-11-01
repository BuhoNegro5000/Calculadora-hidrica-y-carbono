import { categoriesByEntity, DETAIL_ORDER, questionsFor } from '../data/questions';
import { dietProfiles, factorValue, waterStress } from './factors';
import { baseCatalog, catalogSnapshots, electricityFactorFrom, type FactorCatalog } from './catalog';
import type {
  CategoryResult, FootprintResult, Project, QuestionDef, ResultLine, Scope,
} from './types';
import { convert, uid } from './units';

const CATEGORY_COLORS = [
  '#1f6f5c', '#b9df3b', '#1e7fa8', '#d99a2b', '#7b8f3a',
  '#6f5bd6', '#c2603f', '#2a9d8f', '#8a6d3b', '#4f7cac',
];

export function visibleQuestions(project: Project): QuestionDef[] {
  const min = DETAIL_ORDER[project.detail];
  return questionsFor(project.entity).filter((question) => DETAIL_ORDER[question.detail] <= min);
}

export function answerOf(project: Project, question: QuestionDef): number | string {
  const value = project.answers[question.id];
  return value === undefined || value === null || value === '' ? question.defaultValue : value;
}

function numericAnswer(project: Project, question: QuestionDef): number {
  const value = Number(answerOf(project, question));
  return Number.isFinite(value) ? value : 0;
}

function resolveFactorId(project: Project, question: QuestionDef, catalog: FactorCatalog): string | undefined {
  if (!question.factorId) return undefined;
  if (question.factorId === '@electricity') return electricityFactorFrom(catalog, project.country).id;
  if (question.factorSwitch) {
    const source = questionsFor(project.entity).find((item) => item.id === question.factorSwitch?.questionId);
    const selected = String(project.answers[question.factorSwitch.questionId] ?? source?.defaultValue ?? '');
    return question.factorSwitch.map[selected];
  }
  return question.factorId;
}

function optionMultiplier(project: Project, question: QuestionDef): number {
  if (!question.multiplierFrom) return 1;
  const source = questionsFor(project.entity).find((item) => item.id === question.multiplierFrom);
  const selected = String(project.answers[question.multiplierFrom] ?? source?.defaultValue ?? '');
  return source?.options?.find((option) => option.value === selected)?.multiplier ?? 1;
}

function categoryLabel(project: Project, categoryId: string): { es: string; en: string } {
  return categoriesByEntity[project.entity]?.find((category) => category.id === categoryId)?.label ?? {
    es: categoryId,
    en: categoryId,
  };
}

function lineFromQuantity(
  project: Project,
  question: QuestionDef,
  quantity: number,
  factorId: string,
  assumptions: string[],
  overrides: Partial<ResultLine> = {},
  catalog: FactorCatalog = baseCatalog,
): ResultLine | null {
  const factor = catalog.carbon.get(factorId);
  if (!factor) return null;
  const record = catalog.records.get(factor.id);
  const factorAmount = convert(quantity, question.unit, factor.unit);
  const multiplier = optionMultiplier(project, question);
  const value = factorValue(factor, project.gwp, project.rf && !!question.supportsRf);
  const scope = (question.scope ?? factor.scope) as Scope;

  let kgLocation = 0;
  let kgMarket: number | undefined;
  if (scope === 2) {
    kgLocation = factorAmount * value * multiplier;
    const marketValue = project.marketElectricityFactor ?? value;
    kgMarket = factorAmount * marketValue * multiplier;
  } else {
    kgLocation = factorAmount * value * multiplier;
  }
  const kgCO2e = scope === 2 && project.scope2Method === 'market' ? (kgMarket ?? kgLocation) : kgLocation;

  const waterFactor = factor.waterFactorId ? catalog.water.get(factor.waterFactorId) : undefined;
  let blue = 0;
  let green = 0;
  let grey = 0;
  if (waterFactor) {
    // El factor de agua comparte la unidad del factor de carbono (validado en carga).
    blue = factorAmount * waterFactor.blue * multiplier;
    green = factorAmount * waterFactor.green * multiplier;
    grey = factorAmount * waterFactor.grey * multiplier;
  }

  return {
    id: uid('line'),
    questionId: question.id,
    category: question.category,
    categoryLabel: categoryLabel(project, question.category),
    label: question.label,
    scope,
    scope3Category: factor.scope3Category,
    quantity,
    unit: question.unit,
    factorId: factor.id,
    factorLabel: factor.label,
    factorValue: value * multiplier,
    factorUnit: factor.unit,
    factorVersion: record?.version ?? 1,
    factorLayer: record?.layer ?? 'base',
    factorChangeReason: record?.changeReason,
    kgCO2e,
    kgCO2eLocation: scope === 2 ? kgLocation : undefined,
    kgCO2eMarket: scope === 2 ? kgMarket : undefined,
    water: { blue, green, grey },
    uncertaintyPct: factor.uncertainty,
    source: factor.source,
    factorYear: factor.year,
    factorStatus: factor.status,
    assumptions,
    waterDirect: question.waterDirect ?? factor.direct,
    waterFactorId: factor.waterFactorId,
    method: scope === 2 ? project.scope2Method : undefined,
    ...overrides,
  };
}

function waterOnlyLine(project: Project, question: QuestionDef, catalog: FactorCatalog): ResultLine | null {
  const waterFactor = question.waterFactorId ? catalog.water.get(question.waterFactorId) : undefined;
  if (!waterFactor) return null;
  const record = catalog.records.get(waterFactor.id);
  const quantity = numericAnswer(project, question);
  const amount = convert(quantity, question.unit, waterFactor.unit);
  return {
    id: uid('line'),
    questionId: question.id,
    category: question.category,
    categoryLabel: categoryLabel(project, question.category),
    label: question.label,
    scope: question.scope,
    quantity,
    unit: question.unit,
    factorId: waterFactor.id,
    factorLabel: waterFactor.label,
    factorValue: 1,
    factorUnit: waterFactor.unit,
    factorVersion: record?.version ?? 1,
    factorLayer: record?.layer ?? 'base',
    factorChangeReason: record?.changeReason,
    kgCO2e: 0,
    kgCO2eLocation: 0,
    kgCO2eMarket: 0,
    water: { blue: amount * waterFactor.blue, green: amount * waterFactor.green, grey: amount * waterFactor.grey },
    uncertaintyPct: waterFactor.uncertainty,
    source: waterFactor.source,
    factorYear: waterFactor.year,
    factorStatus: waterFactor.status,
    assumptions: [],
    waterDirect: true,
    waterFactorId: waterFactor.id,
  };
}

function dietLines(project: Project, catalog: FactorCatalog): ResultLine[] {
  const dietQuestion = questionsFor(project.entity).find((question) => question.kind === 'diet');
  if (!dietQuestion) return [];
  const profileId = String(answerOf(project, dietQuestion));
  const profile = dietProfiles.find((item) => item.id === profileId) ?? dietProfiles.find((item) => item.id === 'medium')!;
  const reduction = Math.min(100, Math.max(0, Number(project.answers.__dietReduction ?? 0))) / 100;
  const lines: ResultLine[] = [];
  for (const [factorId, kg] of Object.entries(profile.kgPerYear)) {
    if (!kg) continue;
    const isMeat = ['beef', 'lamb', 'pork', 'poultry', 'fish'].includes(factorId);
    const quantity = isMeat ? kg * (1 - reduction) : kg;
    const question: QuestionDef = {
      id: `p_diet_${factorId}`,
      entity: 'person',
      category: 'food',
      scope: 3,
      label: { es: `Dieta: ${factorId}`, en: `Diet: ${factorId}` },
      unit: 'kg',
      factorId,
      detail: 'quick',
      defaultValue: 0,
    };
    const line = lineFromQuantity(project, question, quantity, factorId, [
      `Perfil «${profile.label.es}» (${profile.id})`,
      `Consumo anual estimado: ${kg} kg/persona`,
      ...(reduction > 0 && isMeat ? [`Escenario: −${Math.round(reduction * 100)} % en carne y pescado`] : []),
    ], {}, catalog);
    if (line) {
      line.label = { es: `Dieta: ${(catalog.carbon.get(factorId)?.label.es ?? factorId).toLowerCase()}`, en: `Diet: ${(catalog.carbon.get(factorId)?.label.en ?? factorId).toLowerCase()}` };
      lines.push(line);
    }
  }
  return lines;
}

export function calculate(project: Project, catalog: FactorCatalog = baseCatalog): FootprintResult {
  const active = visibleQuestions(project);
  const lines: ResultLine[] = [];
  const assumptions = project.assumptions ?? {};

  for (const question of active) {
    if (question.informational) continue;
    if (question.kind === 'diet') {
      lines.push(...dietLines(project, catalog));
      continue;
    }
    if (question.kind === 'choice') continue;
    if (question.kind === 'text') continue;
    if (question.waterOnly) {
      const line = waterOnlyLine(project, question, catalog);
      if (line) {
        line.assumptions = assumptions[question.id] ? [assumptions[question.id]] : [];
        lines.push(line);
      }
      continue;
    }
    const factorId = resolveFactorId(project, question, catalog);
    if (!factorId) continue;
    const quantity = numericAnswer(project, question);
    if (!Number.isFinite(quantity)) continue;
    const line = lineFromQuantity(project, question, quantity, factorId, assumptions[question.id] ? [assumptions[question.id]] : [], {}, catalog);
    if (line) lines.push(line);
  }

  // Líneas expertas: el consultor elige factor y cantidad; el factor conserva su fuente.
  for (const custom of project.customLines ?? []) {
    const factor = catalog.carbon.get(custom.factorId);
    if (!factor) {
      const waterFactor = catalog.water.get(custom.factorId);
      if (waterFactor) {
        const record = catalog.records.get(waterFactor.id);
        const amount = convert(custom.quantity, custom.unit, waterFactor.unit);
        lines.push({
          id: uid('line'),
          questionId: `custom_${custom.id}`,
          category: custom.scope ? (waterFactor.id.includes('elec') ? 'energy' : 'water') : 'water',
          categoryLabel: { es: 'Agua personalizada', en: 'Custom water' },
          label: custom.label ? { es: custom.label, en: custom.label } : waterFactor.label,
          scope: custom.scope ?? 3,
          quantity: custom.quantity,
          unit: custom.unit,
          factorId: waterFactor.id,
          factorLabel: waterFactor.label,
          factorValue: 1,
          factorUnit: waterFactor.unit,
          factorVersion: record?.version ?? 1,
          factorLayer: record?.layer ?? 'base',
          factorChangeReason: record?.changeReason,
          kgCO2e: 0,
          kgCO2eLocation: 0,
          kgCO2eMarket: 0,
          water: {
            blue: amount * waterFactor.blue,
            green: amount * waterFactor.green,
            grey: amount * waterFactor.grey,
          },
          uncertaintyPct: waterFactor.uncertainty,
          source: waterFactor.source,
          factorYear: waterFactor.year,
          factorStatus: waterFactor.status,
          assumptions: ['Línea de agua añadida manualmente en modo experto'],
          waterDirect: true,
          waterFactorId: waterFactor.id,
        });
      }
      continue;
    }
    const question: QuestionDef = {
      id: `custom_${custom.id}`,
      entity: project.entity,
      category: factor.category,
      scope: custom.scope ?? factor.scope,
      label: custom.label ? { es: custom.label, en: custom.label } : factor.label,
      unit: custom.unit,
      factorId: factor.id,
      detail: 'expert',
      defaultValue: 0,
    };
    const line = lineFromQuantity(project, question, custom.quantity, factor.id, ['Línea añadida manualmente en modo experto'], {}, catalog);
    if (line) lines.push(line);
  }

  const totalKgCO2e = lines.reduce((sum, line) => sum + line.kgCO2e, 0);
  const totalLocation = lines.reduce((sum, line) => sum + (line.kgCO2eLocation ?? line.kgCO2e), 0);
  const totalMarket = lines.reduce((sum, line) => sum + (line.kgCO2eMarket ?? line.kgCO2e), 0);

  const variance = lines.reduce((sum, line) => sum + (line.kgCO2e * line.uncertaintyPct) ** 2, 0);
  const sigma = Math.sqrt(variance);
  const uncertaintyPct = totalKgCO2e > 0 ? sigma / totalKgCO2e : 0;

  const byScope: Record<'1' | '2' | '3', number> = { '1': 0, '2': 0, '3': 0 };
  let scope2Location = 0;
  let scope2Market = 0;
  for (const line of lines) {
    byScope[String(line.scope) as '1' | '2' | '3'] += line.kgCO2e;
    if (line.scope === 2) {
      scope2Location += line.kgCO2eLocation ?? line.kgCO2e;
      scope2Market += line.kgCO2eMarket ?? line.kgCO2e;
    }
  }

  const water = lines.reduce(
    (acc, line) => {
      acc.blue += line.water.blue;
      acc.green += line.water.green;
      acc.grey += line.water.grey;
      if (line.waterDirect) acc.direct += line.water.blue + line.water.green + line.water.grey;
      else acc.indirect += line.water.blue + line.water.green + line.water.grey;
      return acc;
    },
    { blue: 0, green: 0, grey: 0, direct: 0, indirect: 0 },
  );
  const stress = waterStress(project.country);
  const blueScarce = project.waterStress ? water.blue * stress.aware : water.blue;

  const categories = new Map<string, CategoryResult>();
  for (const line of lines) {
    const current = categories.get(line.category) ?? {
      id: line.category,
      label: line.categoryLabel,
      kgCO2e: 0,
      water: { blue: 0, green: 0, grey: 0 },
      percentage: 0,
      color: CATEGORY_COLORS[categories.size % CATEGORY_COLORS.length],
    };
    current.kgCO2e += line.kgCO2e;
    current.water.blue += line.water.blue;
    current.water.green += line.water.green;
    current.water.grey += line.water.grey;
    categories.set(line.category, current);
  }
  const byCategory = [...categories.values()]
    .map((category) => ({ ...category, percentage: totalKgCO2e > 0 ? category.kgCO2e / totalKgCO2e : 0 }))
    .sort((a, b) => b.kgCO2e - a.kgCO2e)
    .map((category, index) => ({ ...category, color: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }));

  const answered = active.filter((question) => question.kind !== 'choice' && project.touched?.includes(question.id)).length;
  const totalQuestions = active.filter((question) => question.kind !== 'choice').length;

  const warnings: FootprintResult['warnings'] = [];
  const pending = lines.filter((line) => line.factorStatus === 'pending').length;
  const screening = lines.filter((line) => line.factorStatus === 'screening').length;
  if (pending > 0) {
    warnings.push({
      id: 'pending',
      severity: 'info',
      text: {
        es: pending === 1
          ? '1 línea usa factores pendientes de verificación. Revisa Transparencia antes de usar el resultado para reporte externo.'
          : `${pending} líneas usan factores pendientes de verificación. Revisa Transparencia antes de usar el resultado para reporte externo.`,
        en: pending === 1
          ? '1 line uses factors pending verification. Check Transparency before using the result for external reporting.'
          : `${pending} lines use factors pending verification. Check Transparency before using the result for external reporting.`,
      },
    });
  }
  if (screening > 0) {
    warnings.push({
      id: 'screening',
      severity: 'info',
      text: {
        es: screening === 1
          ? '1 línea usa factores de screening con incertidumbre alta (gasto, agua virtual o supuestos).'
          : `${screening} líneas usan factores de screening con incertidumbre alta (gasto, agua virtual o supuestos).`,
        en: screening === 1
          ? '1 line uses high-uncertainty screening factors (spend, virtual water or assumptions).'
          : `${screening} lines use high-uncertainty screening factors (spend, virtual water or assumptions).`,
      },
    });
  }
  if (project.scope2Method === 'market' && project.marketElectricityFactor === undefined) {
    warnings.push({
      id: 'market',
      severity: 'warning',
      text: {
        es: 'No hay factor contractual de electricidad: el resultado market-based usa el factor de red. Añade tu factor de proveedor o certificados para un Scope 2 market-based real.',
        en: 'No contractual electricity factor: market-based uses the grid factor. Add your supplier factor or certificates for a real market-based Scope 2.',
      },
    });
  }
  if (project.rf) {
    warnings.push({
      id: 'rf',
      severity: 'info',
      text: {
        es: 'El resultado incluye forzamiento radiativo en aviación (factor RF). No es directamente comparable con inventarios que solo reportan CO₂.',
        en: 'The result includes aviation radiative forcing (RF factor). It is not directly comparable with CO₂-only inventories.',
      },
    });
  }
  if (assumptions && Object.keys(assumptions).length > 0) {
    warnings.push({
      id: 'assumptions',
      severity: 'info',
      text: {
        es: 'Hay valores estimados con la ayuda asistida. Cada supuesto queda registrado en la auditoría y en el exportable.',
        en: 'Some values were estimated with assisted help. Each assumption is recorded in the audit trail and export.',
      },
    });
  }

  const customUsed = lines.filter((line) => line.factorLayer === 'custom');
  if (customUsed.length > 0) {
    const estimated = customUsed.filter((line) => line.factorStatus !== 'verified').length;
    warnings.push({
      id: 'custom-factors',
      severity: estimated > 0 ? 'warning' : 'info',
      text: {
        es: estimated > 0
          ? `${customUsed.length} línea(s) usan factores personalizados; ${estimated} no están verificados. Revisa fuente, año y motivo en la sección Factores antes de reportar.`
          : `${customUsed.length} línea(s) usan factores personalizados. Su fuente, año y motivo se listan en el informe.`,
        en: estimated > 0
          ? `${customUsed.length} line(s) use custom factors; ${estimated} are not verified. Check source, year and reason in the Factors section before reporting.`
          : `${customUsed.length} line(s) use custom factors. Their source, year and reason are listed in the report.`,
      },
    });
  }

  let perUnit: FootprintResult['perUnit'];
  const denominator =
    project.entity === 'company' ? project.employees :
    project.entity === 'event' ? project.attendees :
    project.entity === 'product' ? project.unitsProduced :
    project.householdSize || 1;
  if (denominator > 0) {
    const labels = {
      company: { es: 'por empleado', en: 'per employee' },
      event: { es: 'por asistente', en: 'per attendee' },
      product: { es: 'por unidad', en: 'per unit' },
      person: { es: 'por persona del hogar', en: 'per household member' },
    } as const;
    perUnit = { value: totalKgCO2e / denominator, label: labels[project.entity] };
  }

  return {
    totalKgCO2e,
    totalLocationKgCO2e: totalLocation,
    totalMarketKgCO2e: totalMarket,
    lowKgCO2e: Math.max(0, totalKgCO2e - sigma),
    highKgCO2e: totalKgCO2e + sigma,
    uncertaintyPct,
    byScope,
    scope2: { location: scope2Location, market: scope2Market },
    byCategory,
    water: {
      ...water,
      total: water.blue + water.green + water.grey,
      blueScarce,
    },
    lines,
    factorSnapshot: catalogSnapshots(catalog, lines.flatMap((line) => [
      line.factorId,
      ...(line.waterFactorId ? [line.waterFactorId] : []),
    ])),
    warnings,
    answered,
    totalQuestions,
    completeness: totalQuestions ? Math.min(1, answered / totalQuestions) : 0,
    perUnit,
  };
}

/** Genera una interpretación legible de la línea para la auditoría. */
export function auditSentence(line: ResultLine, lang: 'es' | 'en'): string {
  const quantity = new Intl.NumberFormat(lang === 'es' ? 'es-PE' : 'en-GB', { maximumFractionDigits: 3 }).format(line.quantity);
  const value = new Intl.NumberFormat(lang === 'es' ? 'es-PE' : 'en-GB', { maximumFractionDigits: 4 }).format(line.factorValue);
  const result = new Intl.NumberFormat(lang === 'es' ? 'es-PE' : 'en-GB', { maximumFractionDigits: 3 }).format(line.kgCO2e);
  return lang === 'es'
    ? `${quantity} ${line.unit} × ${value} kg CO₂e/${line.factorUnit} = ${result} kg CO₂e · ${line.source.org} (${line.factorYear})`
    : `${quantity} ${line.unit} × ${value} kg CO₂e/${line.factorUnit} = ${result} kg CO₂e · ${line.source.org} (${line.factorYear})`;
}
