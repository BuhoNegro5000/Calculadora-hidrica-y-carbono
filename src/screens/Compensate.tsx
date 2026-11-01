import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { useApp } from '../store/app';
import { useFactors } from '../store/factors';
import { navigate } from '../app/router';
import { Icon } from '../components/Icons';
import { Chip, EmptyState, ProgressRing } from '../components/ui';
import { calculate } from '../engine/calculate';
import { residualAfterActions } from '../engine/scenarios';
import { actionsFor } from '../data/actions';
import { nf, smart, tonnes } from '../lib/format';

const CRITERIA = [
  { id: 'q1', label: 'offset.q1', help: 'offset.q1help' },
  { id: 'q2', label: 'offset.q2', help: 'offset.q2help' },
  { id: 'q3', label: 'offset.q3', help: 'offset.q3help' },
  { id: 'q4', label: 'offset.q4', help: 'offset.q4help' },
  { id: 'q5', label: 'offset.q5', help: 'offset.q5help' },
  { id: 'q6', label: 'offset.q6', help: 'offset.q6help' },
] as const;

export function Compensate() {
  const { t, lang } = useI18n();
  const { activeProject } = useApp();
  const { catalog } = useFactors();
  const [criteria, setCriteria] = useState<Record<string, boolean>>({});

  const result = useMemo(() => (activeProject ? calculate(activeProject, catalog) : null), [activeProject, catalog]);

  if (!activeProject || !result) {
    return (
      <div className="container results">
        <EmptyState
          icon="shield"
          title={t('offset.title')}
          text={lang === 'es' ? 'Necesitas un inventario para estimar el residual. La compensación no sustituye la medición.' : 'You need an inventory to estimate the residual. Offsetting does not replace measurement.'}
          action={<button type="button" className="btn btn-primary" onClick={() => navigate('onboarding')}>{t('welcome.cta')}</button>}
        />
      </div>
    );
  }

  const planActions = activeProject.plan
    .map((id) => actionsFor(activeProject.entity).find((action) => action.id === id))
    .filter((action): action is NonNullable<typeof action> => Boolean(action));
  const planPcts = planActions.map((action) => action.impactPct);
  const planPct = Math.min(95, planPcts.reduce((sum, value) => sum + value, 0));
  const residualKg = residualAfterActions(result, planPcts);
  const residualTonnes = residualKg / 1000;
  const selected = CRITERIA.filter((item) => criteria[item.id]).length;
  const score = selected / CRITERIA.length;
  const lowCost = residualTonnes * 10;
  const highCost = residualTonnes * 35;

  const L = (es: string, en: string) => (lang === 'es' ? es : en);

  return (
    <div className="container offset">
      <div className="project-hero">
        <div>
          <p className="eyebrow">{t('offset.eyebrow')}</p>
          <h1>{t('offset.title')}</h1>
          <p className="lede">{t('offset.sub')}</p>
        </div>
        <Chip tone="accent">{L('Sin venta de créditos', 'No credit sales')}</Chip>
      </div>

      <div className="hierarchy">
        {[
          { id: 'avoid', num: '01', title: t('offset.avoid'), desc: t('offset.avoid.desc'), active: false },
          { id: 'reduce', num: '02', title: t('offset.reduce'), desc: t('offset.reduce.desc'), active: planActions.length > 0 },
          { id: 'offset', num: '03', title: t('offset.offset'), desc: t('offset.offset.desc'), active: true },
        ].map((step) => (
          <article className={`hier-step ${step.active ? 'active' : ''}`} key={step.id}>
            <span className="hier-num">{step.num}</span>
            <h2>{step.title}</h2>
            <p>{step.desc}</p>
          </article>
        ))}
      </div>

      <div className="offset-layout mt-6">
        <div className="residual-card">
          <small>{t('offset.residual')}</small>
          <p className="residual-value">{tonnes(residualKg, lang)}<span>t CO₂e</span></p>
          <p>{t('offset.residualNote', { pct: nf(planPct, lang, 0) })}</p>
          <div className="residual-grid">
            <div className="datum">
              <small>{t('offset.cost')}</small>
              <strong>{nf(lowCost, lang, 0)}–{nf(highCost, lang, 0)} USD</strong>
            </div>
            <div className="datum">
              <small>{t('offset.perTon')}</small>
              <strong>10–35 USD</strong>
            </div>
            <div className="datum">
              <small>{L('Huella total', 'Total footprint')}</small>
              <strong>{tonnes(result.totalKgCO2e, lang)} t</strong>
            </div>
            <div className="datum">
              <small>{L('Plan aplicado', 'Plan applied')}</small>
              <strong>{planActions.length} {planActions.length === 1 ? L('acción', 'action') : L('acciones', 'actions')}</strong>
            </div>
          </div>
          <p className="tiny mt-4" style={{ color: 'rgba(248,243,231,.5)' }}>
            {t('offset.costNote')}
          </p>
        </div>

        <div className="card criteria-card">
          <div className="panel-title">
            <div>
              <h2>{t('offset.quality')}</h2>
              <p className="small muted">{t('offset.selectPlan')}</p>
            </div>
            <Chip>{selected}/{CRITERIA.length}</Chip>
          </div>
          {CRITERIA.map((item) => (
            <label className="check" key={item.id}>
              <input
                type="checkbox"
                checked={Boolean(criteria[item.id])}
                onChange={(event) => setCriteria((current) => ({ ...current, [item.id]: event.target.checked }))}
              />
              <span className="check-body">
                <strong>{t(item.label)}</strong>
                <span>{t(item.help)}</span>
              </span>
            </label>
          ))}
          <div className="score-ring">
            <ProgressRing value={score} size={64} label={t('offset.score')} />
            <div>
              <strong>{score >= 0.83 ? L('Portafolio sólido', 'Solid portfolio') : score >= 0.5 ? L('Hay que profundizar', 'Needs more depth') : L('Riesgo alto de greenwashing', 'High greenwashing risk')}</strong>
              <span>{score >= 0.83 ? L('Los seis criterios están cubiertos. Exige evidencia documental, no promesas.', 'All six criteria are covered. Require documentary evidence, not promises.') : L('No compenses hasta poder demostrar los criterios que faltan.', 'Do not offset until you can demonstrate the missing criteria.')}</span>
            </div>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="section-head-sm">
          <div>
            <p className="eyebrow">{t('offset.portfolio')}</p>
            <h2>{L('Tres familias, tres riesgos distintos.', 'Three families, three different risks.')}</h2>
          </div>
          <Chip tone="water">{L('Evidencia antes que precio', 'Evidence before price')}</Chip>
        </div>
        <div className="portfolio-grid">
          <article className="portfolio-card">
            <span className="pct">{L('Permanencia variable', 'Variable permanence')}</span>
            <h3 className="mt-2">{t('offset.nature')}</h3>
            <p>{t('offset.nature.desc')}</p>
            <div className="action-meta mt-3">
              <span className="badge badge-info">{L('MRV obligatorio', 'MRV required')}</span>
              <span className="badge">{L('Salvaguardas', 'Safeguards')}</span>
            </div>
          </article>
          <article className="portfolio-card">
            <span className="pct">{L('Permanencia alta', 'High permanence')}</span>
            <h3 className="mt-2">{t('offset.tech')}</h3>
            <p>{t('offset.tech.desc')}</p>
            <div className="action-meta mt-3">
              <span className="badge badge-warn">{L('Costo alto', 'High cost')}</span>
              <span className="badge">{L('Escala limitada', 'Limited scale')}</span>
            </div>
          </article>
          <article className="portfolio-card">
            <span className="pct">{L('Co-beneficio social', 'Social co-benefit')}</span>
            <h3 className="mt-2">{t('offset.cook')}</h3>
            <p>{t('offset.cook.desc')}</p>
            <div className="action-meta mt-3">
              <span className="badge badge-ok">{L('Impacto local', 'Local impact')}</span>
              <span className="badge">{L('Adicionalidad', 'Additionality')}</span>
            </div>
          </article>
        </div>
      </section>

      <div className="offset-disclaimer mt-6">
        <Icon name="alert" size={18} />
        <div>
          <strong>{t('offset.claim')}</strong>
          <p className="mt-2">{t('offset.disclaimer')}</p>
        </div>
      </div>

      <div className="results-cta">
        <button type="button" className="btn btn-primary" onClick={() => navigate('reduce')}>
          <Icon name="arrow-left" size={16} /> {t('reduce.title')}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => navigate('report')}>
          {t('report.title')}
          <Icon name="arrow-right" size={16} />
        </button>
        <span className="tiny muted" style={{ alignSelf: 'center' }}>
          {L('Residual calculado con', 'Residual calculated with')} {smart(residualKg, lang)} kg CO₂e · {nf(planPct, lang, 0)} % {L('de reducción', 'reduction')}
        </span>
      </div>
    </div>
  );
}
