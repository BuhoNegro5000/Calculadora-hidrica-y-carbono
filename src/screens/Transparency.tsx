import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { Icon } from '../components/Icons';
import { Chip } from '../components/ui';
import { Segmented } from '../components/ui';
import { DATA_VERSION, exportCatalogJson } from '../lib/export';
import { carbonFactors, waterFactors, sourceRegistry } from '../engine/factors';
import { countryLabel } from '../engine/benchmarks';
import { nf, smart, statusLabel } from '../lib/format';
import { useApp } from '../store/app';

type Kind = 'all' | 'carbon' | 'water';
type StatusFilter = 'all' | 'verified' | 'pending' | 'screening';

interface Row {
  id: string;
  kind: 'carbon' | 'water';
  label: string;
  category: string;
  value: string;
  unit: string;
  country: string;
  year: number;
  status: 'verified' | 'pending' | 'screening';
  sourceId: string;
  sourceLabel: string;
  url: string;
  lastVerified: string;
  uncertainty: number;
}

export function Transparency() {
  const { t, lang } = useI18n();
  const { toast } = useApp();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<Kind>('all');
  const [status, setStatus] = useState<StatusFilter>('all');

  const rows = useMemo<Row[]>(() => {
    const carbon: Row[] = carbonFactors.map((factor) => ({
      id: factor.id,
      kind: 'carbon',
      label: factor.label[lang],
      category: factor.category,
      value: factor.byGwp
        ? `AR5 ${smart(factor.byGwp.AR5 ?? factor.value, lang)} · AR6 ${smart(factor.byGwp.AR6 ?? factor.value, lang)}`
        : smart(factor.value, lang),
      unit: factor.unit,
      country: factor.country,
      year: factor.year,
      status: factor.status,
      sourceId: factor.sourceId,
      sourceLabel: factor.source.org,
      url: factor.source.url,
      lastVerified: factor.lastVerified,
      uncertainty: factor.uncertainty,
    }));
    const water: Row[] = waterFactors.map((factor) => ({
      id: factor.id,
      kind: 'water',
      label: factor.label[lang],
      category: 'water',
      value: `${smart(factor.blue, lang)} / ${smart(factor.green, lang)} / ${smart(factor.grey, lang)}`,
      unit: `${factor.unit}`,
      country: factor.country,
      year: factor.year,
      status: factor.status,
      sourceId: factor.sourceId,
      sourceLabel: factor.source.org,
      url: factor.source.url,
      lastVerified: factor.lastVerified,
      uncertainty: factor.uncertainty,
    }));
    return [...carbon, ...water];
  }, [lang]);

  const filtered = rows.filter((row) => {
    if (kind !== 'all' && row.kind !== kind) return false;
    if (status !== 'all' && row.status !== status) return false;
    if (!query.trim()) return true;
    const haystack = `${row.id} ${row.label} ${row.category} ${row.sourceLabel} ${row.country}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  const counts = {
    carbon: carbonFactors.length,
    water: waterFactors.length,
    sources: Object.keys(sourceRegistry).length,
  };
  const L = (es: string, en: string) => (lang === 'es' ? es : en);
  const sourceEntries = Object.entries(sourceRegistry) as [string, { org: string; title: string; year: number; url: string }][];

  return (
    <div className="container transparency">
      <div className="transparency-hero">
        <p className="eyebrow">{t('transparency.eyebrow')}</p>
        <h1>{t('transparency.title')}</h1>
        <p className="lede">{t('transparency.sub')}</p>
        <div className="row gap-2 wrap mt-5">
          <Chip tone="accent">{t('transparency.factorCount', { n: counts.carbon + counts.water })}</Chip>
          <Chip>{counts.sources} {L('fuentes', 'sources')}</Chip>
          <Chip>{t('transparency.dataVersion')} {DATA_VERSION}</Chip>
        </div>
      </div>

      <div className="method-cards">
        <article className="method-card">
          <span className="icon"><Icon name="cloud" size={20} /></span>
          <h2>{t('transparency.method')} · {L('Carbono', 'Carbon')}</h2>
          <p>{t('transparency.methodCarbon')}</p>
        </article>
        <article className="method-card">
          <span className="icon"><Icon name="droplet" size={20} /></span>
          <h2>{t('transparency.method')} · {L('Agua', 'Water')}</h2>
          <p>{t('transparency.methodWater')}</p>
        </article>
        <article className="method-card">
          <span className="icon"><Icon name="flame" size={20} /></span>
          <h2>GWP · AR5 / AR6</h2>
          <p>{t('transparency.methodGwp')}</p>
        </article>
        <article className="method-card">
          <span className="icon"><Icon name="chart" size={20} /></span>
          <h2>{L('Incertidumbre', 'Uncertainty')}</h2>
          <p>{t('transparency.methodUncertainty')}</p>
        </article>
      </div>

      <section className="section">
        <div className="section-head-sm">
          <div>
            <p className="eyebrow">{t('transparency.sources')}</p>
            <h2>{L('Catálogo de factores, sin cajas negras.', 'Factor catalogue, no black boxes.')}</h2>
            <p className="small muted">{L('Cada fila incluye valor, unidad, región, año, incertidumbre y estado de verificación. Los factores de agua muestran azul / verde / gris.', 'Every row includes value, unit, region, year, uncertainty and verification status. Water factors show blue / green / grey.')}</p>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { exportCatalogJson(); toast('toast.exported'); }}>
            <Icon name="download" size={14} /> {t('transparency.openData')}
          </button>
        </div>

        <div className="factor-toolbar">
          <div className="input-group" style={{ flex: 1 }}>
            <input
              className="input"
              type="search"
              placeholder={t('transparency.search')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={t('transparency.search')}
            />
            <span className="unit"><Icon name="search" size={15} /></span>
          </div>
          <Segmented<Kind>
            value={kind}
            label={L('Tipo de factor', 'Factor type')}
            onChange={setKind}
            options={[
              { value: 'all', label: t('common.all') },
              { value: 'carbon', label: t('wizard.carbon') },
              { value: 'water', label: t('wizard.water') },
            ]}
          />
          <Segmented<StatusFilter>
            value={status}
            label={t('transparency.status')}
            onChange={setStatus}
            options={[
              { value: 'all', label: t('common.all') },
              { value: 'verified', label: t('transparency.verified') },
              { value: 'pending', label: t('transparency.pending') },
              { value: 'screening', label: t('transparency.screening') },
            ]}
          />
          <span className="factor-count">{filtered.length} / {rows.length}</span>
        </div>

        <div className="transparency-grid">
          <div className="table-wrap" style={{ maxHeight: '720px', overflowY: 'auto' }}>
            <table className="data">
              <thead>
                <tr>
                  <th>{t('transparency.factor')}</th>
                  <th>{t('transparency.value')}</th>
                  <th>{t('transparency.unit')}</th>
                  <th>{L('Región', 'Region')}</th>
                  <th>{t('transparency.year')}</th>
                  <th>{L('Incert.', 'Uncert.')}</th>
                  <th>{t('common.source')}</th>
                  <th>{t('transparency.status')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={`${row.kind}-${row.id}`}>
                    <td>
                      <strong style={{ fontSize: '0.78rem' }}>{row.label}</strong>
                      <div className="tiny muted mono">{row.id}</div>
                    </td>
                    <td className="right">{row.value}</td>
                    <td className="mono" style={{ fontSize: '0.7rem' }}>{row.unit}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{row.country === 'GLOBAL' ? (lang === 'es' ? 'Global' : 'Global') : countryLabel(row.country as never, lang)}</td>
                    <td className="right">{row.year}</td>
                    <td className="right">±{nf(row.uncertainty * 100, lang, 0)} %</td>
                    <td>
                      {row.url ? <a href={row.url} target="_blank" rel="noreferrer" className="tiny">{row.sourceLabel} ↗</a> : <span className="tiny">{row.sourceLabel}</span>}
                    </td>
                    <td>
                      <span className={`badge ${row.status === 'verified' ? 'badge-ok' : row.status === 'pending' ? 'badge-warn' : 'badge-info'}`}>
                        {statusLabel(row.status, lang)}
                      </span>
                      <div className="tiny muted">{row.lastVerified}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="small muted" style={{ padding: 18 }}>{t('transparency.noResults')}</p>}
          </div>

          <aside className="card limits-card">
            <div className="panel-title">
              <h3>{t('transparency.limitations')}</h3>
              <Icon name="alert" size={17} style={{ color: 'var(--amber)' }} />
            </div>
            <ol>
              {['lim1', 'lim2', 'lim3', 'lim4', 'lim5', 'lim6'].map((key, index) => (
                <li key={key}><b>{index + 1}</b><span>{t(`transparency.${key}` as never)}</span></li>
              ))}
            </ol>
            <hr />
            <h4 className="mono" style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>{t('transparency.roadmap')}</h4>
            <ul className="roadmap mt-3">
              {['roadmap1', 'roadmap2', 'roadmap3', 'roadmap4', 'roadmap5'].map((key) => (
                <li key={key}>{t(`transparency.${key}` as never)}</li>
              ))}
            </ul>
            <hr />
            <p className="tiny muted">{t('transparency.statusNote')}</p>
            <p className="tiny muted mt-3">{t('transparency.license')}</p>
          </aside>
        </div>
      </section>

      <section className="section">
        <div className="section-head-sm">
          <div>
            <p className="eyebrow">{L('Registro de fuentes', 'Source registry')}</p>
            <h2>{L('De dónde sale cada número.', 'Where every number comes from.')}</h2>
          </div>
          <Chip>{sourceEntries.length}</Chip>
        </div>
        <div className="grid grid-2">
          {sourceEntries.map(([id, source]) => (
            <article className="card card-pad" key={id}>
              <div className="row between gap-3" style={{ alignItems: 'flex-start' }}>
                <div>
                  <p className="tiny mono muted">{id}</p>
                  <h3 className="mt-2">{source.org} · {source.year}</h3>
                  <p className="small muted mt-2">{source.title}</p>
                </div>
                <a className="icon-btn" href={source.url} target="_blank" rel="noreferrer" aria-label={L('Abrir fuente', 'Open source')}>
                  <Icon name="external" size={16} />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
