import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import type { DictKey } from '../i18n';
import { useApp } from '../store/app';
import { useFactors } from '../store/factors';
import { navigate } from '../app/router';
import { Icon, categoryIcon } from '../components/Icons';
import { Chip, ProgressBar } from '../components/ui';
import { Donut } from '../components/charts';
import { answerOf, calculate, visibleQuestions } from '../engine/calculate';
import { categoriesByEntity, detailLabels, questionsFor } from '../data/questions';
import { dietProfiles } from '../engine/factors';
import { electricityFactorFrom, type FactorCatalog } from '../engine/catalog';
import { updateProjectAnswers } from '../engine/project';
import { uid } from '../engine/units';
import { nf, smart, tonnes } from '../lib/format';
import type { CarbonFactor, Project, QuestionDef, UnitCode, WaterFactor } from '../engine/types';

export function Wizard() {
  const { t, lang } = useI18n();
  const { activeProject, updateProject, openSettings, toast } = useApp();
  const { catalog } = useFactors();
  const [categoryId, setCategoryId] = useState<string>('');
  const [estimateOpen, setEstimateOpen] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [customFactor, setCustomFactor] = useState('');
  const [customQty, setCustomQty] = useState(1);
  const [customLabel, setCustomLabel] = useState('');

  const visible = useMemo(() => (activeProject ? visibleQuestions(activeProject) : []), [activeProject]);
  const categories = useMemo(() => {
    if (!activeProject) return [];
    const all = categoriesByEntity[activeProject.entity] ?? [];
    return all.filter((category) => visible.some((question) => question.category === category.id));
  }, [activeProject, visible]);

  const currentCategory = categories.find((category) => category.id === categoryId) ?? categories[0];

  useEffect(() => {
    if (categories.length && !categories.some((category) => category.id === categoryId)) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  useEffect(() => {
    if (!savedFlash) return;
    const timer = window.setTimeout(() => setSavedFlash(false), 1600);
    return () => window.clearTimeout(timer);
  }, [savedFlash]);

  useEffect(() => {
    if (customFactor && (catalog.carbon.has(customFactor) || catalog.water.has(customFactor))) return;
    const first = catalog.carbon.keys().next().value ?? catalog.water.keys().next().value ?? '';
    setCustomFactor(first);
  }, [catalog, customFactor]);

  if (!activeProject) {
    return (
      <div className="container" style={{ padding: '120px 0 100px', textAlign: 'center' }}>
        <h1>—</h1>
        <button type="button" className="btn btn-primary mt-5" onClick={() => navigate('onboarding')}>{t('welcome.cta')}</button>
      </div>
    );
  }

  const result = calculate(activeProject, catalog);
  const questions = currentCategory ? visible.filter((question) => question.category === currentCategory.id) : [];
  const categoryIndex = Math.max(0, categories.findIndex((category) => category.id === currentCategory?.id));
  const answeredCategory = questions.filter((question) => activeProject.touched.includes(question.id)).length;
  const numericCategory = questions.filter((question) => question.kind !== 'choice' && !question.informational).length;
  const detailLabel = detailLabels[activeProject.detail][lang];

  const update = (patch: Partial<Project>) => {
    updateProject({ ...activeProject, ...patch });
    setSavedFlash(true);
  };

  const setAnswer = (question: QuestionDef, value: number | string) => {
    const project = updateProjectAnswers(activeProject, { [question.id]: value });
    const touched = project.touched.includes(question.id) ? project.touched : [...project.touched, question.id];
    const assumptions = { ...project.assumptions };
    delete assumptions[question.id];
    update({ answers: project.answers, touched, assumptions });
  };

  const applyEstimate = (question: QuestionDef) => {
    if (!question.estimate) return;
    const estimate = question.estimate;
    let value = estimate.value;
    let assumption = estimate.note[lang];
    if (estimate.kind === 'area') {
      const area = activeProject.entity === 'company' ? activeProject.areaM2 : estimate.areaDefault ?? 80;
      value = (estimate.intensity ?? estimate.value) * area;
      assumption = t('wizard.estimateArea', { area, intensity: estimate.intensity ?? estimate.value });
    } else if (estimate.kind === 'per_person') {
      const people = activeProject.householdSize || 1;
      value = estimate.value * people;
      assumption = t('wizard.estimatePerPerson', { value: estimate.value, unit: question.unit });
    } else if (estimate.kind === 'per_employee') {
      const people = activeProject.employees || 1;
      value = estimate.value * people;
      assumption = t('wizard.estimatePerPerson', { value: estimate.value, unit: question.unit });
    } else if (estimate.kind === 'per_attendee') {
      const people = activeProject.attendees || 1;
      value = estimate.value * people;
      assumption = t('wizard.estimatePerAttendee', { value: estimate.value, unit: question.unit });
    }
    const project = updateProjectAnswers(activeProject, { [question.id]: Math.round(value * 1000) / 1000 });
    update({
      answers: project.answers,
      touched: project.touched.includes(question.id) ? project.touched : [...project.touched, question.id],
      assumptions: { ...project.assumptions, [question.id]: assumption },
    });
    setEstimateOpen(null);
    toast('wizard.assumptionSaved');
  };

  const goCategory = (id: string) => {
    setCategoryId(id);
    setEstimateOpen(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addCustom = () => {
    const factor = catalog.carbon.get(customFactor) ?? catalog.water.get(customFactor);
    if (!factor || !Number.isFinite(customQty)) return;
    const line = {
      id: uid('custom'),
      factorId: factor.id,
      quantity: customQty,
      unit: factor.unit,
      label: customLabel.trim() || undefined,
      scope: 'scope' in factor ? factor.scope : 3,
    };
    update({ customLines: [...activeProject.customLines, line] });
    setCustomQty(1);
    setCustomLabel('');
    toast('toast.saved');
  };

  const removeCustom = (id: string) => {
    update({ customLines: activeProject.customLines.filter((line) => line.id !== id) });
  };

  return (
    <div className="wizard">
      <div className="container wizard-layout">
        <aside className="cat-rail">
          <p className="eyebrow">{t('wizard.eyebrow', { detail: detailLabel })}</p>
          <p className="rail-title">{t('wizard.progress')}</p>
          <div className="rail-progress">
            <ProgressBar value={result.completeness} label={t('wizard.completeness')} />
          </div>
          <p className="rail-meta">
            {t('wizard.answered', { n: result.answered, total: result.totalQuestions })}
          </p>
          <ul className="cat-list">
            {categories.map((category) => {
              const categoryQuestions = visible.filter((question) => question.category === category.id);
              const done = categoryQuestions.filter((question) => activeProject.touched.includes(question.id)).length;
              return (
                <li key={category.id}>
                  <button
                    type="button"
                    className={category.id === currentCategory?.id ? 'active' : ''}
                    onClick={() => goCategory(category.id)}
                  >
                    <span className="cat-icon"><Icon name={categoryIcon(category.icon)} size={15} /></span>
                    {category.label[lang]}
                    <span className="cat-count">{done}/{categoryQuestions.length}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="wizard-main">
          <header className="wizard-head">
            <div>
              <p className="eyebrow">{t('wizard.step', { current: categoryIndex + 1, total: categories.length })}</p>
              <h1>{currentCategory?.label[lang]}</h1>
              <p>{currentCategory?.description[lang]}</p>
            </div>
            <button type="button" className="wizard-settings-btn" onClick={() => openSettings()}>
              <Icon name="settings" size={15} />
              {t('wizard.openSettings')}
              <span className="badge">{activeProject.gwp} · {activeProject.scope2Method === 'market' ? 'market' : 'location'}</span>
            </button>
          </header>

          <h2 className="sr-only">{t('wizard.questions')}</h2>
          <div className="question-list">
            {questions.map((question) => {
              const value = answerOf(activeProject, question);
              const isTouched = activeProject.touched.includes(question.id);
              const assumption = activeProject.assumptions[question.id];
              return (
                <QuestionCard
                  key={question.id}
                  question={question}
                  value={value}
                  touched={isTouched}
                  assumption={assumption}
                  project={activeProject}
                  lang={lang}
                  t={t}
                  estimateOpen={estimateOpen === question.id}
                  onToggleEstimate={() => setEstimateOpen((current) => current === question.id ? null : question.id)}
                  onEstimate={() => applyEstimate(question)}
                  onChange={(next) => setAnswer(question, next)}
                />
              );
            })}
          </div>

          {currentCategory && numericCategory === 0 && (
            <p className="small muted mt-4">{t('reduce.noLevers')}</p>
          )}

          {activeProject.detail === 'expert' && (
            <section className="custom-box">
              <div className="panel-title">
                <div>
                  <h3>{t('wizard.customTitle')}</h3>
                  <p className="small muted">{t('wizard.customSub')}</p>
                </div>
                <Chip>expert</Chip>
              </div>
              {activeProject.customLines.map((line) => {
                const record = catalog.records.get(line.factorId);
                return (
                  <div className="custom-line" key={line.id} style={{ gridTemplateColumns: '1fr 110px 32px' }}>
                    <div>
                      <span className="field-label">{line.label ?? record?.label[lang] ?? line.factorId}</span>
                      <span className="tiny muted">{record?.sourceOrg} · {record?.dataYear} · {record?.status}</span>
                    </div>
                    <span className="mono" style={{ alignSelf: 'center', fontSize: '0.78rem' }}>{smart(line.quantity, lang)} {line.unit}</span>
                    <button type="button" className="icon-btn" aria-label={t('common.remove')} onClick={() => removeCustom(line.id)}>
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                );
              })}
              {activeProject.customLines.length === 0 && <p className="small muted mb-3">{t('wizard.customEmpty')}</p>}
              <div className="custom-line">
                <label className="field">
                  <span className="field-label">{t('wizard.customFactor')}</span>
                  <select className="select" value={customFactor} onChange={(event) => setCustomFactor(event.target.value)}>
                    <optgroup label={lang === 'es' ? 'Carbono' : 'Carbon'}>
                      {[...catalog.carbon.values()].map((factor) => (
                        <option key={factor.id} value={factor.id}>
                          {factor.label[lang]} · {factor.unit} · {factor.year}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={lang === 'es' ? 'Agua' : 'Water'}>
                      {[...catalog.water.values()].map((factor) => (
                        <option key={factor.id} value={factor.id}>
                          {factor.label[lang]} · {factor.unit} · {factor.year}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">{t('common.quantity')}</span>
                  <input className="input num-input" type="number" min={0} step="any" value={customQty} onChange={(event) => setCustomQty(Number(event.target.value))} />
                </label>
                <label className="field">
                  <span className="field-label">{t('common.unit')}</span>
                  <input className="input" value={catalog.carbon.get(customFactor)?.unit ?? catalog.water.get(customFactor)?.unit ?? ''} readOnly />
                </label>
                <button type="button" className="icon-btn" aria-label={t('wizard.customAdd')} onClick={addCustom} style={{ marginBottom: 2 }}>
                  <Icon name="plus" size={18} />
                </button>
              </div>
            </section>
          )}

          <div className="wizard-footer">
            <button type="button" className="btn btn-outline" onClick={() => goCategory(categories[Math.max(0, categoryIndex - 1)]?.id)} disabled={categoryIndex === 0}>
              <Icon name="arrow-left" size={16} />
              {t('wizard.prevCat')}
            </button>
            {categoryIndex < categories.length - 1 ? (
              <button type="button" className="btn btn-primary" onClick={() => goCategory(categories[categoryIndex + 1].id)}>
                {t('wizard.nextCat')}
                <Icon name="arrow-right" size={16} className="arrow" />
              </button>
            ) : (
              <button type="button" className="btn btn-accent btn-lg" onClick={() => navigate('results')}>
                {t('wizard.finish')}
                <Icon name="arrow-right" size={17} className="arrow" />
              </button>
            )}
          </div>
        </div>

        <aside className="live-panel">
          <div className="live-head">
            <p className="eyebrow no-rule">{t('wizard.live')}</p>
            <h3>{t('wizard.live.note')}</h3>
          </div>
          <div className="live-donut">
            <Donut
              segments={result.byCategory.map((category) => ({ id: category.id, label: category.label[lang], value: category.kgCO2e, color: category.color }))}
              size={150}
              thickness={22}
              centerLabel={lang === 'es' ? 'Total' : 'Total'}
              centerValue={tonnes(result.totalKgCO2e, lang)}
              centerHint="t CO₂e"
              lang={lang}
            />
          </div>
          <div className="live-metrics">
            <div className="live-metric">
              <small><Icon name="cloud" size={12} /> {t('wizard.carbon')}</small>
              <p className="value">{tonnes(result.totalKgCO2e, lang)} <span>t CO₂e</span></p>
              <p className="sub">{activeProject.gwp} · ±{nf(result.uncertaintyPct * 100, lang, 1)} %</p>
            </div>
            <div className="live-metric">
              <small><Icon name="droplet" size={12} /> {t('wizard.water')}</small>
              <p className="value">{smart(result.water.total, lang)} <span>m³</span></p>
              <p className="sub">{lang === 'es' ? 'azul' : 'blue'} {smart(result.water.blue, lang)} · {lang === 'es' ? 'gris' : 'grey'} {smart(result.water.grey, lang)}</p>
            </div>
          </div>
          <div className="live-foot">
            <div className="row">
              <span>{t('wizard.completeness')}</span>
              <strong>{Math.round(result.completeness * 100)} %</strong>
            </div>
            <ProgressBar value={result.completeness} label={t('wizard.completeness')} />
            <div className="row mt-3">
              <span>{t('wizard.answered', { n: result.answered, total: result.totalQuestions })}</span>
              <span className="badge badge-info">{savedFlash ? t('wizard.autosave') : t('common.saved')}</span>
            </div>
          </div>
          <p className="live-note">{t('results.note')}</p>
          <div style={{ padding: '0 var(--sp-5) var(--sp-5)' }}>
            <button type="button" className="btn btn-outline btn-sm" style={{ width: '100%' }} onClick={() => navigate('results')}>
              {t('wizard.finish')}
              <Icon name="arrow-right" size={15} />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ── Tarjeta de pregunta ───────────────────────────────── */

function QuestionCard({
  question, value, touched, assumption, project, lang, t, estimateOpen, onToggleEstimate, onEstimate, onChange,
}: {
  question: QuestionDef;
  value: number | string;
  touched: boolean;
  assumption?: string;
  project: Project;
  lang: 'es' | 'en';
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
  estimateOpen: boolean;
  onToggleEstimate: () => void;
  onEstimate: () => void;
  onChange: (value: number | string) => void;
}) {
  const { catalog } = useFactors();
  const numeric = Number(value);
  const min = question.min ?? 0;
  const max = question.max ?? Math.max(100, numeric * 3, 1);
  const fill = max > min ? ((Math.min(max, Math.max(min, numeric)) - min) / (max - min)) * 100 : 0;
  const factor = resolveFactor(project, question, catalog);
  const factorRecord = factor ? catalog.records.get(factor.id) : undefined;

  return (
    <article className={`question-card ${touched ? 'answered' : ''}`} id={`q-${question.id}`}>
      <div className="question-top">
        <div>
          <p className="question-label">{question.label[lang]}</p>
          {question.help && <p className="question-help">{question.help[lang]}</p>}
        </div>
        <div className="question-status">
          {question.informational ? (
            <Chip>{lang === 'es' ? 'No emite' : 'No emissions'}</Chip>
          ) : touched ? (
            <Chip tone="accent">{lang === 'es' ? 'Dato propio' : 'Own data'}</Chip>
          ) : (
            <Chip>{t('common.typical')}</Chip>
          )}
          {factor && <span className={`badge ${factor.status === 'verified' ? 'badge-ok' : factor.status === 'pending' ? 'badge-warn' : 'badge-info'}`}>{factor.status === 'verified' ? (lang === 'es' ? 'verificado' : 'verified') : factor.status}</span>}
        </div>
      </div>

      {question.kind === 'choice' && question.options && (
        <div className="option-grid" role="group" aria-label={question.label[lang]}>
          {question.options.map((option) => (
            <button
              key={option.value}
              type="button"
              className="option"
              aria-pressed={String(value) === option.value}
              onClick={() => onChange(option.value)}
            >
              {option.label[lang]}
              {option.multiplier && option.multiplier !== 1 && <small>×{option.multiplier}</small>}
            </button>
          ))}
        </div>
      )}

      {question.kind === 'diet' && (
        <div className="diet-grid" role="group" aria-label={question.label[lang]}>
          {dietProfiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              className="diet-card"
              aria-pressed={String(value) === profile.id}
              onClick={() => onChange(profile.id)}
            >
              {profile.label[lang]}
              <small>{profile.description[lang]}</small>
            </button>
          ))}
        </div>
      )}

      {(!question.kind || question.kind === 'number') && (
        <>
          <div className="question-controls">
            {question.min !== undefined && question.max !== undefined && (
              <div className="range-wrap">
                <input
                  className="slider"
                  type="range"
                  min={question.min}
                  max={question.max}
                  step={question.step ?? 1}
                  value={Math.min(question.max, Math.max(question.min, numeric || 0))}
                  style={{ ['--fill' as string]: `${fill}%` }}
                  aria-label={question.label[lang]}
                  onChange={(event) => onChange(Number(event.target.value))}
                />
                <div className="scale">
                  <span>{smart(question.min, lang)}</span>
                  <span>{smart(question.max, lang)}</span>
                </div>
              </div>
            )}
            <NumericField
              value={numeric}
              unit={question.unit}
              min={question.min}
              max={question.max}
              step={question.step}
              lang={lang}
              label={question.label[lang]}
              onChange={onChange}
            />
          </div>

          <div className="question-actions">
            {question.estimate && (
              <>
                <button type="button" className="btn btn-outline btn-sm" onClick={onToggleEstimate}>
                  <Icon name="wand" size={14} />
                  {t('common.notSure')}
                </button>
                <span className="tiny muted">
                  {touched ? '' : t('wizard.useDefault')}
                </span>
              </>
            )}
            {assumption && (
              <span className="tiny" style={{ color: 'var(--water)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="check" size={12} /> {t('wizard.assumptionSaved')}
              </span>
            )}
          </div>

          {estimateOpen && question.estimate && (
            <div className="estimate-panel">
              <div className="estimate-copy">
                <strong>{t('wizard.estimateTitle')}</strong>
                {question.estimate.note[lang]}
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={onEstimate}>
                {t('wizard.estimateApply')}
              </button>
            </div>
          )}
        </>
      )}

      {factor && !question.informational && (
        <p className="tiny muted mt-3 factor-used-line">
          <Icon name="database" size={11} />
          <span>{lang === 'es' ? 'Factor' : 'Factor'}: {factor.label[lang]} · {factor.source.org} ({factor.year}) · {factor.unit}</span>
          {factorRecord?.layer === 'custom' && (
            <span className="badge badge-accent">{lang === 'es' ? `personalizado v${factorRecord.version}` : `custom v${factorRecord.version}`}</span>
          )}
          <a className="factor-edit-link" href={`#/factors/${factor.id}`}>
            {lang === 'es' ? 'ver / editar' : 'view / edit'}
            <Icon name="arrow-up-right" size={11} />
          </a>
        </p>
      )}

      {question.waterOnly && factor && (
        <p className="tiny mt-2" style={{ color: 'var(--water)' }}>
          {lang === 'es' ? 'Solo huella hídrica. Esta línea no suma carbono.' : 'Water footprint only. This line does not add carbon.'}
        </p>
      )}
    </article>
  );
}

function NumericField({
  value, unit, min, max, step, lang, label, onChange,
}: {
  value: number;
  unit: UnitCode;
  min?: number;
  max?: number;
  step?: number;
  lang: 'es' | 'en';
  label: string;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(String(value ?? 0));
  useEffect(() => {
    if (Number(text) !== value) setText(String(value ?? 0));
    // El texto solo se sincroniza cuando el valor externo (estimación) cambia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="input-group">
      <input
        className="input"
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step ?? 'any'}
        value={text}
        aria-label={label}
        onChange={(event) => {
          const raw = event.target.value;
          setText(raw);
          if (raw === '') { onChange(0); return; }
          const next = Number(raw);
          if (Number.isFinite(next)) onChange(next);
        }}
        onBlur={() => setText(String(Number(text) || 0))}
      />
      <span className="unit">{unitLabel(unit, lang)}</span>
    </div>
  );
}

export function unitLabel(unit: UnitCode, lang: 'es' | 'en'): string {
  const labels: Partial<Record<UnitCode, string>> = {
    m3: 'm³', pkm: lang === 'es' ? 'pas·km' : 'pax·km', tkm: 't·km', kWh: 'kWh', MWh: 'MWh',
    night: lang === 'es' ? 'noches' : 'nights', meal: lang === 'es' ? 'comidas' : 'meals',
    USD: 'USD', GB: 'GB', hour: 'h', unit: lang === 'es' ? 'uds' : 'units', m2: 'm²',
  };
  return labels[unit] ?? unit;
}

function resolveFactor(project: Project, question: QuestionDef, catalog: FactorCatalog): CarbonFactor | WaterFactor | undefined {
  if (question.waterOnly && question.waterFactorId) return catalog.water.get(question.waterFactorId);
  if (!question.factorId) return undefined;
  if (question.factorId === '@electricity') return electricityFactorFrom(catalog, project.country);
  if (question.factorSwitch) {
    const source = questionsFor(project.entity).find((item) => item.id === question.factorSwitch?.questionId);
    const selected = String(project.answers[question.factorSwitch.questionId] ?? source?.defaultValue ?? '');
    const id = question.factorSwitch.map[selected];
    return id ? catalog.carbon.get(id) : undefined;
  }
  return catalog.carbon.get(question.factorId);
}
