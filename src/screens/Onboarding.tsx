import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { useApp } from '../store/app';
import { navigate } from '../app/router';
import { Icon } from '../components/Icons';
import type { Boundary, CountryCode, DetailLevel, EntityType } from '../engine/types';
import { COUNTRIES, SECTORS } from '../engine/benchmarks';
import { answersFor, defaultPeriod, makeProject } from '../engine/project';
import { Chip } from '../components/ui';

const ENTITIES: { id: EntityType; icon: 'users' | 'building' | 'calendar' | 'box'; key: 'onboarding.type.person' | 'onboarding.type.company' | 'onboarding.type.event' | 'onboarding.type.product'; desc: 'onboarding.type.person.desc' | 'onboarding.type.company.desc' | 'onboarding.type.event.desc' | 'onboarding.type.product.desc' }[] = [
  { id: 'person', icon: 'users', key: 'onboarding.type.person', desc: 'onboarding.type.person.desc' },
  { id: 'company', icon: 'building', key: 'onboarding.type.company', desc: 'onboarding.type.company.desc' },
  { id: 'event', icon: 'calendar', key: 'onboarding.type.event', desc: 'onboarding.type.event.desc' },
  { id: 'product', icon: 'box', key: 'onboarding.type.product', desc: 'onboarding.type.product.desc' },
];

const DETAILS: { id: DetailLevel; key: 'onboarding.detail.quick' | 'onboarding.detail.standard' | 'onboarding.detail.expert'; desc: 'onboarding.detail.quick.desc' | 'onboarding.detail.standard.desc' | 'onboarding.detail.expert.desc'; time: 'onboarding.detail.quick.time' | 'onboarding.detail.standard.time' | 'onboarding.detail.expert.time'; bars: number }[] = [
  { id: 'quick', key: 'onboarding.detail.quick', desc: 'onboarding.detail.quick.desc', time: 'onboarding.detail.quick.time', bars: 1 },
  { id: 'standard', key: 'onboarding.detail.standard', desc: 'onboarding.detail.standard.desc', time: 'onboarding.detail.standard.time', bars: 2 },
  { id: 'expert', key: 'onboarding.detail.expert', desc: 'onboarding.detail.expert.desc', time: 'onboarding.detail.expert.time', bars: 3 },
];

