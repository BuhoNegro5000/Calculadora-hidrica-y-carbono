/**
 * Dominio de Green Owl Labs.
 * Estas interfaces son la frontera entre los datos, el motor y la interfaz.
 * Ningún factor ambiental vive en la UI: todos llegan desde /src/data.
 */

export type EntityType = 'person' | 'company' | 'event' | 'product';
export type DetailLevel = 'quick' | 'standard' | 'expert';
export type Scope = 1 | 2 | 3;
export type GWPSet = 'AR5' | 'AR6';
export type Scope2Method = 'location' | 'market';
export type Boundary = 'operational' | 'financial' | 'equity';
export type Lang = 'es' | 'en';
export type CountryCode =
  | 'PE' | 'US' | 'GB' | 'ES' | 'MX' | 'CO' | 'CL' | 'AR' | 'BR' | 'DE' | 'FR' | 'EU' | 'GLOBAL';

export type UnitCode =
  | 'kWh' | 'MWh' | 'L' | 'm3' | 'kg' | 't' | 'km' | 'pkm' | 'tkm'
  | 'night' | 'meal' | 'unit' | 'USD' | 'GB' | 'hour' | 'year' | 'm2';

export type Bilingual = { es: string; en: string };
export type Status = 'verified' | 'pending' | 'screening';

export interface SourceRef {
  org: string;
  title: string;
  year: number;
  url: string;
}

export interface CarbonFactor {
  id: string;
  label: Bilingual;
  category: string;
  scope: Scope;
  scope3Category?: number;
  unit: UnitCode;
  value: number;
  /** Valor alternativo por set de GWP (refrigerantes y gases). */
  byGwp?: Partial<Record<GWPSet, number>>;
  /** Factor con forzamiento radiativo incluido (aviación). */
  valueRf?: number;
  uncertainty: number;
  sourceId: string;
  source: SourceRef;
  country: CountryCode | 'GLOBAL';
  year: number;
  lastVerified: string;
  status: Status;
  waterFactorId?: string;
  notes?: Bilingual;
  direct?: boolean;
}

export interface WaterFactor {
  id: string;
  label: Bilingual;
  unit: UnitCode;
  blue: number;
  green: number;
  grey: number;
  uncertainty: number;
  sourceId: string;
  source: SourceRef;
  country: CountryCode | 'GLOBAL';
  year: number;
  lastVerified: string;
  status: Status;
  direct?: boolean;
  notes?: Bilingual;
}

export interface QuestionOption {
  value: string;
  label: Bilingual;
  /** Multiplicador aplicado a la cantidad (clase de vuelo, etc.). */
  multiplier?: number;
  /** Factor alternativo para resolver la línea. */
  factorId?: string;
}

export type EstimateKind = 'area' | 'fixed' | 'per_person' | 'per_employee' | 'per_attendee';

export interface EstimateDef {
  kind: EstimateKind;
  /** Valor de referencia en unidad del factor. */
  value: number;
  /** kWh/m²·año u otra métrica para explicar el cálculo. */
  intensity?: number;
  areaDefault?: number;
  note: Bilingual;
}

export interface QuestionDef {
  id: string;
  entity: EntityType;
  category: string;
  scope: Scope;
  label: Bilingual;
  help?: Bilingual;
  unit: UnitCode;
  factorId?: string;
  /** Resuelve el factor a partir de otra respuesta (tipo de combustible). */
  factorSwitch?: { questionId: string; map: Record<string, string> };
  /** Mapa de opciones de una pregunta choice → factor. */
  factorMap?: Record<string, string>;
  waterFactorId?: string;
  detail: DetailLevel;
  defaultValue: number | string;
  min?: number;
  max?: number;
  step?: number;
  kind?: 'number' | 'choice' | 'diet' | 'text';
  options?: QuestionOption[];
  estimate?: EstimateDef;
  /** Añade el multiplicador de la opción elegida (clase de vuelo). */
  multiplierFrom?: string;
  /** Aplica forzamiento radiativo si el proyecto lo activa. */
  supportsRf?: boolean;
  /** Marca la línea como agua directa. */
  waterDirect?: boolean;
  /** No genera línea de carbono (solo agua). */
  waterOnly?: boolean;
  /** Campo informativo que no genera línea. */
  informational?: boolean;
  assumptionKey?: string;
}

