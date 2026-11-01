import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { useApp } from '../store/app';
import { useFactors } from '../store/factors';
import { navigate } from '../app/router';
import { Icon } from '../components/Icons';
import { Chip, EmptyState } from '../components/ui';
import { calculate } from '../engine/calculate';
import { entityLabel, projectPeriod } from '../engine/project';
import { dateLabel, nf, smart, tonnes } from '../lib/format';
import { exportProjectJson } from '../lib/export';
import type { Project } from '../engine/types';

export function Projects() {
  const { t, lang } = useI18n();
  const { projects, activeId, selectProject, deleteProject, toast } = useApp();
  const { catalog } = useFactors();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [compareA, setCompareA] = useState<string>(projects[0]?.id ?? '');
  const [compareB, setCompareB] = useState<string>(projects[1]?.id ?? '');

  const projectA = projects.find((project) => project.id === compareA);
  const projectB = projects.find((project) => project.id === compareB);
  const resultA = useMemo(() => (projectA ? calculate(projectA, catalog) : null), [projectA, catalog]);
  const resultB = useMemo(() => (projectB ? calculate(projectB, catalog) : null), [projectB, catalog]);
  const confirmProject = projects.find((project) => project.id === confirmId);

  const openProject = (project: Project) => {
    selectProject(project.id);
    navigate('results');
  };

  const carbonDelta = resultA && resultB && resultA.totalKgCO2e > 0
    ? (resultB.totalKgCO2e - resultA.totalKgCO2e) / resultA.totalKgCO2e
    : 0;
  const waterDelta = resultA && resultB && resultA.water.total > 0
    ? (resultB.water.total - resultA.water.total) / resultA.water.total
    : 0;

  return (
    <div className="container projects">
      <div className="project-hero">
        <div>
          <p className="eyebrow">{t('projects.eyebrow')}</p>
          <h1>{t('projects.title')}</h1>
          <p className="lede">{t('projects.sub')}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => navigate('onboarding')}>
          <Icon name="plus" size={16} /> {t('projects.new')}
        </button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon="book"
          title={t('projects.empty')}
          text={lang === 'es' ? 'Un observatorio es un proyecto con límites, periodo y método. Empieza por uno.' : 'An observatory is a project with boundaries, period and method. Start with one.'}
          action={<button type="button" className="btn btn-primary" onClick={() => navigate('onboarding')}>{t('welcome.cta')}</button>}
        />
      ) : (
        <>
          <div className="project-grid">
            {projects.map((project) => {
              const result = calculate(project, catalog);
              return (
                <article className={`project-card ${project.id === activeId ? 'active' : ''}`} key={project.id}>
                  <div className="project-top">
                    <div>
                      <p className="project-type">{entityLabel(project.entity, lang)}</p>
                      <h2 className="mt-2">{project.name}</h2>
                    </div>
                    {project.id === activeId && <Chip tone="accent">{t('common.active')}</Chip>}
                  </div>
                  <div className="project-meta">
                    <Chip>{projectPeriod(project)}</Chip>
                    <Chip>{project.gwp}</Chip>
                    <Chip>{project.scope2Method}</Chip>
                    <Chip>{project.country}</Chip>
                  </div>
                  <div className="project-nums">
                    <div>
                      <small>{t('projects.carbon')}</small>
                      <strong>{tonnes(result.totalKgCO2e, lang)} t</strong>
                    </div>
                    <div>
                      <small>{t('projects.water')}</small>
                      <strong>{smart(result.water.total, lang)} m³</strong>
                    </div>
                  </div>
                  <p className="tiny muted">{t('projects.updated')}: {dateLabel(project.updatedAt, lang)} · {t('projects.local')}</p>
                  <div className="project-actions">
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => openProject(project)}>
                      {t('common.open')}
                      <Icon name="arrow-right" size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      title={t('common.export')}
                      aria-label={`${t('common.export')} JSON`}
                      onClick={() => { exportProjectJson(project, result, lang); toast('toast.exported'); }}
                    >
                      <Icon name="download" size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      aria-label={t('projects.delete')}
                      onClick={() => setConfirmId(project.id)}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <section className="section">
            <div className="section-head-sm">
              <div>
                <p className="eyebrow">{t('projects.compareTitle')}</p>
                <h2>{t('projects.variation')}</h2>
                <p className="small muted">{t('projects.compareSub')}</p>
              </div>
            </div>

            <div className="compare-grid">
              <div className="card compare-panel">
                <p className="eyebrow no-rule">{t('projects.selectTwo')}</p>
                <div className="form-grid mt-4">
                  <label className="field">
                    <span className="field-label">{lang === 'es' ? 'Proyecto A' : 'Project A'}</span>
                    <select className="select" value={compareA} onChange={(event) => { setCompareA(event.target.value); setCompareB(''); }}>
                      <option value="">—</option>
                      {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">{lang === 'es' ? 'Proyecto B' : 'Project B'}</span>
                    <select className="select" value={compareB} onChange={(event) => setCompareB(event.target.value)}>
                      <option value="">—</option>
                      {projects
                        .filter((project) => !projectA || project.entity === projectA.entity)
                        .filter((project) => project.id !== compareA)
                        .map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                    </select>
                  </label>
                </div>
                {projectA && projectB && projectA.entity !== projectB.entity && (
                  <p className="warn warning mt-4"><Icon name="alert" size={14} />{t('projects.sameEntity')}</p>
                )}
                <p className="small muted mt-4">{t('projects.compareSub')}</p>
              </div>

              <div className="card compare-panel">
                <p className="eyebrow no-rule">{t('projects.variation')}</p>
                {!projectA || !projectB || !resultA || !resultB ? (
                  <p className="small muted mt-4">{t('projects.selectTwo')}</p>
                ) : (
                  <>
                    <div className="compare-vs">
                      <div className="compare-side">
                        <small>{projectA.name}</small>
                        <strong>{tonnes(resultA.totalKgCO2e, lang)} t</strong>
                        <span>{smart(resultA.water.total, lang)} m³ · {projectPeriod(projectA)}</span>
                      </div>
                      <span className="vs">vs</span>
                      <div className="compare-side">
                        <small>{projectB.name}</small>
                        <strong>{tonnes(resultB.totalKgCO2e, lang)} t</strong>
                        <span>{smart(resultB.water.total, lang)} m³ · {projectPeriod(projectB)}</span>
                      </div>
                    </div>
                    <div className="compare-delta">
                      <div>
                        <small className="tiny muted">{t('projects.carbon')}</small>
                        <strong className={carbonDelta > 0 ? 'up' : 'down'}>{carbonDelta > 0 ? '+' : ''}{nf(carbonDelta * 100, lang, 1)} %</strong>
                      </div>
                      <div>
                        <small className="tiny muted">{t('projects.water')}</small>
                        <strong className={waterDelta > 0 ? 'up' : 'down'}>{waterDelta > 0 ? '+' : ''}{nf(waterDelta * 100, lang, 1)} %</strong>
                      </div>
                      <div>
                        <small className="tiny muted">{lang === 'es' ? 'Diferencia' : 'Difference'}</small>
                        <strong>{tonnes(Math.abs(resultB.totalKgCO2e - resultA.totalKgCO2e), lang)} t</strong>
                      </div>
                    </div>
                    <p className="tiny muted mt-4">{t('projects.compareSub')}</p>
                  </>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {confirmProject && (
        <div className="overlay center" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmId(null); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <p className="eyebrow no-rule">{t('projects.delete')}</p>
            <h2 id="delete-title" className="mt-2" style={{ fontSize: '1.6rem' }}>{t('projects.deleteConfirm', { name: confirmProject.name })}</h2>
            <p className="lede mt-3" style={{ fontSize: '0.9rem' }}>
              {lang === 'es' ? 'Se borrarán sus respuestas, supuestos y plan. El archivo local no se puede recuperar.' : 'Its answers, assumptions and plan will be deleted. The local file cannot be recovered.'}
            </p>
            <div className="row gap-2 mt-6" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmId(null)}>{t('common.cancel')}</button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  deleteProject(confirmProject.id);
                  setConfirmId(null);
                  toast('toast.deleted');
                }}
              >
                <Icon name="trash" size={15} /> {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
