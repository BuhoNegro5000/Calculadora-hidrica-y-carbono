import { Badge, Chip } from '../ui';
import { Icon } from '../Icons';
import {
  approvalLabel, layerLabel, qualityLabel, waterTypeLabel, type FactorRecord,
} from '../../engine/factorTypes';
import { statusClass, statusLabel } from '../../lib/format';

export const CATEGORY_LABELS: Record<string, { es: string; en: string }> = {
  energy: { es: 'Energía', en: 'Energy' },
  transport: { es: 'Transporte', en: 'Transport' },
  food: { es: 'Alimentación', en: 'Food' },
  goods: { es: 'Bienes', en: 'Goods' },
  water: { es: 'Agua', en: 'Water' },
  waste: { es: 'Residuos', en: 'Waste' },
  events: { es: 'Eventos', en: 'Events' },
  digital: { es: 'Digital', en: 'Digital' },
  logistics: { es: 'Logística', en: 'Logistics' },
  refrigerants: { es: 'Refrigerantes', en: 'Refrigerants' },
  credits: { es: 'Créditos', en: 'Credits' },
  capture: { es: 'Captura', en: 'Capture' },
  other: { es: 'Otros', en: 'Other' },
};

export function categoryLabel(category: string, lang: 'es' | 'en'): string {
  return CATEGORY_LABELS[category]?.[lang] ?? category;
}

export function factorValueLabel(record: FactorRecord, lang: 'es' | 'en'): string {
  const value = new Intl.NumberFormat(lang === 'es' ? 'es-PE' : 'en-GB', {
    maximumFractionDigits: 6,
  }).format(record.value);
  return record.kind === 'carbon'
    ? `${value} kg CO₂e / ${record.unit}`
    : `${value} m³ / ${record.unit}`;
}

export function shortSource(record: FactorRecord): string {
  try {
    return new URL(record.sourceUrl).hostname.replace(/^www\./, '');
  } catch {
    return record.sourceOrg;
  }
}

export function KindBadge({ kind, lang }: { kind: FactorRecord['kind']; lang: 'es' | 'en' }) {
  return (
    <span className={`factor-kind ${kind}`}>
      <Icon name={kind === 'carbon' ? 'cloud' : 'droplet'} size={12} />
      {kind === 'carbon' ? 'CO₂e' : (lang === 'es' ? 'Agua' : 'Water')}
    </span>
  );
}

export function LayerBadge({ record, lang }: { record: FactorRecord; lang: 'es' | 'en' }) {
  if (record.layer === 'base') return <Badge tone="default">{layerLabel('base', lang)}</Badge>;
  return (
    <Badge tone="ok">
      {record.baseId ? (lang === 'es' ? 'Override' : 'Override') : layerLabel('custom', lang)}
      {record.version > 1 ? ` v${record.version}` : ''}
    </Badge>
  );
}

export function QualityBadge({ record, lang }: { record: FactorRecord; lang: 'es' | 'en' }) {
  const tone = record.quality === 'official' ? 'ok' : record.quality === 'estimated' ? 'warn' : 'info';
  return <Badge tone={tone}>{qualityLabel(record.quality, lang)}</Badge>;
}

export function StatusBadge({ record, lang }: { record: FactorRecord; lang: 'es' | 'en' }) {
  return <span className={`badge ${statusClass(record.status)}`}>{statusLabel(record.status, lang)}</span>;
}

export function ApprovalBadge({ record, lang }: { record: FactorRecord; lang: 'es' | 'en' }) {
  if (record.approval === 'approved') return <Badge tone="ok">{approvalLabel(record.approval, lang)}</Badge>;
  if (record.approval === 'proposed') return <Badge tone="warn">{approvalLabel(record.approval, lang)}</Badge>;
  return <Badge tone="info">{approvalLabel(record.approval, lang)}</Badge>;
}

export function WaterBadge({ record, lang }: { record: FactorRecord; lang: 'es' | 'en' }) {
  if (record.kind !== 'water' || !record.waterType) return null;
  return <Chip tone="water">{waterTypeLabel(record.waterType, lang)}</Chip>;
}

export function ScopeChip({ scope }: { scope: number }) {
  return <span className={`scope-chip s${scope}`}>S{scope}</span>;
}

export function EmptyFactors({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="factor-empty">
      <span className="factor-empty-icon"><Icon name="database" size={24} /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
