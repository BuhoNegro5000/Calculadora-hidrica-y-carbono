import { DETAIL_ORDER, questionsFor } from '../data/questions';
import type { CountryCode, DetailLevel, EntityType, Project } from './types';
import { uid } from './units';

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function defaultPeriod(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 1);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function answersFor(entity: EntityType, detail: DetailLevel): Record<string, number | string> {
  const min = DETAIL_ORDER[detail];
  const answers: Record<string, number | string> = {};
  for (const question of questionsFor(entity)) {
    if (DETAIL_ORDER[question.detail] <= min) answers[question.id] = question.defaultValue;
  }
  return answers;
}

const NAMES: Record<EntityType, { es: string; en: string }> = {
  person: { es: 'Mi hogar', en: 'My household' },
  company: { es: 'Mi organización', en: 'My organisation' },
  event: { es: 'Mi evento', en: 'My event' },
  product: { es: 'Mi producto', en: 'My product' },
};

export function makeProject(
  entity: EntityType,
  options: Partial<Project> = {},
): Project {
  const period = defaultPeriod();
  return {
    version: 1,
    id: uid('prj'),
    name: options.name ?? NAMES[entity].es,
    entity,
    country: 'PE',
    sector: entity === 'company' ? 'services' : 'other',
    periodStart: period.start,
    periodEnd: period.end,
    baseYear: String(new Date().getFullYear() - 1),
    detail: 'standard',
    boundary: 'operational',
    gwp: 'AR6',
    scope2Method: 'location',
    rf: false,
    waterStress: false,
    householdSize: 1,
    employees: 25,
    attendees: 150,
    areaM2: 300,
    unitsProduced: 1000,
    answers: answersFor(entity, 'standard'),
    touched: [],
    assumptions: {},
    customLines: [],
    plan: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...options,
  };
}

export function setDetail(project: Project, detail: DetailLevel): Project {
  const defaults = answersFor(project.entity, detail);
  const answers = { ...defaults, ...project.answers };
  // Al bajar de nivel se conservan las respuestas previas, pero la UI solo muestra las visibles.
  return { ...project, detail, answers };
}

export function touch(project: Project, questionId: string): Project {
  if (project.touched.includes(questionId)) return project;
  return { ...project, touched: [...project.touched, questionId], updatedAt: new Date().toISOString() };
}

/** Aplica respuestas sin tocar la lista de campos respondidos ni los supuestos. */
export function updateProjectAnswers(project: Project, patch: Record<string, number | string>): Project {
  return {
    ...project,
    answers: { ...project.answers, ...patch },
    updatedAt: new Date().toISOString(),
  };
}

export function projectTitle(project: Project, lang: 'es' | 'en'): string {
  return project.name || NAMES[project.entity][lang];
}

export function projectPeriod(project: Project): string {
  return `${project.periodStart.slice(0, 7)} → ${project.periodEnd.slice(0, 7)}`;
}

export function entityLabel(entity: EntityType, lang: 'es' | 'en'): string {
  const labels: Record<EntityType, { es: string; en: string }> = {
    person: { es: 'Persona u hogar', en: 'Person or household' },
    company: { es: 'Empresa u organización', en: 'Company or organisation' },
    event: { es: 'Evento', en: 'Event' },
    product: { es: 'Producto o servicio', en: 'Product or service' },
  };
  return labels[entity][lang];
}

export const DEFAULT_COUNTRY_BY_LANG: CountryCode = 'PE';