export interface CategoryDef {
  id: string;
  label: Bilingual;
  short?: Bilingual;
  description: Bilingual;
  icon: string;
}

export interface CustomLine {
  id: string;
  factorId: string;
  quantity: number;
  unit: UnitCode;
  label?: string;
  scope?: Scope;
}

export interface Project {
  version: 1;
  id: string;
  name: string;
  entity: EntityType;
  country: CountryCode;
  sector: string;
  periodStart: string;
  periodEnd: string;
  baseYear: string;
  detail: DetailLevel;
  boundary: Boundary;
  gwp: GWPSet;
  scope2Method: Scope2Method;
  rf: boolean;
  waterStress: boolean;
  householdSize: number;
  employees: number;
  attendees: number;
  areaM2: number;
  unitsProduced: number;
  answers: Record<string, number | string>;
  touched: string[];
  assumptions: Record<string, string>;
  customLines: CustomLine[];
  plan: string[];
  marketElectricityFactor?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResultLine {
  id: string;
  questionId?: string;
  category: string;
  categoryLabel: Bilingual;
  label: Bilingual;
  scope: Scope;
  scope3Category?: number;
  quantity: number;
  unit: UnitCode;
  factorId: string;
  factorLabel: Bilingual;
  factorValue: number;
  factorUnit: UnitCode;
  factorVersion: number;
  factorLayer: 'base' | 'custom';
  factorChangeReason?: string;
  kgCO2e: number;
  kgCO2eLocation?: number;
  kgCO2eMarket?: number;
  water: { blue: number; green: number; grey: number };
  uncertaintyPct: number;
  source: SourceRef;
  factorYear: number;
  factorStatus: Status;
  assumptions: string[];
  waterDirect?: boolean;
  waterFactorId?: string;
  method?: Scope2Method;
}

export interface CategoryResult {
  id: string;
  label: Bilingual;
  kgCO2e: number;
  water: { blue: number; green: number; grey: number };
  percentage: number;
  color: string;
}

export interface FootprintResult {
  totalKgCO2e: number;
  totalLocationKgCO2e: number;
  totalMarketKgCO2e: number;
  lowKgCO2e: number;
  highKgCO2e: number;
  uncertaintyPct: number;
  byScope: Record<'1' | '2' | '3', number>;
  scope2: { location: number; market: number };
  byCategory: CategoryResult[];
  water: {
    blue: number;
    green: number;
    grey: number;
    total: number;
    blueScarce: number;
    direct: number;
    indirect: number;
  };
  lines: ResultLine[];
  /** Instantánea de los factores usados (id, versión, valor) al calcular. */
  factorSnapshot: {
    id: string;
    kind: 'carbon' | 'water';
    version: number;
    layer: 'base' | 'custom';
    value: number;
    unit: UnitCode;
    sourceId: string;
    dataYear: number;
    changeReason?: string;
  }[];
  warnings: { id: string; severity: 'info' | 'warning'; text: Bilingual }[];
  answered: number;
  totalQuestions: number;
  completeness: number;
  perUnit?: { value: number; label: Bilingual };
}

export interface BenchmarkSet {
  carbonPerCapita: Record<string, number>;
  waterPerCapita: Record<string, number>;
  carbonSector: Record<string, number>;
  eventPerAttendee: number;
  eventWaterPerAttendee: number;
  /** Año y fuente del benchmark. */
  source: SourceRef;
  lastVerified: string;
}

export interface StressEntry {
  country: CountryCode;
  aware: number;
  wriCategory: 'Low' | 'Low-Medium' | 'Medium-High' | 'High' | 'Extremely High';
  source: SourceRef;
  lastVerified: string;
}

export interface ScenarioLever {
  id: string;
  label: Bilingual;
  description: Bilingual;
  fieldIds: string[];
  defaultPct: number;
  maxPct: number;
  color: string;
}

export interface ScenarioValues {
  energy: number;
  mobility: number;
  flights: number;
  diet: number;
  waste: number;
  hotels: number;
  purchases: number;
}

export interface ActionDef {
  id: string;
  entity: EntityType[];
  title: Bilingual;
  description: Bilingual;
  impactPct: number;
  cost: 1 | 2 | 3;
  effort: 1 | 2 | 3;
  timeframe: Bilingual;
  sdg: string;
}
