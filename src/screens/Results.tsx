import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { useApp } from '../store/app';
import { useFactors } from '../store/factors';
import { navigate } from '../app/router';
import { Icon } from '../components/Icons';
import {
  Chip, EmptyState, OwlFigure, ProgressBar, useCountUp,
} from '../components/ui';
import { BenchmarkBar, Donut, Sunburst } from '../components/charts';
import { calculate } from '../engine/calculate';
import {
  benchmarkCarbon, benchmarkWater, bottlesEquivalent, carKmEquivalent,
  flightEquivalent, peopleWaterEquivalent, poolsEquivalent, resultComparison, woodEquivalentTrees,
} from '../engine/benchmarks';
import { waterStress } from '../engine/factors';
import { exportLinesCsv, exportProjectJson, sourceList } from '../lib/export';
import { nf, smart, statusClass, statusLabel, tonnes } from '../lib/format';

export function Results() {
  const { t, lang } = useI18n();
  const { activeProject, toast } = useApp();
  const { catalog } = useFactors();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const result = useMemo(() => (activeProject ? calculate(activeProject, catalog) : null), [activeProject, catalog]);
  const animatedCarbon = useCountUp(result ? result.totalKgCO2e / 1000 : 0);
  const animatedWater = useCountUp(result ? result.water.total : 0);

  if (!activeProject || !result) {
    return (
      <div className="container results">
        <EmptyState
          icon="compass"
          title={t('results.noData')}
          text={lang === 'es' ? 'Crea un proyecto y responde las preguntas esenciales. En modo Rápido son unos 3 minutos.' : 'Create a project and answer the essential questions. It takes about 3 minutes in Quick mode.'}
          action={<button type="button" className="btn btn-primary" onClick={() => navigate('onboarding')}>{t('welcome.cta')}</button>}
        />
      </div>
    );
  }

  const comparison = resultComparison(activeProject, result);
  const carbonLevel = comparison.carbonSemaphore;
  const waterLevel = comparison.waterSemaphore;
  const confidence = Math.min(1, result.completeness * 0.45 + verifiedShare(result) * 0.55);
  const confidenceLabel = confidence >= 0.7 ? t('results.high') : confidence >= 0.4 ? t('results.medium') : t('results.low');
  const insight = carbonLevel === 'high' ? t('results.insightHigh') : carbonLevel === 'medium' ? t('results.insightMedium') : t('results.insightLow');
  const scope2Value = activeProject.scope2Method === 'market' ? result.scope2.market : result.scope2.location;
  const stress = waterStress(activeProject.country);
  const visibleLines = showAll ? result.lines : result.lines.slice(0, 8);
  const sources = sourceList(result);
  const categoryRows = activeCategory ? result.byCategory.filter((category) => category.id === activeCategory) : result.byCategory;

  return (
    <div className="container results">
      <div className="project-hero">
        <div>
          <p className="eyebrow">{t('results.eyebrow')}</p>
          <h1>{t('results.title')}</h1>
          <p className="lede">{activeProject.name} · {activeProject.periodStart.slice(0, 7)} → {activeProject.periodEnd.slice(0, 7)} · {activeProject.gwp} · Scope 2 {activeProject.scope2Method}</p>
        </div>
        <div className="row gap-2 wrap">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { exportLinesCsv(activeProject, result, lang); toast('toast.exported'); }}>
            <Icon name="download" size={15} /> CSV
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { exportProjectJson(activeProject, result, lang); toast('toast.exported'); }}>
            <Icon name="code" size={15} /> JSON
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('report')}>
            <Icon name="file" size={15} /> {t('results.downloadReport')}
          </button>
        </div>
      </div>

      <section className="results-hero anim-up">
        <div>
          <div className="results-total-label">
            <Icon name="cloud" size={15} /> {t('results.total')}
            <span className={`semaphore ${carbonLevel}`}><span className="dot" />{carbonLevel === 'low' ? t('results.low') : carbonLevel === 'medium' ? t('results.medium') : t('results.high')}</span>
          </div>
          <div className="result-number">
            <span className="big">{smart(animatedCarbon, lang)}</span>
            <span className="unit">t CO₂e</span>
          </div>
          <div className="result-sub">
            <div className="datum">
              <small>{t('results.range')}</small>
              <strong className="num">{tonnes(result.lowKgCO2e, lang)} – {tonnes(result.highKgCO2e, lang)} t</strong>
            </div>
            {result.perUnit && (
              <div className="datum">
                <small>{t('results.perUnit')}</small>
                <strong className="num">{smart(result.perUnit.value, lang)} kg / {result.perUnit.label[lang]}</strong>
              </div>
            )}
            <div className="datum">
              <small>{t('results.waterTotal')}</small>
              <strong className="num">{smart(animatedWater, lang)} m³</strong>
            </div>
            <div className="datum">
              <small>{t('results.completeness')}</small>
              <strong className="num">{Math.round(result.completeness * 100)} %</strong>
            </div>
          </div>
          <p className="small muted mt-4" style={{ maxWidth: '62ch', lineHeight: 1.5 }}>{insight}</p>
        </div>

        <div className="confidence-card">
          <div className="confidence-top">
            <OwlFigure level={carbonLevel} size={96} />
            <div className="confidence-copy">
              <p className="eyebrow no-rule">{t('results.confidence')}</p>
              <h2 className="confidence-level">{confidenceLabel}</h2>
              <p>{confidence >= 0.7 ? t('results.confidenceHigh') : confidence >= 0.4 ? t('results.confidenceMedium') : t('results.confidenceLow')}</p>
            </div>
          </div>
          <div className="confidence-bars">
            <div className="datum">
              <small>{t('results.completeness')}</small>
              <strong>{Math.round(result.completeness * 100)} %</strong>
              <ProgressBar value={result.completeness} label={t('results.completeness')} />
            </div>
            <div className="datum">
              <small>{t('results.confidence')}</small>
              <strong>{Math.round(confidence * 100)} %</strong>
              <ProgressBar value={confidence} label={t('results.confidence')} />
            </div>
          </div>
          <div className="row between gap-2" style={{ paddingTop: 4 }}>
            <span className="tiny muted">{t('results.scopeNote')}</span>
          </div>
        </div>
      </section>

      {result.warnings.length > 0 && (
        <div className="warn-list mt-5">
          {result.warnings.map((warning) => (
            <div className={`warn ${warning.severity}`} key={warning.id}>
              <Icon name={warning.severity === 'warning' ? 'alert' : 'info'} size={15} />
              <span>{warning.text[lang]}</span>
            </div>
          ))}
        </div>
      )}

      <section className="section">
        <div className="section-head-sm">
          <div>
            <p className="eyebrow">{t('results.equivalences')}</p>
            <h2>{lang === 'es' ? 'Para dimensionarlo sin perder la escala.' : 'To size it without losing scale.'}</h2>
          </div>
          <Chip tone="accent">{activeProject.country} · {activeProject.gwp}</Chip>
        </div>
        <div className="equiv-grid">
          <div className="equiv">
            <span className="eq-icon"><Icon name="tree" size={21} /></span>
            <strong>{smart(woodEquivalentTrees(result.totalKgCO2e), lang)}</strong>
            <span>{t('results.trees')}</span>
          </div>
          <div className="equiv">
            <span className="eq-icon"><Icon name="plane" size={21} /></span>
            <strong>{smart(flightEquivalent(result.totalKgCO2e), lang)}</strong>
            <span>{t('results.flights')}</span>
          </div>
          <div className="equiv">
            <span className="eq-icon"><Icon name="car" size={21} /></span>
            <strong>{smart(carKmEquivalent(result.totalKgCO2e), lang)}</strong>
            <span>{t('results.cars')}</span>
          </div>
          <div className="equiv">
            <span className="eq-icon"><Icon name="pool" size={21} /></span>
            <strong>{smart(poolsEquivalent(result.water.total), lang)}</strong>
            <span>{t('results.pools')} · {lang === 'es' ? 'agua' : 'water'}</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head-sm">
          <div>
            <p className="eyebrow">{t('results.breakdown')}</p>
            <h2>{t('results.breakdownSub')}</h2>
          </div>
          <button type="button" className="link-arrow" onClick={() => navigate('transparency')}>
            {t('results.transparency')} <Icon name="arrow-right" size={14} />
          </button>
        </div>

        <div className="result-grid">
          <div className="card breakdown-card">
            <div className="breakdown-layout">
              <Sunburst
                result={result}
                size={286}
                lang={lang}
                activeCategory={activeCategory}
                onActiveCategory={setActiveCategory}
              />
              <div>
                <div className="category-rows">
                  {categoryRows.map((category) => (
                    <button
                      type="button"
                      key={category.id}
                      className={`category-row ${activeCategory === category.id ? 'active' : ''}`}
                      onMouseEnter={() => setActiveCategory(category.id)}
                      onMouseLeave={() => setActiveCategory(null)}
                      onFocus={() => setActiveCategory(category.id)}
                      onBlur={() => setActiveCategory(null)}
                      onClick={() => setActiveCategory((current) => current === category.id ? null : category.id)}
                    >
                      <span className="swatch" style={{ background: category.color }} />
                      <span className="cat-name">{category.label[lang]}</span>
                      <span className="cat-val">{tonnes(category.kgCO2e, lang)} t · {nf(category.percentage * 100, lang, 0)} %</span>
                      <span className="cat-bar"><span style={{ width: `${category.percentage * 100}%`, background: category.color }} /></span>
                    </button>
                  ))}
                </div>
                {activeCategory && (
                  <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={() => setActiveCategory(null)}>
                    <Icon name="close" size={13} /> {lang === 'es' ? 'Ver todas' : 'Show all'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="side-stack">
            <div className="card scope-card">
              <div className="panel-title">
                <h3>{t('results.breakdown')}</h3>
                <span className="tiny muted">{t('results.byCategory')}</span>
              </div>
              {(['1', '2', '3'] as const).map((scope) => (
                <div className="scope-row" key={scope}>
                  <span className="scope-badge">{scope}</span>
                  <div className="scope-body">
                    <strong>{scope === '1' ? t('results.scope1') : scope === '2' ? t('results.scope2') : t('results.scope3')}</strong>
                    <span>{scope === '2' ? `${t('results.location')}: ${tonnes(result.scope2.location, lang)} t · ${t('results.market')}: ${tonnes(result.scope2.market, lang)} t` : `${nf((result.byScope[scope] / (result.totalKgCO2e || 1)) * 100, lang, 0)} %`}</span>
                  </div>
                  <span className="scope-value">{tonnes(result.byScope[scope], lang)} t</span>
                </div>
              ))}
              <div className="water-foot" style={{ marginTop: 10 }}>
                <div className="datum">
                  <small>{lang === 'es' ? 'Scope 2 declarado' : 'Reported Scope 2'}</small>
                  <strong>{tonnes(scope2Value, lang)} t</strong>
                </div>
                <div className="datum">
                  <small>{lang === 'es' ? 'Método' : 'Method'}</small>
                  <strong>{activeProject.scope2Method}</strong>
                </div>
              </div>
            </div>

            <div className="card bench-card">
              <div className="panel-title">
                <h3>{t('results.vs')}</h3>
                <span className={`semaphore ${carbonLevel}`}>{carbonLevel === 'low' ? t('results.low') : carbonLevel === 'medium' ? t('results.medium') : t('results.high')}</span>
              </div>
              <div className="bench-row">
                <div className="bench-top">
                  <small>{t('results.total')}</small>
                  <strong>{tonnes(result.totalKgCO2e, lang)} t</strong>
                </div>
                <BenchmarkBar
                  value={result.totalKgCO2e}
                  reference={benchmarkCarbon(activeProject).value}
                  labelValue={`${tonnes(result.totalKgCO2e, lang)} t`}
                  labelRef={`${tonnes(benchmarkCarbon(activeProject).value, lang)} t`}
                />
                <p className="tiny muted mt-2">{benchmarkCarbon(activeProject).label[lang]}</p>
              </div>
              <div className="bench-row">
                <div className="bench-top">
                  <small>{t('results.waterTotal')}</small>
                  <strong>{smart(result.water.total, lang)} m³</strong>
                </div>
                <BenchmarkBar
                  value={result.water.total}
                  reference={benchmarkWater(activeProject).value}
                  labelValue={`${smart(result.water.total, lang)} m³`}
                  labelRef={`${smart(benchmarkWater(activeProject).value, lang)} m³`}
                />
                <p className="tiny muted mt-2">{benchmarkWater(activeProject).label[lang]}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head-sm">
          <div>
            <p className="eyebrow">{t('results.water')}</p>
            <h2>{t('results.waterSub')}</h2>
          </div>
          <Chip tone="water">{lang === 'es' ? 'WFN · ISO 14046' : 'WFN · ISO 14046'}</Chip>
        </div>

        <div className="water-card">
          <Donut
            segments={[
              { id: 'blue', label: t('results.blue'), value: result.water.blue, color: 'var(--water-600)' },
              { id: 'green', label: t('results.green'), value: result.water.green, color: 'var(--lime-500)' },
              { id: 'grey', label: t('results.grey'), value: result.water.grey, color: 'var(--ink-300)' },
            ]}
            size={230}
            thickness={30}
            centerLabel={t('results.waterTotal')}
            centerValue={smart(result.water.total, lang)}
            centerHint="m³"
            lang={lang}
          />
          <div>
            <div className="water-legend">
              {[
                { id: 'blue', label: t('results.blue'), desc: t('results.blue.desc'), value: result.water.blue, color: 'var(--water-600)' },
                { id: 'green', label: t('results.green'), desc: t('results.green.desc'), value: result.water.green, color: 'var(--lime-500)' },
                { id: 'grey', label: t('results.grey'), desc: t('results.grey.desc'), value: result.water.grey, color: 'var(--ink-300)' },
              ].map((item) => (
                <div className="water-key" key={item.id}>
                  <span className="swatch" style={{ background: item.color }} />
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.desc}</p>
                  </div>
                  <span className="value">{smart(item.value, lang)} m³</span>
                </div>
              ))}
            </div>
            <div className="water-foot">
              <div className="datum"><small>{t('results.direct')}</small><strong>{smart(result.water.direct, lang)} m³</strong></div>
              <div className="datum"><small>{t('results.indirect')}</small><strong>{smart(result.water.indirect, lang)} m³</strong></div>
              <div className="datum"><small>{lang === 'es' ? 'Botellas de 500 ml' : '500 ml bottles'}</small><strong>{smart(bottlesEquivalent(result.water.total), lang)}</strong></div>
              <div className="datum"><small>{lang === 'es' ? 'Personas/año' : 'People/year'}</small><strong>{smart(peopleWaterEquivalent(result.water.total, activeProject.country), lang)}</strong></div>
            </div>
            {activeProject.waterStress && (
              <div className="target-note mt-4">
                <Icon name="pin" size={15} />
                <span>
                  {t('results.scarce')}: <strong>{smart(result.water.blueScarce, lang)} {t('results.scarceUnit')}</strong>.
                  {' '}{lang === 'es' ? `AWARE ${stress.aware} · WRI ${stress.wriCategory} para ${activeProject.country}.` : `AWARE ${stress.aware} · WRI ${stress.wriCategory} for ${activeProject.country}.`}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head-sm">
          <div>
            <p className="eyebrow">{t('results.audit')}</p>
            <h2>{t('results.auditSub')}</h2>
          </div>
          <div className="row gap-2">
            <Chip>{t('results.openAudit', { n: result.lines.length })}</Chip>
            <button type="button" className="link-arrow" onClick={() => navigate('transparency')}>
              {t('nav.transparency')} <Icon name="arrow-right" size={14} />
            </button>
          </div>
        </div>

        <div className="audit-list">
          {visibleLines.map((line) => (
            <div className="audit-line" key={line.id}>
              <div className="a-label">
                <strong>{line.label[lang]}</strong>
                <span>
                  {line.categoryLabel[lang]} · {line.source.org} ({line.factorYear})
                  {line.factorLayer === 'custom' && <span className="badge badge-accent" style={{ marginLeft: 6 }}>{lang === 'es' ? `personalizado v${line.factorVersion}` : `custom v${line.factorVersion}`}</span>}
                  <a className="factor-edit-link" href={`#/factors/${line.factorId}`}>{lang === 'es' ? 'factor' : 'factor'} <Icon name="arrow-up-right" size={10} /></a>
                </span>
              </div>
              <span className="a-math">{smart(line.quantity, lang)} {line.unit} × {smart(line.factorValue, lang)}</span>
              <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--ink-mute)' }}>{line.scope === 2 ? `${activeProject.scope2Method === 'market' ? 'market' : 'location'}` : `S${line.scope}`}</span>
              <span className="a-kg">{smart(line.kgCO2e, lang)} kg</span>
              <span className={`a-status badge ${statusClass(line.factorStatus)}`}>{statusLabel(line.factorStatus, lang)}</span>
            </div>
          ))}
        </div>
        {result.lines.length > 8 && (
          <div className="audit-toggle">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAll((current) => !current)}>
              {showAll ? (lang === 'es' ? 'Mostrar menos' : 'Show less') : t('results.openAudit', { n: result.lines.length })}
              <Icon name={showAll ? 'chevron-down' : 'chevron-right'} size={14} style={{ transform: showAll ? 'rotate(180deg)' : undefined }} />
            </button>
          </div>
        )}
        <p className="tiny muted mt-3">
          {lang === 'es' ? `${sources.length} fuentes citadas en este inventario.` : `${sources.length} sources cited in this inventory.`} · {t('results.note')}
        </p>
      </section>

      <div className="results-cta">
        <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate('reduce')}>
          {t('results.goReduce')}
          <Icon name="arrow-right" size={17} className="arrow" />
        </button>
        <button type="button" className="btn btn-outline btn-lg" onClick={() => navigate('offset')}>
          {t('results.goOffset')}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('measure')}>
          <Icon name="edit" size={15} /> {t('nav.measure')}
        </button>
      </div>
    </div>
  );
}

function verifiedShare(result: ReturnType<typeof calculate>): number {
  const total = result.totalKgCO2e;
  if (!total) return 0;
  const verified = result.lines
    .filter((line) => line.factorStatus === 'verified')
    .reduce((sum, line) => sum + line.kgCO2e, 0);
  return verified / total;
}
