import { useI18n } from '../i18n';
import { useApp } from '../store/app';
import { useFactors } from '../store/factors';
import { navigate } from '../app/router';
import { Icon } from '../components/Icons';
import { EmptyState } from '../components/ui';
import { calculate } from '../engine/calculate';
import { projectPeriod } from '../engine/project';
import { countryLabel, sectorLabel } from '../engine/benchmarks';
import { exportLinesCsv, exportProjectJson, sourceList } from '../lib/export';
import { dateLabel, nf, smart, statusLabel, tonnes } from '../lib/format';
import { publicAsset } from '../lib/assets';

export function Report() {
  const { t, lang } = useI18n();
  const { activeProject, toast } = useApp();
  const { catalog } = useFactors();

  if (!activeProject) {
    return (
      <div className="container results">
        <EmptyState
          icon="file"
          title={t('report.noProject')}
          text={lang === 'es' ? 'Abre o crea un proyecto para generar el informe.' : 'Open or create a project to generate the report.'}
          action={<button type="button" className="btn btn-primary" onClick={() => navigate('onboarding')}>{t('welcome.cta')}</button>}
        />
      </div>
    );
  }

  const result = calculate(activeProject, catalog);
  const sources = sourceList(result);
  const customSnapshots = result.factorSnapshot.filter((snapshot) => snapshot.layer === 'custom');
  const customRecords = customSnapshots
    .map((snapshot) => catalog.records.get(snapshot.id))
    .filter((record): record is NonNullable<typeof record> => Boolean(record));
  const L = (es: string, en: string) => (lang === 'es' ? es : en);
  const scopeRows = [
    { id: '1', label: t('results.scope1'), value: result.byScope['1'] },
    { id: '2', label: t('results.scope2'), value: result.byScope['2'] },
    { id: '3', label: t('results.scope3'), value: result.byScope['3'] },
  ];
  const assumptions = Object.entries(activeProject.assumptions);

  return (
    <div className="container report-page">
      <div className="report-toolbar no-print">
        <button type="button" className="btn btn-ghost" onClick={() => navigate('results')}>
          <Icon name="arrow-left" size={15} /> {t('report.back')}
        </button>
        <div className="row gap-2 wrap">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { exportLinesCsv(activeProject, result, lang); toast('toast.exported'); }}>
            <Icon name="download" size={14} /> CSV
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { exportProjectJson(activeProject, result, lang); toast('toast.exported'); }}>
            <Icon name="code" size={14} /> JSON
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>
            <Icon name="print" size={14} /> {t('common.print')}
          </button>
        </div>
      </div>

      <article className="paper">
        <header className="paper-head">
          <div className="paper-brand">
            <img src={publicAsset('brand-emblem.webp')} alt="" width={54} height={54} />
            <div>
              <strong>Green Owl Labs</strong>
              <span>{t('app.claim')}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="eyebrow no-rule">{t('report.eyebrow')}</p>
            <p className="tiny muted">{t('report.generated')} {dateLabel(new Date().toISOString(), lang)}</p>
            <p className="tiny muted">GOWL · {activeProject.id.slice(-6).toUpperCase()}</p>
          </div>
        </header>

        <div className="paper-title">
          <p className="eyebrow no-rule">{activeProject.name}</p>
          <h1>{t('report.title')}</h1>
          <div className="paper-meta">
            <div><small>{t('report.prepared')}</small><strong>{activeProject.name}</strong></div>
            <div><small>{t('report.period')}</small><strong>{projectPeriod(activeProject)}</strong></div>
            <div><small>{t('onboarding.baseYear')}</small><strong>{activeProject.baseYear}</strong></div>
            <div><small>{t('onboarding.country')}</small><strong>{countryLabel(activeProject.country, lang)}</strong></div>
            {activeProject.entity === 'company' && <div><small>{t('onboarding.sector')}</small><strong>{sectorLabel(activeProject.sector, lang)}</strong></div>}
            <div><small>{t('onboarding.boundary')}</small><strong>{t(`onboarding.boundary.${activeProject.boundary}` as never)}</strong></div>
          </div>
        </div>

        <section className="paper-section">
          <h2>{t('report.summary')}</h2>
          <div className="paper-kpis">
            <div className="paper-kpi">
              <small>{t('report.carbon')}</small>
              <strong>{tonnes(result.totalKgCO2e, lang)} <span>t CO₂e</span></strong>
              <span>{activeProject.gwp} · ±{nf(result.uncertaintyPct * 100, lang, 0)} % · Scope 2 {activeProject.scope2Method}</span>
            </div>
            <div className="paper-kpi">
              <small>{t('report.water')}</small>
              <strong>{smart(result.water.total, lang)} <span>m³</span></strong>
              <span>{lang === 'es' ? 'Azul' : 'Blue'} {smart(result.water.blue, lang)} · {lang === 'es' ? 'verde' : 'green'} {smart(result.water.green, lang)} · {lang === 'es' ? 'gris' : 'grey'} {smart(result.water.grey, lang)}</span>
            </div>
            <div className="paper-kpi">
              <small>{t('results.completeness')}</small>
              <strong>{nf(result.completeness * 100, lang, 0)} %</strong>
              <span>{t('results.audit')}: {result.lines.length} {lang === 'es' ? 'líneas' : 'lines'}</span>
            </div>
          </div>
          <p className="paper-note mt-5">
            {lang === 'es'
              ? `Este inventario estima ${tonnes(result.totalKgCO2e, lang)} t CO₂e y ${smart(result.water.total, lang)} m³ de agua para ${activeProject.name} en el periodo ${projectPeriod(activeProject)}. El resultado se construye con ${result.lines.length} líneas trazables, cada una con actividad, factor, fuente y año. La incertidumbre combinada es de ±${nf(result.uncertaintyPct * 100, lang, 0)} % y la completitud declarada es ${nf(result.completeness * 100, lang, 0)} %.`
              : `This inventory estimates ${tonnes(result.totalKgCO2e, lang)} t CO₂e and ${smart(result.water.total, lang)} m³ of water for ${activeProject.name} over ${projectPeriod(activeProject)}. The result is built from ${result.lines.length} traceable lines, each with activity, factor, source and year. Combined uncertainty is ±${nf(result.uncertaintyPct * 100, lang, 0)} % and declared completeness is ${nf(result.completeness * 100, lang, 0)} %.`}
          </p>
        </section>

        <section className="paper-section">
          <h2>{t('report.scope')}</h2>
          <table>
            <thead>
              <tr>
                <th>{t('common.method')}</th>
                <th className="right">kg CO₂e</th>
                <th className="right">t CO₂e</th>
                <th className="right">%</th>
              </tr>
            </thead>
            <tbody>
              {scopeRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.label}</td>
                  <td className="right">{smart(row.value, lang)}</td>
                  <td className="right">{tonnes(row.value, lang)}</td>
                  <td className="right">{nf((row.value / (result.totalKgCO2e || 1)) * 100, lang, 0)} %</td>
                </tr>
              ))}
              <tr>
                <td><strong>{t('common.total')}</strong></td>
                <td className="right"><strong>{smart(result.totalKgCO2e, lang)}</strong></td>
                <td className="right"><strong>{tonnes(result.totalKgCO2e, lang)}</strong></td>
                <td className="right"><strong>100 %</strong></td>
              </tr>
            </tbody>
          </table>
          <p className="paper-note mt-3">
            {lang === 'es'
              ? `Scope 2 location-based: ${tonnes(result.scope2.location, lang)} t CO₂e. Scope 2 market-based: ${tonnes(result.scope2.market, lang)} t CO₂e. Los dos valores se reportan en paralelo y no se suman.`
              : `Scope 2 location-based: ${tonnes(result.scope2.location, lang)} t CO₂e. Scope 2 market-based: ${tonnes(result.scope2.market, lang)} t CO₂e. Both values are reported in parallel and are never added.`}
          </p>
        </section>

        <section className="paper-section">
          <h2>{t('report.category')}</h2>
          <table>
            <thead>
              <tr>
                <th>{t('results.category')}</th>
                <th className="right">t CO₂e</th>
                <th className="right">%</th>
                <th className="right">{lang === 'es' ? 'Agua m³' : 'Water m³'}</th>
              </tr>
            </thead>
            <tbody>
              {result.byCategory.map((category) => (
                <tr key={category.id}>
                  <td>{category.label[lang]}</td>
                  <td className="right">{tonnes(category.kgCO2e, lang)}</td>
                  <td className="right">{nf(category.percentage * 100, lang, 0)} %</td>
                  <td className="right">{smart(category.water.blue + category.water.green + category.water.grey, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="paper-section">
          <h2>{t('report.inventory')}</h2>
          <table>
            <thead>
              <tr>
                <th>{t('results.activity')}</th>
                <th>{t('common.unit')}</th>
                <th className="right">kg CO₂e</th>
                <th>{t('common.source')}</th>
                <th className="right">{t('transparency.year')}</th>
                <th>{t('transparency.status')}</th>
              </tr>
            </thead>
            <tbody>
              {result.lines.map((line) => (
                <tr key={line.id}>
                  <td>{line.label[lang]}</td>
                  <td>{smart(line.quantity, lang)} {line.unit}</td>
                  <td className="right">{smart(line.kgCO2e, lang)}</td>
                  <td>{line.source.org} · {line.source.title.slice(0, 42)}{line.source.title.length > 42 ? '…' : ''}</td>
                  <td className="right">{line.factorYear}</td>
                  <td>{statusLabel(line.factorStatus, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="paper-section">
          <h2>{t('report.assumptions')}</h2>
          {assumptions.length === 0 && result.warnings.length === 0 ? (
            <p className="paper-note">{lang === 'es' ? 'No se registraron supuestos adicionales.' : 'No additional assumptions were recorded.'}</p>
          ) : (
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {assumptions.map(([key, value]) => (
                <li className="paper-note" key={key}>• <strong>{key}</strong>: {value}</li>
              ))}
              {result.warnings.map((warning) => (
                <li className="paper-note" key={warning.id}>• {warning.text[lang]}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="paper-section custom-factor-section">
          <h2>
            {lang === 'es' ? 'Factores personalizados utilizados' : 'Custom factors used'}
            <span className="badge badge-accent" style={{ marginLeft: 8 }}>{customRecords.length}</span>
          </h2>
          {customRecords.length === 0 ? (
            <p className="paper-note">
              {lang === 'es'
                ? 'Este inventario usa únicamente la capa base verificada de Green Owl Labs.'
                : 'This inventory uses only the verified Green Owl Labs base layer.'}
            </p>
          ) : (
            <>
              <p className="paper-note">
                {lang === 'es'
                  ? 'Cada fila indica el factor, su versión, fuente, año y motivo. Editar un factor no altera los resultados ya emitidos porque el cálculo guarda una instantánea.'
                  : 'Each row lists the factor, version, source, year and reason. Editing a factor does not change previously issued results because the calculation stores a snapshot.'}
              </p>
              <table>
                <thead>
                  <tr>
                    <th>{t('common.factor')}</th>
                    <th className="right">{lang === 'es' ? 'Versión' : 'Version'}</th>
                    <th>{lang === 'es' ? 'Fuente y año' : 'Source and year'}</th>
                    <th>{lang === 'es' ? 'Motivo' : 'Reason'}</th>
                    <th>{lang === 'es' ? 'Calidad' : 'Quality'}</th>
                  </tr>
                </thead>
                <tbody>
                  {customRecords.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <strong>{record.label[lang]}</strong>
                        <span className="tiny muted" style={{ display: 'block' }}>
                          {record.value} {record.unit} · {record.baseId ? (lang === 'es' ? 'override de base' : 'base override') : (lang === 'es' ? 'factor nuevo' : 'new factor')}
                        </span>
                      </td>
                      <td className="right">v{record.version}</td>
                      <td>
                        {record.sourceOrg} ({record.dataYear})
                        <span className="tiny muted" style={{ display: 'block' }}>{record.sourceTitle}</span>
                      </td>
                      <td>{record.changeReason || '—'}</td>
                      <td>{record.quality} · {record.approval}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {customRecords.some((record) => record.quality === 'estimated' || record.status !== 'verified') && (
                <p className="paper-note" style={{ color: 'var(--warn)', fontWeight: 600 }}>
                  {lang === 'es'
                    ? 'Aviso: hay factores personalizados no verificados o estimados. No uses este informe para verificación externa sin revisión.'
                    : 'Warning: some custom factors are unverified or estimated. Do not use this report for external verification without review.'}
                </p>
              )}
            </>
          )}
        </section>

        <section className="paper-section">
          <h2>{t('report.sources')}</h2>
          <table>
            <thead>
              <tr>
                <th>{t('common.source')}</th>
                <th>{lang === 'es' ? 'Título' : 'Title'}</th>
                <th className="right">{t('transparency.year')}</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source, index) => (
                <tr key={`${source.org}-${index}`}>
                  <td>{source.org}</td>
                  <td>{source.title}</td>
                  <td className="right">{source.year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="paper-foot">
          <div>
            <p>{t('report.disclaimer')}</p>
            <p className="paper-sign mt-3">{t('report.signature')}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p>{t('app.name')} · {t('footer.version')}</p>
            <p>{t('common.method')}: GHG Protocol · ISO 14064-1 · ISO 14046 · WFN</p>
            <p>{t('report.page')} 1 / 1</p>
          </div>
        </footer>
      </article>
      <p className="center tiny muted mt-4 no-print">{t('report.printHint')}</p>
    </div>
  );
}
