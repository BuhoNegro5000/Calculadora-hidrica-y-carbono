import { useMemo, useState, type ReactNode } from 'react';
import { useI18n } from '../i18n';
import { useApp } from '../store/app';
import { useFactors } from '../store/factors';
import { useRoute, navigate } from '../app/router';
import { Icon } from '../components/Icons';
import { Badge, Chip, Datum, Segmented } from '../components/ui';
import { FactorForm } from '../components/factors/FactorForm';
import { FactorDetail } from '../components/factors/FactorDetail';
import { FactorImport } from '../components/factors/FactorImport';
import {
  ApprovalBadge, categoryLabel,
  EmptyFactors, factorValueLabel, KindBadge, LayerBadge, QualityBadge, ScopeChip,
  StatusBadge,
} from '../components/factors/shared';
import {
  COUNTRY_OPTIONS, roleLabel, waterTypeLabel, type FactorKind, type FactorRecord, type FactorRole,
} from '../engine/factorTypes';
import { analyzeInventory, type FactorGap } from '../engine/factorGaps';
import {
  factorsToJson, recordToDisplayValue,
} from '../engine/factorOps';
import {
  downloadFactorsCsv, downloadFactorsExcel, downloadFactorsJson,
  downloadFactorTemplate,
} from '../lib/factorIO';
import { download, timestamp } from '../lib/download';
import { dateLabel, nf, smart, statusLabel } from '../lib/format';

type Tab = 'catalog' | 'custom' | 'coverage' | 'audit' | 'trash';
type FormState = {
  mode: 'create' | 'edit' | 'duplicate';
  initial?: FactorRecord;
  base?: FactorRecord;
  prefill?: Partial<FactorRecord>;
};

const UNIT_BY_CATEGORY: Record<string, FactorRecord['unit']> = {
  energy: 'kWh',
  transport: 'km',
  food: 'kg',
  goods: 'unit',
  water: 'm3',
  waste: 'kg',
  events: 'unit',
  digital: 'GB',
  logistics: 'tkm',
  refrigerants: 'kg',
  credits: 't',
  capture: 't',
  other: 'unit',
};

