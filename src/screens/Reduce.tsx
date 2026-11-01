import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { useApp } from '../store/app';
import { useFactors } from '../store/factors';
import { navigate } from '../app/router';
import { Icon } from '../components/Icons';
import { Chip, EmptyState, ProgressBar } from '../components/ui';
import { TrajectoryChart } from '../components/charts';
import { calculate } from '../engine/calculate';
import {
  applyScenario, availableLevers, buildTrajectory, initialScenario, requiredAnnualReductionPct,
  residualAfterActions, SBTI_ANNUAL_LINEAR, scenarioSummary, TARGET_YEARS,
} from '../engine/scenarios';
import { actionsFor } from '../data/actions';
import { nf, smart, tonnes } from '../lib/format';
import type { ScenarioValues } from '../engine/types';

export function Reduce() {
  const { t, lang } = useI18n();
  const { activeProject, updateProject, toast } = useApp();
  const { catalog } = useFactors();
  const [scenario, setScenario] = useState<ScenarioValues>({ ...initialScenario });
  const [targetYear, setTargetYear] = useState<number>(2030);

  const current = useMemo(() => (activeProject ? calculate(activeProject, catalog) : null), [activeProject, catalog]);
  const scenarioProject = useMemo(
    () => (activeProject ? applyScenario(activeProject, scenario) : null),
    [activeProject, scenario],
  );
  const projected = useMemo(() => (scenarioProject ? calculate(scenarioProject, catalog) : null), [scenarioProject, catalog]);

  if (!activeProject || !current || !projected) {
    return (
      <div className="container results">
        <EmptyState
          icon="target"
          title={t('reduce.noLevers')}
          text={lang === 'es' ? 'Primero necesitas un inventario. Vuelve a Medir y completa energía, movilidad o vuelos.' : 'You need an inventory first. Go back to Measure and complete energy, mobility or flights.'}
          action={<button type="button" className="btn btn-primary" onClick={() => navigate('measure')}>{t('nav.measure')}</button>}
        />
      </div>
    );
  }

  const levers = availableLevers(activeProject);
  const summary = scenarioSummary(current, projected);
  const startYear = new Date().getFullYear();
  const years = Math.max(1, targetYear - startYear);
  const required = requiredAnnualReductionPct(current.totalKgCO2e, targetYear, startYear);
  const scenarioAnnual = current.totalKgCO2e > 0
    ? (1 - Math.pow(Math.max(0.001, projected.totalKgCO2e / current.totalKgCO2e), 1 / years)) * 100
    : 0;
  const gap = Math.max(0, projected.totalKgCO2e - current.totalKgCO2e * 0.1);
  const trajectory = buildTrajectory(current.totalKgCO2e, projected.totalKgCO2e, targetYear, startYear);

  const actions = actionsFor(activeProject.entity)
    .slice()
    .sort((a, b) => (b.impactPct / (b.cost + 0.5)) - (a.impactPct / (a.cost + 0.5)));
  const planActions = activeProject.plan
    .map((id) => actionsFor(activeProject.entity).find((action) => action.id === id))
    .filter((action): action is NonNullable<typeof action> => Boolean(action));
  const planPcts = planActions.map((action) => action.impactPct);
  const planReductionPct = Math.min(95, planPcts.reduce((sum, value) => sum + value, 0));
  const residual = residualAfterActions(current, planPcts);

  const updateScenario = (id: keyof ScenarioValues, value: number) => {
    setScenario((currentScenario) => ({ ...currentScenario, [id]: value }));
  };

  const togglePlan = (id: string) => {
    const inPlan = activeProject.plan.includes(id);
    const plan = inPlan ? activeProject.plan.filter((item) => item !== id) : [...activeProject.plan, id];
    updateProject({ ...activeProject, plan });
    toast('toast.plan');
  };

  const costLabel = (cost: number) => cost === 1 ? t('reduce.lowCost') : cost === 2 ? t('reduce.mediumCost') : t('reduce.highCost');
  const effortLabel = (effort: number) => effort === 1 ? t('reduce.lowEffort') : effort === 2 ? t('reduce.mediumEffort') : t('reduce.highEffort');

  return (
    <div className="container reduce">
      <div className="project-hero">
        <div>
          <p className="eyebrow">{t('reduce.eyebrow')}</p>
          <h1>{t('reduce.title')}</h1>
          <p className="lede">{t('reduce.sub')}</p>
        </div>
        <div className="row gap-2 wrap">
          <Chip tone="accent">{lang === 'es' ? 'Cálculo en vivo' : 'Live calculation'}</Chip>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setScenario({ ...initialScenario })}>
            <Icon name="refresh" size={14} /> {t('common.reset')}
          </button>
        </div>
      </div>

      <div className="reduce-layout">
        <aside className="card levers-card">
          <div className="panel-title">
            <h2>{t('reduce.levers')}</h2>
            <span className="tiny muted">{levers.length}</span>
          </div>
          {levers.length === 0 && <p className="small muted">{t('reduce.noLevers')}</p>}
          {levers.map((lever) => {
            const value = scenario[lever.id as keyof ScenarioValues];
            return (
              <div className="lever" key={lever.id}>
                <div className="lever-head">
                  <span className="lever-dot" style={{ background: lever.color }} />
                  <strong>{lever.label[lang]}</strong>
                  <span className="lever-val">{value} %</span>
                </div>
                <p>{lever.description[lang]}</p>
                <input
                  className="slider"
                  type="range"
                  min={0}
                  max={lever.maxPct}
                  step={5}
                  value={value}
                  style={{ ['--fill' as string]: `${(value / lever.maxPct) * 100}%` }}
                  aria-label={lever.label[lang]}
                  onChange={(event) => updateScenario(lever.id as keyof ScenarioValues, Number(event.target.value))}
                />
              </div>
            );
          })}
          <button type="button" className="btn btn-outline btn-sm mt-3" style={{ width: '100%' }} onClick={() => setScenario({ ...initialScenario })}>
            {t('common.reset')}
          </button>
        </aside>

        <div className="dash-stack">
          <div className="scenario-top" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
            <div className="scenario-stat">
              <small>{t('reduce.current')}</small>
              <strong>{tonnes(current.totalKgCO2e, lang)} <small>t</small></strong>
              <div className="delta">{nf(current.completeness * 100, lang, 0)} % {t('results.completeness').toLowerCase()}</div>
            </div>
            <div className="scenario-stat">
              <small>{t('reduce.projected')}</small>
              <strong>{tonnes(projected.totalKgCO2e, lang)} <small>t</small></strong>
              <div className="delta">{summary.reductionPct === 0 ? '' : summary.reductionPct > 0 ? '−' : '+'}{nf(Math.abs(summary.reductionPct), lang, 1)} % CO₂e</div>
            </div>
            <div className="scenario-stat">
              <small>{t('reduce.reduction')}</small>
              <strong>{tonnes(summary.reductionKg, lang)} <small>t</small></strong>
              <div className="delta">{lang === 'es' ? 'evitadas' : 'avoided'}</div>
            </div>
            <div className="scenario-stat">
              <small>{t('reduce.water')}</small>
              <strong>{smart(summary.reductionWater, lang)} <small>m³</small></strong>
              <div className="delta">{nf(summary.reductionWaterPct, lang, 1)} %</div>
            </div>
          </div>

          <div className="card trajectory-card">
            <div className="panel-title">
              <div>
                <h2>{t('reduce.target')}</h2>
                <p className="small muted">{t('reduce.targetSub')}</p>
              </div>
              <span className={`badge ${scenarioAnnual >= required ? 'badge-ok' : 'badge-warn'}`}>
                {scenarioAnnual >= required ? t('reduce.good') : t('reduce.behind')}
              </span>
            </div>

            <div className="target-controls">
              <label className="field">
                <span className="field-label">{t('reduce.year')}</span>
                <select className="select" value={targetYear} onChange={(event) => setTargetYear(Number(event.target.value))}>
                  {TARGET_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </label>
              <div className="datum">
                <small>{t('reduce.required')}</small>
                <strong className="num">{nf(required, lang, 1)} % / {lang === 'es' ? 'año' : 'yr'}</strong>
              </div>
              <div className="datum">
                <small>{t('reduce.annual')}</small>
                <strong className="num">{nf(scenarioAnnual, lang, 1)} % / {lang === 'es' ? 'año' : 'yr'}</strong>
              </div>
              <div className="datum">
                <small>{t('reduce.gap')}</small>
                <strong className="num">{tonnes(gap, lang)} t</strong>
              </div>
            </div>

            <div className="chart-legend">
              <span><i style={{ background: 'var(--ink-300)' }} /> {t('reduce.baseline')}</span>
              <span><i style={{ background: 'var(--forest-600)' }} /> {t('reduce.path')}</span>
              <span><i style={{ background: 'var(--water-500)' }} /> {t('reduce.scenarioLine')}</span>
            </div>
            <TrajectoryChart points={trajectory} lang={lang} height={250} />
            <div className="target-note mt-3">
              <Icon name="target" size={15} />
              <span>
                <strong>{t('reduce.sbti')}:</strong> {t('reduce.sbtiNote')} {lang === 'es' ? `Tu escenario evita ${tonnes(summary.reductionKg, lang)} t para ${targetYear}.` : `Your scenario avoids ${tonnes(summary.reductionKg, lang)} t by ${targetYear}.`}
              </span>
            </div>
          </div>

          <div>
            <div className="section-head-sm">
              <div>
                <p className="eyebrow">{t('reduce.actions')}</p>
                <h2>{t('reduce.plan')}</h2>
                <p className="small muted">{t('reduce.actionsSub')}</p>
              </div>
              <Chip>{actions.length} {lang === 'es' ? 'acciones' : 'actions'}</Chip>
            </div>

            <div className="action-grid">
              {actions.map((action) => {
                const inPlan = activeProject.plan.includes(action.id);
                return (
                  <article className={`action-card ${inPlan ? 'in-plan' : ''}`} key={action.id}>
                    <div className="action-top">
                      <h3>{action.title[lang]}</h3>
                      <div className="action-impact"><strong>{action.impactPct}</strong><span>%</span></div>
                    </div>
                    <p>{action.description[lang]}</p>
                    <div className="action-meta">
                      <span className="badge">{t('reduce.cost')}: {costLabel(action.cost)}</span>
                      <span className="badge">{t('reduce.effort')}: {effortLabel(action.effort)}</span>
                      <span className="badge badge-info">{action.timeframe[lang]}</span>
                    </div>
                    <div className="action-foot">
                      <span className="sdg">{action.sdg}</span>
                      <button type="button" className={`btn ${inPlan ? 'btn-accent' : 'btn-outline'} btn-sm`} onClick={() => togglePlan(action.id)}>
                        <Icon name={inPlan ? 'check' : 'plus'} size={14} />
                        {inPlan ? t('reduce.inPlan') : t('reduce.addPlan')}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="card card-pad">
            <div className="panel-title">
              <div>
                <h3>{t('reduce.plan')}</h3>
                <p className="small muted">{t('reduce.planEmpty')}</p>
              </div>
              {planActions.length > 0 && <Chip tone="accent">{planActions.length} {lang === 'es' ? 'acciones' : 'actions'}</Chip>}
            </div>

            {planActions.length === 0 ? (
              <p className="small muted">{t('reduce.planEmpty')}</p>
            ) : (
              <>
                <div className="plan-list">
                  {planActions.map((action, index) => (
                    <div className="plan-item" key={action.id}>
                      <span className="plan-index">{index + 1}</span>
                      <div className="plan-body">
                        <strong>{action.title[lang]}</strong>
                        <span>{action.timeframe[lang]} · {costLabel(action.cost)}</span>
                      </div>
                      <span className="plan-kg">−{action.impactPct} %</span>
                      <button type="button" className="icon-btn" aria-label={t('common.remove')} onClick={() => togglePlan(action.id)}>
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="water-foot mt-4">
                  <div className="datum">
                    <small>{t('reduce.planImpact')}</small>
                    <strong className="num">{nf(planReductionPct, lang, 0)} %</strong>
                    <ProgressBar value={planReductionPct / 100} label={t('reduce.planImpact')} />
                  </div>
                  <div className="datum">
                    <small>{t('reduce.residual')}</small>
                    <strong className="num">{tonnes(residual, lang)} t CO₂e</strong>
                  </div>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('offset')}>
                    {t('results.goOffset')}
                    <Icon name="arrow-right" size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