export function Onboarding() {
  const { t, lang } = useI18n();
  const { createProject, toast } = useApp();
  const period = useMemo(defaultPeriod, []);
  const [step, setStep] = useState(0);
  const [entity, setEntity] = useState<EntityType>('person');
  const [detail, setDetail] = useState<DetailLevel>('standard');
  const [name, setName] = useState('');
  const [country, setCountry] = useState<CountryCode>('PE');
  const [sector, setSector] = useState('services');
  const [periodStart, setPeriodStart] = useState(period.start);
  const [periodEnd, setPeriodEnd] = useState(period.end);
  const [baseYear, setBaseYear] = useState(String(new Date().getFullYear() - 1));
  const [boundary, setBoundary] = useState<Boundary>('operational');
  const [householdSize, setHouseholdSize] = useState(3);
  const [employees, setEmployees] = useState(25);
  const [attendees, setAttendees] = useState(150);
  const [unitsProduced, setUnitsProduced] = useState(1000);
  const [areaM2, setAreaM2] = useState(300);
  const [error, setError] = useState('');

  const entityNameKey = ENTITIES.find((item) => item.id === entity)!.key;
  const defaultName = t(entityNameKey);
  const L = (es: string, en: string) => (lang === 'es' ? es : en);

  const next = () => {
    if (step === 1) {
      if (!name.trim()) {
        setError(t('onboarding.required'));
        return;
      }
      if (!periodStart || !periodEnd || periodStart > periodEnd) {
        setError(L('Revisa el periodo: el inicio debe ser anterior al fin.', 'Check the period: the start must be before the end.'));
        return;
      }
    }
    setError('');
    setStep((current) => Math.min(2, current + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const back = () => {
    setError('');
    setStep((current) => Math.max(0, current - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const create = () => {
    const base = makeProject(entity, {
      name: name.trim() || defaultName,
      country,
      sector,
      periodStart,
      periodEnd,
      baseYear,
      detail,
      boundary,
      householdSize,
      employees,
      attendees,
      areaM2,
      unitsProduced,
    });
    const project = { ...base, answers: answersFor(entity, detail) };
    createProject(project);
    toast('toast.saved');
    navigate('measure');
  };

  return (
    <div className="onboard">
      <div className="container onboard-shell">
        <aside className="steps-rail">
          <p className="eyebrow">{t('onboarding.eyebrow', { step: step + 1 })}</p>
          <p className="steps-rail-title">{L('Un buen inventario empieza por los límites.', 'A good inventory starts with boundaries.')}</p>
          <p className="lede">{t('onboarding.methodNote')}</p>
          <ol className="steps-list">
            {[
              L('Qué quieres medir', 'What you want to measure'),
              L('Límites y periodo', 'Boundaries and period'),
              L('Nivel de detalle', 'Level of detail'),
            ].map((label, index) => (
              <li key={label} className={index === step ? 'active' : index < step ? 'done' : ''}>
                <span className="step-dot">{index < step ? '✓' : index + 1}</span>
                {label}
              </li>
            ))}
          </ol>
          <div className="method-note">
            <Icon name="shield" size={16} />
            <span>{L('Tus datos se guardan solo en este navegador. No hay cuentas, servidores ni rastreo.', 'Your data stays in this browser. No accounts, servers or tracking.')}</span>
          </div>
        </aside>

        <div className="onboard-card">
          <div className="onboard-head">
            <div className="row between gap-4" style={{ alignItems: 'flex-start' }}>
              <div>
                <Chip tone="accent">{t('onboarding.eyebrow', { step: step + 1 })}</Chip>
                <h1 className="mt-3" style={{ fontSize: 'clamp(1.8rem, 3.4vw, 2.6rem)' }}>
                  {step === 0 ? t('onboarding.type.title') : step === 1 ? t('onboarding.scope.title') : t('onboarding.detail.title')}
                </h1>
                <p className="lede mt-3" style={{ fontSize: '0.94rem' }}>
                  {step === 0 ? t('onboarding.type.sub') : step === 1 ? t('onboarding.scope.sub') : t('onboarding.detail.sub')}
                </p>
              </div>
            </div>
          </div>

          <div className="onboard-body">
            {step === 0 && (
              <div className="entity-grid" role="group" aria-label={t('onboarding.type.title')}>
                {ENTITIES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="entity-card"
                    aria-pressed={entity === item.id}
                    onClick={() => setEntity(item.id)}
                  >
                    <span className="checkmark"><Icon name="check" size={12} /></span>
                    <span className="entity-icon"><Icon name={item.icon} size={21} /></span>
                    <strong>{t(item.key)}</strong>
                    <p>{t(item.desc)}</p>
                  </button>
                ))}
              </div>
            )}

            {step === 1 && (
              <div className="form-grid">
                <label className="field span-2">
                  <span className="field-label">{t('onboarding.name')}</span>
                  <input
                    className="input"
                    value={name}
                    placeholder={defaultName}
                    onChange={(event) => { setName(event.target.value); setError(''); }}
                    maxLength={90}
                  />
                  <span className="help"><Icon name="info" size={13} />{L('Puedes cambiarlo después. Se usa en los exportables.', 'You can change it later. It is used in exports.')}</span>
                </label>

                <label className="field">
                  <span className="field-label">{t('onboarding.country')}</span>
                  <select className="select" value={country} onChange={(event) => setCountry(event.target.value as CountryCode)}>
                    {COUNTRIES.map((item) => (
                      <option key={item.code} value={item.code}>{item.label[lang]}</option>
                    ))}
                  </select>
                </label>

                {entity === 'company' ? (
                  <label className="field">
                    <span className="field-label">{t('onboarding.sector')}</span>
                    <select className="select" value={sector} onChange={(event) => setSector(event.target.value)}>
                      {SECTORS.map((item) => <option key={item.id} value={item.id}>{item.label[lang]}</option>)}
                    </select>
                  </label>
                ) : (
                  <div className="field">
                    <span className="field-label">{L('Método de referencia', 'Reference method')}</span>
                    <div className="input" style={{ display: 'flex', alignItems: 'center', color: 'var(--ink-mute)', fontSize: '0.8rem' }}>
                      {entity === 'person' ? 'GHG Protocol · WFN' : entity === 'event' ? 'ISO 20121 · GHG Protocol' : 'ISO 14046 · WFN'}
                    </div>
                  </div>
                )}

                <label className="field">
                  <span className="field-label">{t('onboarding.periodStart')}</span>
                  <input className="input" type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
                </label>
                <label className="field">
                  <span className="field-label">{t('onboarding.periodEnd')}</span>
                  <input className="input" type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
                </label>

                <label className="field">
                  <span className="field-label">{t('onboarding.baseYear')}</span>
                  <input className="input num-input" inputMode="numeric" value={baseYear} onChange={(event) => setBaseYear(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))} />
                </label>

                <label className="field">
                  <span className="field-label">{t('onboarding.boundary')}</span>
                  <select className="select" value={boundary} onChange={(event) => setBoundary(event.target.value as Boundary)}>
                    <option value="operational">{t('onboarding.boundary.operational')}</option>
                    <option value="financial">{t('onboarding.boundary.financial')}</option>
                    <option value="equity">{t('onboarding.boundary.equity')}</option>
                  </select>
                </label>

                {entity === 'person' && (
                  <label className="field">
                    <span className="field-label">{t('onboarding.household')}</span>
                    <input className="input num-input" type="number" min={1} max={30} value={householdSize} onChange={(event) => setHouseholdSize(Math.max(1, Number(event.target.value)))} />
                  </label>
                )}
                {entity === 'company' && (
                  <>
                    <label className="field">
                      <span className="field-label">{t('onboarding.employees')}</span>
                      <input className="input num-input" type="number" min={1} value={employees} onChange={(event) => setEmployees(Math.max(1, Number(event.target.value)))} />
                    </label>
                    <label className="field">
                      <span className="field-label">{t('onboarding.area')}</span>
                      <input className="input num-input" type="number" min={0} value={areaM2} onChange={(event) => setAreaM2(Math.max(0, Number(event.target.value)))} />
                    </label>
                  </>
                )}
                {entity === 'event' && (
                  <label className="field">
                    <span className="field-label">{t('onboarding.attendees')}</span>
                    <input className="input num-input" type="number" min={1} value={attendees} onChange={(event) => setAttendees(Math.max(1, Number(event.target.value)))} />
                  </label>
                )}
                {entity === 'product' && (
                  <label className="field">
                    <span className="field-label">{t('onboarding.units')}</span>
                    <input className="input num-input" type="number" min={1} value={unitsProduced} onChange={(event) => setUnitsProduced(Math.max(1, Number(event.target.value)))} />
                  </label>
                )}

                {error && <p className="error span-2" role="alert">{error}</p>}
              </div>
            )}

            {step === 2 && (
              <>
                <div className="detail-grid" role="group" aria-label={t('onboarding.detail.title')}>
                  {DETAILS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="detail-card"
                      aria-pressed={detail === item.id}
                      onClick={() => setDetail(item.id)}
                    >
                      <span className="detail-time">{t(item.time)} · {item.id === 'standard' ? t('common.recommended') : item.id === 'quick' ? t('common.typical') : 'ISO'}</span>
                      <strong>{t(item.key)}</strong>
                      <p>{t(item.desc)}</p>
                      <span className="bars" aria-hidden="true">
                        {[1, 2, 3].map((bar) => <i key={bar} className={bar <= item.bars ? 'on' : ''} />)}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="method-note">
                  <Icon name="info" size={16} />
                  <span>{t('onboarding.methodNote')}</span>
                </div>
              </>
            )}
          </div>

          <div className="onboard-foot">
            <button type="button" className="btn btn-ghost" onClick={step === 0 ? () => navigate('welcome') : back}>
              <Icon name="arrow-left" size={16} />
              {step === 0 ? t('common.cancel') : t('common.back')}
            </button>
            {step < 2 ? (
              <button type="button" className="btn btn-primary" onClick={next}>
                {t('common.next')}
                <Icon name="arrow-right" size={16} className="arrow" />
              </button>
            ) : (
              <button type="button" className="btn btn-accent btn-lg" onClick={create}>
                {t('onboarding.create')}
                <Icon name="arrow-right" size={17} className="arrow" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