export function Factors() {
  const { t, lang } = useI18n();
  const { toast } = useApp();
  const {
    catalog, custom, deleted, audit, role, setRole, threshold, setThreshold,
    loading, storage, baseUpdates, pendingApprovals, restoreFactor, purgeFactor,
  } = useFactors();
  const route = useRoute();
  const [tab, setTab] = useState<Tab>('catalog');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | FactorKind>('all');
  const [category, setCategory] = useState('all');
  const [scope, setScope] = useState<'all' | '1' | '2' | '3'>('all');
  const [country, setCountry] = useState('all');
  const [status, setStatus] = useState<'all' | 'verified' | 'pending' | 'screening'>('all');
  const [layer, setLayer] = useState<'all' | 'base' | 'custom'>('all');
  const [year, setYear] = useState('all');
  const [source, setSource] = useState('all');
  const [limit, setLimit] = useState(50);
  const [form, setForm] = useState<FormState | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [compare, setCompare] = useState<{ a: string; b: string } | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<string | null>(null);
  const [governanceOpen, setGovernanceOpen] = useState(false);

  const L = (es: string, en: string) => (lang === 'es' ? es : en);
  const records = useMemo(() => [...catalog.records.values()], [catalog]);
  const inventory = useMemo(() => analyzeInventory(catalog), [catalog]);
  const detailId = route.raw.split('/')[1];
  const detailRecord = detailId
    ? catalog.records.get(detailId) ?? custom.find((record) => record.id === detailId)
    : undefined;

  const categories = useMemo(
    () => [...new Set(records.map((record) => record.category))].sort(),
    [records],
  );
  const years = useMemo(
    () => [...new Set(records.map((record) => record.dataYear))].sort((a, b) => b - a),
    [records],
  );
  const sources = useMemo(
    () => [...new Set(records.map((record) => record.sourceOrg))].sort(),
    [records],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return records.filter((record) => {
      if (kind !== 'all' && record.kind !== kind) return false;
      if (category !== 'all' && record.category !== category) return false;
      if (scope !== 'all' && String(record.scope) !== scope) return false;
      if (country !== 'all' && record.country !== country) return false;
      if (status !== 'all' && record.status !== status) return false;
      if (layer !== 'all' && record.layer !== layer) return false;
      if (year !== 'all' && String(record.dataYear) !== year) return false;
      if (source !== 'all' && record.sourceOrg !== source) return false;
      if (!needle) return true;
      const haystack = [
        record.id, record.label.es, record.label.en, record.description.es,
        record.category, record.country, record.sourceOrg, record.sourceTitle,
        record.changeReason, String(record.dataYear),
      ].join(' ').toLowerCase();
      return haystack.includes(needle);
    }).sort((a, b) => {
      if (a.layer !== b.layer) return a.layer === 'custom' ? -1 : 1;
      return a.label[lang].localeCompare(b.label[lang]);
    });
  }, [records, kind, category, scope, country, status, layer, year, source, query, lang]);

  const customRecords = filtered.filter((record) => record.layer === 'custom');
  const visible = (tab === 'custom' ? customRecords : filtered).slice(0, limit);
  const hasFilters = query !== '' || kind !== 'all' || category !== 'all' || scope !== 'all'
    || country !== 'all' || status !== 'all' || layer !== 'all' || year !== 'all' || source !== 'all';

  const clearFilters = () => {
    setQuery('');
    setKind('all');
    setCategory('all');
    setScope('all');
    setCountry('all');
    setStatus('all');
    setLayer('all');
    setYear('all');
    setSource('all');
    setLimit(50);
  };

  const openDetail = (record: FactorRecord) => navigate(`factors/${record.id}`);
  const closeDetail = () => navigate('factors');
  const openEdit = (record: FactorRecord, base?: FactorRecord) => {
    setForm({
      mode: record.layer === 'custom' ? 'edit' : 'edit',
      initial: record,
      base: base ?? (record.baseId ? catalog.baseRecords.get(record.baseId) : record.layer === 'base' ? record : undefined),
    });
  };
  const openCreate = (prefill?: Partial<FactorRecord>) => setForm({ mode: 'create', prefill });
  const openDuplicate = (record: FactorRecord) => setForm({ mode: 'duplicate', initial: record });

  const stats = inventory.metrics;
  const customActive = custom.filter((record) => !record.deletedAt).length;

  const activeTabRecords = tab === 'custom' ? customRecords : filtered;
  const shownRecords = activeTabRecords.slice(0, limit);

  const exportScope = tab === 'custom' || (layer === 'custom' && kind === 'all') ? customRecords : filtered;

  return (
    <div className="container factors-screen">
      <header className="factors-hero">
        <div>
          <p className="eyebrow">{L('Módulo de factores', 'Factor module')}</p>
          <h1>{L('El número también se puede auditar.', 'The number can be audited too.')}</h1>
          <p className="lede">
            {L('Consulta, ajusta y añade factores de carbono y agua. La capa base nunca se sobrescribe: tus cambios viven en una capa personalizada con versión, fuente, motivo y auditoría.', 'Review, adjust and add carbon and water factors. The base layer is never overwritten: your changes live in a versioned custom layer with source, reason and audit.')}
          </p>
          <div className="row gap-2 wrap mt-4">
            <Chip tone="accent">{records.length} {L('factores', 'factors')}</Chip>
            <Chip>{stats.base} base</Chip>
            <Chip>{customActive} {L('personalizados', 'custom')}</Chip>
            <Chip>{stats.overrides} overrides</Chip>
            <Chip tone={pendingApprovals > 0 ? 'warn' : 'default'}>{pendingApprovals} {L('por aprobar', 'pending approval')}</Chip>
            <Chip>{L('Datos', 'Data')} v{catalog.version}</Chip>
          </div>
        </div>
        <div className="factors-hero-actions">
          <button type="button" className="btn btn-accent" onClick={() => openCreate()} disabled={role === 'reader'}>
            <Icon name="plus" size={15} /> {L('Nuevo factor', 'New factor')}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setImportOpen(true)} disabled={role === 'reader'}>
            <Icon name="download" size={15} /> {L('Importar', 'Import')}
          </button>
          <div className="factor-export-row">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => downloadFactorsCsv(exportScope)}>
              CSV
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => downloadFactorsExcel(exportScope)}>
              Excel
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => downloadFactorsJson(exportScope, { role })}>
              JSON
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => downloadFactorTemplate(lang)}>
              {L('Plantilla', 'Template')}
            </button>
          </div>
        </div>
      </header>

      <div className="factors-status-strip">
        <div className={`factors-storage ${storage}`}>
          <Icon name={storage === 'indexeddb' ? 'database' : 'alert'} size={14} />
          <span>
            {storage === 'indexeddb'
              ? L('Capa personalizada en IndexedDB', 'Custom layer in IndexedDB')
              : L('Respaldo local (IndexedDB no disponible)', 'Local mirror (IndexedDB unavailable)')}
          </span>
        </div>
        <button type="button" className="factors-governance-toggle" onClick={() => setGovernanceOpen((current) => !current)} aria-expanded={governanceOpen}>
          <Icon name="shield" size={14} />
          {L('Permisos y umbral', 'Permissions and threshold')}
          <span className="badge badge-accent">{roleLabel(role, lang)} · ±{threshold} %</span>
          <Icon name={governanceOpen ? 'chevron-down' : 'chevron-right'} size={13} />
        </button>
      </div>

      {governanceOpen && (
        <section className="factors-governance card card-pad">
          <div className="grid grid-3">
            <label className="field">
              <span className="field-label">{L('Rol local', 'Local role')}</span>
              <select className="select" value={role} onChange={(event) => setRole(event.target.value as FactorRole)}>
                {(['reader', 'editor', 'admin'] as FactorRole[]).map((item) => (
                  <option key={item} value={item}>{roleLabel(item, lang)}</option>
                ))}
              </select>
              <span className="factor-hint">
                {role === 'reader'
                  ? L('Solo consulta. No puede crear, editar ni importar.', 'Read-only. Cannot create, edit or import.')
                  : role === 'editor'
                    ? L('Propone cambios; un Administrador los aprueba.', 'Proposes changes; an Administrator approves them.')
                    : L('Administra, aprueba y puede purgar la papelera.', 'Manages, approves and can purge the trash.')}
              </span>
            </label>
            <label className="field">
              <span className="field-label">{L('Umbral de alerta por cambio', 'Change alert threshold')}</span>
              <div className="input-group">
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={100}
                  value={threshold}
                  onChange={(event) => setThreshold(Number(event.target.value))}
                />
                <span className="unit">%</span>
              </div>
              <span className="factor-hint">{L('Si un override supera este cambio respecto al valor base, se pide confirmación explícita.', 'If an override exceeds this change versus the base value, explicit confirmation is required.')}</span>
            </label>
            <div className="factor-governance-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => download('gol-respaldo-factores.json', JSON.stringify({ schema: 'green-owl-labs/factor-backup@1', exportedAt: new Date().toISOString(), role, factors: custom, audit }, null, 2), 'application/json')}>
                <Icon name="download" size={14} /> {L('Respaldo completo', 'Full backup')}
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => download(`gol-auditoria-factores-${timestamp()}.json`, factorsToJson([], { audit }), 'application/json')}>
                <Icon name="file" size={14} /> {L('Exportar auditoría', 'Export audit')}
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => download(`gol-cobertura-factores-${timestamp()}.json`, JSON.stringify(inventory, null, 2), 'application/json')}>
                <Icon name="chart" size={14} /> {L('Exportar cobertura', 'Export coverage')}
              </button>
            </div>
          </div>
        </section>
      )}

      {baseUpdates.length > 0 && (
        <div className="factor-alert factors-base-alert">
          <Icon name="alert" size={16} />
          <div>
            <strong>{L('Hay overrides creados sobre otra versión del paquete base', 'Some overrides were created on another base package version')}</strong>
            <p>{L(`${baseUpdates.length} factor(es) requieren revisión: el valor base puede haber cambiado.`, `${baseUpdates.length} factor(s) need review: the base value may have changed.`)}</p>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { setTab('custom'); setLayer('custom'); setLimit(200); }}>{L('Revisar', 'Review')}</button>
        </div>
      )}

      <div className="factor-kpis">
        <article className="factor-kpi"><span className="kpi-icon carbon"><Icon name="cloud" size={18} /></span><div><strong>{stats.carbon}</strong><small>{L('factores de carbono', 'carbon factors')}</small></div></article>
        <article className="factor-kpi"><span className="kpi-icon water"><Icon name="droplet" size={18} /></span><div><strong>{stats.water}</strong><small>{L('factores de agua', 'water factors')}</small></div></article>
        <article className="factor-kpi"><span className="kpi-icon"><Icon name="check" size={18} /></span><div><strong>{nf(stats.verifiedShare * 100, lang, 0)} %</strong><small>{L('verificados', 'verified')}</small></div></article>
        <article className="factor-kpi"><span className="kpi-icon warn"><Icon name="alert" size={18} /></span><div><strong>{stats.waterGreenZero}</strong><small>{L('agua con verde = 0', 'water with green = 0')}</small></div></article>
        <article className="factor-kpi"><span className="kpi-icon"><Icon name="globe" size={18} /></span><div><strong>{stats.countriesWithoutWater}</strong><small>{L('países sin factor hídrico', 'countries without water factor')}</small></div></article>
        <article className="factor-kpi"><span className="kpi-icon"><Icon name="calendar" size={18} /></span><div><strong>{stats.yearMin}–{stats.yearMax}</strong><small>{L('rango de años del dato', 'data year range')}</small></div></article>
      </div>

      <div className="factor-tabs factors-main-tabs" role="tablist" aria-label={L('Secciones del gestor', 'Manager sections')}>
        {([
          ['catalog', L('Catálogo', 'Catalogue'), records.length],
          ['custom', L('Personalizados', 'Custom'), customActive],
          ['coverage', L('Cobertura y huecos', 'Coverage and gaps'), inventory.byPriority.high + inventory.byPriority.medium + inventory.byPriority.low],
          ['audit', L('Auditoría', 'Audit'), audit.length],
          ['trash', L('Papelera', 'Trash'), deleted.length],
        ] as [Tab, string, number][]).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'active' : ''}
            onClick={() => { setTab(id); setLimit(50); }}
          >
            {label}
            <span className="tab-count">{count}</span>
          </button>
        ))}
      </div>

      {(tab === 'catalog' || tab === 'custom') && (
        <section className="factor-workspace">
          <div className="factor-filters card card-pad">
            <div className="factor-search-row">
              <div className="input-group" style={{ flex: 1 }}>
                <input
                  className="input"
                  type="search"
                  value={query}
                  onChange={(event) => { setQuery(event.target.value); setLimit(50); }}
                  placeholder={L('Buscar por nombre, id, fuente, motivo…', 'Search by name, id, source, reason…')}
                  aria-label={L('Buscar factores', 'Search factors')}
                />
                <span className="unit"><Icon name="search" size={15} /></span>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters} disabled={!hasFilters}>
                <Icon name="refresh" size={13} /> {L('Limpiar', 'Clear')}
              </button>
            </div>
            <div className="factor-filter-grid">
              <label className="field">
                <span className="field-label">{L('Tipo', 'Type')}</span>
                <select className="select" value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
                  <option value="all">{L('Todos', 'All')}</option>
                  <option value="carbon">{L('Carbono', 'Carbon')}</option>
                  <option value="water">{L('Agua', 'Water')}</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">{L('Categoría', 'Category')}</span>
                <select className="select" value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="all">{L('Todas', 'All')}</option>
                  {categories.map((id) => <option key={id} value={id}>{categoryLabel(id, lang)}</option>)}
                </select>
              </label>
              <label className="field">
                <span className="field-label">{L('Alcance', 'Scope')}</span>
                <select className="select" value={scope} onChange={(event) => setScope(event.target.value as typeof scope)}>
                  <option value="all">{L('Todos', 'All')}</option>
                  <option value="1">Scope 1</option>
                  <option value="2">Scope 2</option>
                  <option value="3">Scope 3</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">{L('País / región', 'Country / region')}</span>
                <select className="select" value={country} onChange={(event) => setCountry(event.target.value)}>
                  <option value="all">{L('Todos', 'All')}</option>
                  {COUNTRY_OPTIONS.map((code) => <option key={code} value={code}>{code}</option>)}
                </select>
              </label>
              <label className="field">
                <span className="field-label">{L('Año', 'Year')}</span>
                <select className="select" value={year} onChange={(event) => setYear(event.target.value)}>
                  <option value="all">{L('Todos', 'All')}</option>
                  {years.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="field">
                <span className="field-label">{L('Estado', 'Status')}</span>
                <select className="select" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
                  <option value="all">{L('Todos', 'All')}</option>
                  <option value="verified">{statusLabel('verified', lang)}</option>
                  <option value="pending">{statusLabel('pending', lang)}</option>
                  <option value="screening">{statusLabel('screening', lang)}</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">{L('Capa', 'Layer')}</span>
                <select className="select" value={layer} onChange={(event) => setLayer(event.target.value as typeof layer)}>
                  <option value="all">{L('Todas', 'All')}</option>
                  <option value="base">Base</option>
                  <option value="custom">{L('Personalizada', 'Custom')}</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">{L('Fuente', 'Source')}</span>
                <select className="select" value={source} onChange={(event) => setSource(event.target.value)}>
                  <option value="all">{L('Todas', 'All')}</option>
                  {sources.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>
            <div className="factor-filter-foot">
              <span className="tiny muted">
                {L(`${activeTabRecords.length} de ${records.length} factores`, `${activeTabRecords.length} of ${records.length} factors`)}
                {tab === 'custom' && ` · ${L('capa personalizada', 'custom layer')}`}
              </span>
              <Segmented
                value={layer}
                label={L('Capa visible', 'Visible layer')}
                options={[
                  { value: 'all', label: L('Todas', 'All') },
                  { value: 'base', label: 'Base' },
                  { value: 'custom', label: L('Personalizada', 'Custom') },
                ]}
                onChange={(value) => setLayer(value)}
              />
            </div>
          </div>

          <div className="factor-list-head">
            <span />
            <span>{L('Factor', 'Factor')}</span>
            <span>{L('Valor', 'Value')}</span>
            <span>{L('Cobertura', 'Coverage')}</span>
            <span>{L('Fuente', 'Source')}</span>
            <span>{L('Estado', 'Status')}</span>
            <span />
          </div>

          <div className="factor-list">
            {shownRecords.map((record) => (
              <article className={`factor-list-row ${record.layer}`} key={record.id}>
                <button type="button" className="factor-list-main" onClick={() => openDetail(record)}>
                  <span className={`factor-list-icon ${record.kind}`}>
                    <Icon name={record.kind === 'carbon' ? 'cloud' : 'droplet'} size={16} />
                  </span>
                  <span className="factor-list-title">
                    <span className="row gap-2 wrap">
                      <strong>{record.label[lang] || record.label.es}</strong>
                      <LayerBadge record={record} lang={lang} />
                      {record.quality === 'estimated' && <Badge tone="warn">{L('Estimado', 'Estimated')}</Badge>}
                    </span>
                    <span className="factor-list-meta">
                      {categoryLabel(record.category, lang)} · <ScopeChip scope={record.scope} /> · {record.id}
                      {record.baseId && <span className="muted"> · override</span>}
                    </span>
                  </span>
                  <span className="factor-list-value">
                    <strong>{factorValueLabel(record, lang)}</strong>
                    <span className="tiny muted">±{nf(record.uncertainty * 100, lang, 0)} % · {record.gwpSet}</span>
                  </span>
                  <span className="factor-list-coverage">
                    {record.country === 'GLOBAL' ? L('Global', 'Global') : record.country}
                    <span className="tiny muted">{record.dataYear} · {record.unit}</span>
                  </span>
                  <span className="factor-list-source">
                    {record.sourceOrg}
                    <span className="tiny muted">{record.sourceId}</span>
                  </span>
                  <span className="factor-list-status">
                    <StatusBadge record={record} lang={lang} />
                    {record.approval === 'proposed' && <ApprovalBadge record={record} lang={lang} />}
                    {record.quality !== 'official' && <QualityBadge record={record} lang={lang} />}
                  </span>
                  <span className="factor-list-go" aria-hidden="true"><Icon name="chevron-right" size={16} /></span>
                </button>
              </article>
            ))}
          </div>

          {shownRecords.length === 0 && (
            <EmptyFactors
              title={L('No hay factores con estos filtros', 'No factors match these filters')}
              text={L('Prueba a quitar algún filtro o crea un factor nuevo con fuente, año y motivo.', 'Try removing a filter or create a new factor with source, year and reason.')}
              action={<button type="button" className="btn btn-accent btn-sm" onClick={() => openCreate()}><Icon name="plus" size={14} /> {L('Crear factor', 'Create factor')}</button>}
            />
          )}

          {activeTabRecords.length > shownRecords.length && (
            <div className="factor-load-more">
              <button type="button" className="btn btn-outline" onClick={() => setLimit((current) => current + 50)}>
                {L('Mostrar más', 'Show more')} ({shownRecords.length} / {activeTabRecords.length})
              </button>
            </div>
          )}
        </section>
      )}

      {tab === 'coverage' && (
        <section className="factor-coverage">
          <div className="factor-coverage-summary card card-pad">
            <div>
              <p className="eyebrow">{L('Inventario vivo', 'Live inventory')}</p>
              <h2>{L('Dónde falta un dato y con qué fuente cubrirlo.', 'Where a data point is missing and which source can cover it.')}</h2>
              <p className="small muted">
                {L('El análisis cruza categoría, país, año, gas y tipo de agua. Los huecos curados incluyen fuentes oficiales y abiertas; los agregadores solo se proponen si su licencia permite uso comercial.', 'The analysis crosses category, country, year, gas and water type. Curated gaps include official and open sources; aggregators are only proposed when their licence allows commercial use.')}
              </p>
            </div>
            <div className="row gap-2 wrap">
              <Chip tone="warn">{inventory.byPriority.high} {L('alta prioridad', 'high priority')}</Chip>
              <Chip>{inventory.byPriority.medium} {L('media', 'medium')}</Chip>
              <Chip>{inventory.byPriority.low} {L('baja', 'low')}</Chip>
              <Chip tone="accent">{stats.noGasBreakdown} {L('sin desglose de gas', 'without gas breakdown')}</Chip>
              <Chip>{stats.pending} {L('pendientes', 'pending')}</Chip>
            </div>
          </div>

          <div className="factor-gap-metrics">
            <Datum label={L('Categorías cubiertas', 'Categories covered')} value={stats.categoriesCovered} />
            <Datum label={L('Países con factores', 'Countries with factors')} value={`${stats.countriesWithFactors} / 12`} />
            <Datum label={L('Países sin agua', 'Countries without water')} value={stats.countriesWithoutWater} />
            <Datum label={L('Agua verde = 0', 'Green water = 0')} value={`${stats.waterGreenZero} / ${stats.water}`} />
            <Datum label={L('Datos con más de 5 años', 'Data older than 5 years')} value={stats.stale} />
            <Datum label={L('Sin desglose de gas', 'No gas breakdown')} value={stats.noGasBreakdown} />
          </div>

          <div className="factor-coverage-grid">
            <div className="card card-pad">
              <div className="factor-section-title">
                <h3>{L('Cobertura por país', 'Coverage by country')}</h3>
                <Chip>{inventory.coverage.length}</Chip>
              </div>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>{L('País', 'Country')}</th>
                      <th className="right">{L('Carbono', 'Carbon')}</th>
                      <th className="right">{L('Agua', 'Water')}</th>
                      <th>{L('Lectura', 'Reading')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.coverage.map((row) => (
                      <tr key={row.country}>
                        <td><strong>{row.country}</strong></td>
                        <td className="right">{row.carbon}</td>
                        <td className="right">{row.water}</td>
                        <td>
                          {row.water === 0
                            ? <Badge tone="warn">{L('Sin factor hídrico', 'No water factor')}</Badge>
                            : row.carbon === 0
                              ? <Badge tone="info">{L('Sin factor de carbono', 'No carbon factor')}</Badge>
                              : <Badge tone="ok">{L('Cubierto', 'Covered')}</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="factor-gap-list">
              {inventory.gaps.map((gap) => (
                <GapCard
                  key={gap.id}
                  gap={gap}
                  lang={lang}
                  onCreate={() => openCreate({
                    kind: gap.kind,
                    category: gap.category,
                    country: gap.country as FactorRecord['country'],
                    dataYear: gap.year,
                    unit: UNIT_BY_CATEGORY[gap.category] ?? 'unit',
                    label: { ...gap.title },
                    description: { ...gap.rationale },
                    sourceOrg: gap.sources[0]?.org ?? '',
                    sourceTitle: gap.sources[0]?.title ?? '',
                    sourceUrl: gap.sources[0]?.url ?? '',
                    license: gap.sources[0]?.license ?? '',
                    water: gap.kind === 'water' ? { blue: 0, green: 0, grey: 0 } : undefined,
                    waterType: gap.waterType ?? (gap.kind === 'water' ? 'mixed' : undefined),
                    gasDetail: gap.kind === 'carbon' ? 'aggregate' : 'aggregate',
                    quality: 'literature',
                    status: 'pending',
                    changeReason: lang === 'es' ? `Cierre del hueco ${gap.id}` : `Closing gap ${gap.id}`,
                    notes: { es: gap.action.es, en: gap.action.en },
                  })}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === 'audit' && (
        <section className="factor-audit card card-pad">
          <div className="section-head-sm">
            <div>
              <p className="eyebrow">{L('Registro inmutable', 'Immutable log')}</p>
              <h2>{L('Qué cambió, quién, cuándo y por qué.', 'What changed, who, when and why.')}</h2>
              <p className="small muted">{L('Cada alta, edición, importación, aprobación y eliminación queda registrada. El historial no se edita desde la interfaz.', 'Every create, edit, import, approval and deletion is recorded. History cannot be edited from the interface.')}</p>
            </div>
            <Chip>{audit.length}</Chip>
          </div>
          <div className="table-wrap">
            <table className="data factors-audit-table">
              <thead>
                <tr>
                  <th>{L('Fecha', 'Date')}</th>
                  <th>{L('Acción', 'Action')}</th>
                  <th>{L('Factor', 'Factor')}</th>
                  <th>{L('Versión', 'Version')}</th>
                  <th>{L('Antes → después', 'Before → after')}</th>
                  <th>{L('Motivo', 'Reason')}</th>
                  <th>{L('Usuario', 'User')}</th>
                </tr>
              </thead>
              <tbody>
                {audit.slice(0, 200).map((entry) => (
                  <tr key={entry.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{dateLabel(entry.at, lang)}</td>
                    <td><Badge tone={entry.action === 'delete' ? 'warn' : entry.action === 'approve' ? 'ok' : 'info'}>{entry.action}</Badge></td>
                    <td>
                      <strong>{entry.factorLabel}</strong>
                      <span className="tiny muted mono" style={{ display: 'block' }}>{entry.factorId}</span>
                    </td>
                    <td>{entry.version ? `v${entry.version}` : '—'}</td>
                    <td className="mono tiny">
                      {entry.before?.value !== undefined ? `${smart(entry.before.value, lang)} → ${entry.after?.value !== undefined ? smart(entry.after.value, lang) : '—'}` : '—'}
                    </td>
                    <td>{entry.reason}</td>
                    <td>{entry.user}<span className="tiny muted" style={{ display: 'block' }}>{entry.role}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {audit.length === 0 && <p className="small muted" style={{ padding: 18 }}>{L('Todavía no hay movimientos.', 'No movements yet.')}</p>}
          </div>
        </section>
      )}

      {tab === 'trash' && (
        <section className="factor-trash">
          <div className="section-head-sm">
            <div>
              <p className="eyebrow">{L('Papelera', 'Trash')}</p>
              <h2>{L('Recupera una copia sin tocar la base.', 'Recover a copy without touching the base.')}</h2>
              <p className="small muted">{L('Eliminar mueve la copia personalizada aquí. El factor base sigue disponible y el cálculo vuelve a usarlo.', 'Deleting moves the custom copy here. The base factor remains available and calculations use it again.')}</p>
            </div>
            <Chip>{deleted.length}</Chip>
          </div>
          <div className="factor-list">
            {deleted.map((record) => (
              <article className="factor-list-row trashed" key={record.id}>
                <div className="factor-list-main">
                  <span className={`factor-list-icon ${record.kind}`}>
                    <Icon name={record.kind === 'carbon' ? 'cloud' : 'droplet'} size={16} />
                  </span>
                  <span className="factor-list-title">
                    <strong>{record.label[lang] || record.label.es}</strong>
                    <span className="factor-list-meta">{record.id} · {record.baseId ? 'override' : L('personalizado', 'custom')} · v{record.version}</span>
                  </span>
                  <span className="factor-list-coverage">{record.country} · {record.dataYear}</span>
                  <span className="factor-list-source">{record.changeReason}</span>
                  <span className="factor-list-status"><Badge tone="warn">{L('En papelera', 'In trash')}</Badge></span>
                  <span className="row gap-2">
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => {
                      const result = restoreFactor(record.id);
                      toast(result.ok ? L('Factor restaurado.', 'Factor restored.') : L('No se pudo restaurar.', 'Could not restore.'));
                    }} disabled={role === 'reader'}>
                      <Icon name="refresh" size={13} /> {L('Recuperar', 'Recover')}
                    </button>
                    {role === 'admin' && (
                      purgeTarget === record.id ? (
                        <span className="row gap-2">
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => {
                            const result = purgeFactor(record.id);
                            toast(result.ok ? L('Factor borrado definitivamente.', 'Factor permanently deleted.') : L('No se pudo borrar.', 'Could not delete.'));
                            setPurgeTarget(null);
                          }}>{L('Confirmar', 'Confirm')}</button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPurgeTarget(null)}>{L('No', 'No')}</button>
                        </span>
                      ) : (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPurgeTarget(record.id)}>
                          <Icon name="trash" size={13} /> {L('Borrar', 'Delete')}
                        </button>
                      )
                    )}
                  </span>
                </div>
              </article>
            ))}
          </div>
          {deleted.length === 0 && <EmptyFactors title={L('La papelera está vacía', 'The trash is empty')} text={L('Los factores personalizados eliminados aparecen aquí para recuperarlos.', 'Deleted custom factors appear here for recovery.')} />}
        </section>
      )}

      {detailRecord && (
        <FactorDetail
          record={detailRecord}
          onClose={closeDetail}
          onEdit={(record, base) => openEdit(record, base)}
          onDuplicate={(record) => openDuplicate(record)}
          onCompare={(record) => {
            const other = records.find((item) => item.id !== record.id && item.kind === record.kind) ?? records.find((item) => item.id !== record.id);
            setCompare({ a: record.id, b: other?.id ?? record.id });
          }}
          onUse={() => { toast(L('Abre un proyecto y usa el factor en el cálculo.', 'Open a project and use the factor in the calculation.')); navigate('measure'); }}
        />
      )}

      {form && (
        <FactorForm
          mode={form.mode}
          initial={form.initial}
          base={form.base}
          prefill={form.prefill}
          onClose={() => setForm(null)}
          onSaved={(record) => {
            setForm(null);
            toast(L('Factor guardado y disponible para calcular.', 'Factor saved and available for calculation.'));
            navigate(`factors/${record.id}`);
          }}
        />
      )}

      {importOpen && (
        <FactorImport onClose={() => setImportOpen(false)} onImported={() => setImportOpen(false)} />
      )}

      {compare && <CompareModal compare={compare} onChange={setCompare} onClose={() => setCompare(null)} />}
    </div>
  );
}

function GapCard({ gap, lang, onCreate }: { gap: FactorGap & { coveredBy?: string }; lang: 'es' | 'en'; onCreate: () => void }) {
  const L = (es: string, en: string) => (lang === 'es' ? es : en);
  return (
    <article className={`factor-gap-card ${gap.priority} ${gap.coveredBy ? 'covered' : ''}`}>
      <div className="row between gap-2 wrap">
        <div className="row gap-2 wrap">
          <Badge tone={gap.priority === 'high' ? 'warn' : gap.priority === 'medium' ? 'info' : 'default'}>
            {gap.priority === 'high' ? L('Alta', 'High') : gap.priority === 'medium' ? L('Media', 'Medium') : L('Baja', 'Low')}
          </Badge>
          <KindBadge kind={gap.kind} lang={lang} />
          <span className="badge">{categoryLabel(gap.category, lang)}</span>
          <span className="badge">{gap.country} · {gap.year}</span>
          {gap.waterType && <Chip tone="water">{waterTypeLabel(gap.waterType, lang)}</Chip>}
        </div>
        {gap.coveredBy ? <Badge tone="ok">{L('Cubierto', 'Covered')}</Badge> : <Badge tone="warn">{L('Hueco abierto', 'Open gap')}</Badge>}
      </div>
      <h3>{gap.title[lang]}</h3>
      <p className="small">{gap.rationale[lang]}</p>
      <p className="tiny muted"><strong>{L('Acción', 'Action')}:</strong> {gap.action[lang]}</p>
      <div className="factor-gap-sources">
        {gap.sources.map((source) => (
          <a key={`${gap.id}-${source.url}`} href={source.url} target="_blank" rel="noreferrer" className="factor-gap-source">
            <strong>{source.org}</strong>
            <span>{source.title}</span>
            <span className="tiny muted">{source.license}</span>
            <Icon name="external" size={12} />
          </a>
        ))}
      </div>
      {!gap.coveredBy && (
        <button type="button" className="btn btn-outline btn-sm" onClick={onCreate}>
          <Icon name="plus" size={13} /> {L('Crear factor desde este hueco', 'Create factor from this gap')}
        </button>
      )}
    </article>
  );
}

function CompareModal({
  compare, onChange, onClose,
}: {
  compare: { a: string; b: string };
  onChange: (next: { a: string; b: string }) => void;
  onClose: () => void;
}) {
  const { lang } = useI18n();
  const { catalog } = useFactors();
  const L = (es: string, en: string) => (lang === 'es' ? es : en);
  const all = [...catalog.records.values()];
  const a = catalog.records.get(compare.a);
  const b = catalog.records.get(compare.b);

  const rows: { label: string; render: (record?: FactorRecord) => ReactNode }[] = [
    { label: L('Valor', 'Value'), render: (record) => (record ? factorValueLabel(record, lang) : '—') },
    { label: L('Capa', 'Layer'), render: (record) => (record ? <LayerBadge record={record} lang={lang} /> : '—') },
    { label: L('Categoría', 'Category'), render: (record) => (record ? categoryLabel(record.category, lang) : '—') },
    { label: L('Alcance', 'Scope'), render: (record) => (record ? <ScopeChip scope={record.scope} /> : '—') },
    { label: L('País / año', 'Country / year'), render: (record) => (record ? `${record.country} · ${record.dataYear}` : '—') },
    { label: L('Unidad', 'Unit'), render: (record) => (record ? record.unit : '—') },
    { label: 'GWP', render: (record) => (record ? record.gwpSet : '—') },
    { label: L('Incertidumbre', 'Uncertainty'), render: (record) => (record ? `±${nf(record.uncertainty * 100, lang, 1)} %` : '—') },
    { label: L('Calidad', 'Quality'), render: (record) => (record ? <QualityBadge record={record} lang={lang} /> : '—') },
    { label: L('Estado', 'Status'), render: (record) => (record ? <StatusBadge record={record} lang={lang} /> : '—') },
    { label: L('Fuente', 'Source'), render: (record) => (record ? `${record.sourceOrg} (${record.publicationYear})` : '—') },
    { label: L('Licencia', 'Licence'), render: (record) => (record ? record.license : '—') },
    { label: L('Motivo', 'Reason'), render: (record) => (record ? record.changeReason : '—') },
    { label: L('Versión', 'Version'), render: (record) => (record ? `v${record.version}` : '—') },
  ];

  return (
    <div className="factor-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="factor-modal factor-compare" role="dialog" aria-modal="true" aria-labelledby="factor-compare-title">
        <header className="factor-modal-head">
          <div>
            <p className="eyebrow no-rule">{L('Comparación lado a lado', 'Side-by-side comparison')}</p>
            <h2 id="factor-compare-title">{L('Dos factores, la misma vara.', 'Two factors, the same standard.')}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={L('Cerrar', 'Close')}>
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="factor-modal-body">
          <div className="factor-compare-selects">
            <label className="field">
              <span className="field-label">{L('Factor A', 'Factor A')}</span>
              <select className="select" value={compare.a} onChange={(event) => onChange({ ...compare, a: event.target.value })}>
                {all.map((record) => <option key={record.id} value={record.id}>{record.label[lang]} · {record.id}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="field-label">{L('Factor B', 'Factor B')}</span>
              <select className="select" value={compare.b} onChange={(event) => onChange({ ...compare, b: event.target.value })}>
                {all.map((record) => <option key={record.id} value={record.id}>{record.label[lang]} · {record.id}</option>)}
              </select>
            </label>
          </div>
          <div className="table-wrap">
            <table className="data factor-compare-table">
              <thead>
                <tr>
                  <th>{L('Campo', 'Field')}</th>
                  <th>{a?.label[lang] ?? '—'}</th>
                  <th>{b?.label[lang] ?? '—'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td>{row.render(a)}</td>
                    <td>{row.render(b)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {a && b && a.unit === b.unit && (
            <div className="factor-compare-delta">
              <strong>{L('Diferencia de valor', 'Value difference')}:</strong>
              <span className={b.value >= a.value ? 'up' : 'down'}>
                {a.value === 0 ? '—' : `${(((b.value - a.value) / Math.abs(a.value)) * 100).toFixed(1)} %`}
              </span>
              <span className="tiny muted">({recordToDisplayValue(a, lang)} → {recordToDisplayValue(b, lang)})</span>
            </div>
          )}
        </div>
        <footer className="factor-modal-foot">
          <span className="tiny muted">{L('Comparar no modifica ningún factor.', 'Comparing does not modify any factor.')}</span>
          <button type="button" className="btn btn-primary" onClick={onClose}>{L('Cerrar', 'Close')}</button>
        </footer>
      </section>
    </div>
  );
}
