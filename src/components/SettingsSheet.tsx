import { useEffect, useRef } from 'react';
import { useApp } from '../store/app';
import { useI18n } from '../i18n';
import { Icon } from './Icons';
import { Segmented, Switch } from './ui';
import type { DetailLevel, GWPSet, Scope2Method } from '../engine/types';
import { setDetail } from '../engine/project';

export function SettingsSheet() {
  const { t, lang, setLang } = useI18n();
  const {
    activeProject, updateProject, settingsOpen, setSettingsOpen, settingsFocus,
    theme, setTheme, toast,
  } = useApp();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSettingsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [setSettingsOpen]);

  if (!settingsOpen) return null;

  const update = (patch: Partial<NonNullable<typeof activeProject>>) => {
    if (!activeProject) return;
    updateProject({ ...activeProject, ...patch });
  };

  const changeDetail = (detail: DetailLevel) => {
    if (!activeProject) return;
    updateProject(setDetail(activeProject, detail));
    toast('settings.saved');
  };

  const changeTheme = (next: 'light' | 'dark' | 'system') => {
    setTheme(next);
  };

  return (
    <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
      <aside className="sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="sheet-head">
          <div>
            <p className="eyebrow no-rule">{t('common.settings')}</p>
            <h2 id="settings-title" style={{ fontSize: '1.4rem', marginTop: 4 }}>{t('settings.title')}</h2>
            <p className="small muted" style={{ marginTop: 4 }}>{t('settings.sub')}</p>
          </div>
          <button ref={closeRef} type="button" className="icon-btn" aria-label={t('common.close')} onClick={() => setSettingsOpen(false)}>
            <Icon name="close" size={19} />
          </button>
        </header>

        <div className="sheet-body">
          <section className="field">
            <span className="field-label">{t('common.theme')}</span>
            <Segmented
              value={theme}
              label={t('common.theme')}
              onChange={(value) => changeTheme(value)}
              options={[
                { value: 'light', label: t('common.light') },
                { value: 'dark', label: t('common.dark') },
                { value: 'system', label: t('common.system') },
              ]}
            />
          </section>

          <section className="field">
            <span className="field-label">{t('settings.lang')}</span>
            <Segmented
              value={lang}
              label={t('common.language')}
              onChange={(value) => setLang(value)}
              options={[{ value: 'es', label: 'Español' }, { value: 'en', label: 'English' }]}
            />
          </section>

          {activeProject && (
            <>
              <hr />
              <section className="field">
                <span className="field-label">{t('settings.gwp')}</span>
                <Segmented<GWPSet>
                  value={activeProject.gwp}
                  label={t('settings.gwp')}
                  onChange={(value) => update({ gwp: value })}
                  options={[{ value: 'AR5', label: 'IPCC AR5' }, { value: 'AR6', label: 'IPCC AR6' }]}
                />
              </section>

              <section className="field">
                <span className="field-label">{t('settings.scope2')}</span>
                <Segmented<Scope2Method>
                  value={activeProject.scope2Method}
                  label={t('settings.scope2')}
                  onChange={(value) => update({ scope2Method: value })}
                  options={[
                    { value: 'location', label: t('wizard.scope2.location') },
                    { value: 'market', label: t('wizard.scope2.market') },
                  ]}
                />
              </section>

              <section className="field">
                <label className="field-label" htmlFor="market-factor">{t('settings.market')}</label>
                <input
                  id="market-factor"
                  className="input num-input"
                  inputMode="decimal"
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder={t('settings.marketPlaceholder')}
                  value={activeProject.marketElectricityFactor ?? ''}
                  onChange={(event) => {
                    const raw = event.target.value;
                    update({ marketElectricityFactor: raw === '' ? undefined : Math.max(0, Number(raw)) });
                  }}
                  autoFocus={settingsFocus === 'market'}
                />
                <span className="help"><Icon name="info" size={13} />{t('wizard.marketHelp')}</span>
              </section>

              <section className="field">
                <span className="field-label">{t('settings.detail')}</span>
                <Segmented<DetailLevel>
                  value={activeProject.detail}
                  label={t('settings.detail')}
                  onChange={changeDetail}
                  options={[
                    { value: 'quick', label: t('onboarding.detail.quick') },
                    { value: 'standard', label: t('onboarding.detail.standard') },
                    { value: 'expert', label: t('onboarding.detail.expert') },
                  ]}
                />
              </section>

              <section className="stack gap-3">
                <Switch
                  checked={activeProject.rf}
                  onChange={(value) => update({ rf: value })}
                  label={t('settings.rf')}
                  description={lang === 'es' ? 'Aplica el factor RF en vuelos. No comparable con inventarios solo CO₂.' : 'Applies the RF factor to flights. Not comparable with CO₂-only inventories.'}
                />
                <Switch
                  checked={activeProject.waterStress}
                  onChange={(value) => update({ waterStress: value })}
                  label={t('settings.waterStress')}
                  description={lang === 'es' ? 'Multiplica el agua azul por AWARE. Es un screening, no una caracterización de cuenca.' : 'Multiplies blue water by AWARE. A screening, not a basin characterisation.'}
                />
              </section>

              <p className="small muted" style={{ lineHeight: 1.5 }}>
                {lang === 'es'
                  ? 'Los cambios se guardan automáticamente en este dispositivo. Los supuestos y factores quedan en la auditoría del proyecto.'
                  : 'Changes are saved automatically on this device. Assumptions and factors remain in the project audit trail.'}
              </p>
            </>
          )}
        </div>

        <footer className="sheet-foot">
          <button type="button" className="btn btn-primary" onClick={() => { setSettingsOpen(false); toast('settings.saved'); }}>
            <Icon name="check" size={16} />
            {t('common.close')}
          </button>
        </footer>
      </aside>
    </div>
  );
}
