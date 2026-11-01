import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/app';
import { useI18n } from '../i18n';
import { useRoute, navigate } from '../app/router';
import { Icon, type IconName } from './Icons';
import type { DictKey } from '../i18n';
import { Splash } from './Splash';
import { SettingsSheet } from './SettingsSheet';
import { publicAsset } from '../lib/assets';

export function Brand({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <a className="brand" href="#/welcome">
      <span className="brand-mark">
        <img src={publicAsset('brand-emblem.webp')} alt="" width={38} height={38} />
      </span>
      {!compact && (
        <span className="brand-text">
          <span className="brand-name">Green Owl Labs</span>
          <span className="brand-sub">{t('app.claim')}</span>
        </span>
      )}
    </a>
  );
}

const navItems: { route: string; key: DictKey; icon: IconName }[] = [
  { route: 'measure', key: 'nav.measure', icon: 'leaf' },
  { route: 'results', key: 'nav.results', icon: 'chart' },
  { route: 'reduce', key: 'nav.reduce', icon: 'target' },
  { route: 'offset', key: 'nav.offset', icon: 'shield' },
  { route: 'projects', key: 'nav.project', icon: 'book' },
  { route: 'report', key: 'nav.report', icon: 'file' },
  { route: 'transparency', key: 'nav.transparency', icon: 'eye' },
];

export function TopBar() {
  const { t, lang, setLang } = useI18n();
  const { activeProject, openSettings, theme, setTheme } = useApp();
  const route = useRoute();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const primary = navItems.slice(0, 4);
  const projectRoutes = new Set(['measure', 'results', 'reduce', 'offset', 'report']);

  return (
    <header className={`topbar no-print ${scrolled ? 'scrolled' : ''}`}>
      <div className="container topbar-inner">
        <Brand />
        <nav className="main-nav" aria-label={lang === 'es' ? 'Navegación principal' : 'Main navigation'}>
          {primary.map((item) => {
            const disabled = projectRoutes.has(item.route) && !activeProject;
            return (
              <a
                key={item.route}
                href={`#/${item.route}`}
                className={route.name === item.route ? 'active' : ''}
                aria-disabled={disabled}
                aria-current={route.name === item.route ? 'page' : undefined}
                onClick={(event) => {
                  if (disabled) {
                    event.preventDefault();
                    navigate('onboarding');
                  }
                }}
                style={disabled ? { opacity: 0.45 } : undefined}
              >
                {t(item.key)}
              </a>
            );
          })}
          <a href="#/projects" className={route.name === 'projects' ? 'active' : ''} aria-current={route.name === 'projects' ? 'page' : undefined}>
            {t('nav.project')}
          </a>
          <a href="#/factors" className={route.name === 'factors' ? 'active' : ''} aria-current={route.name === 'factors' ? 'page' : undefined}>
            {t('nav.factors')}
          </a>
          <a href="#/transparency" className={route.name === 'transparency' ? 'active' : ''} aria-current={route.name === 'transparency' ? 'page' : undefined}>
            {t('nav.transparency')}
          </a>
        </nav>

        <div className="topbar-actions">
          {activeProject && (
            <a className="project-pill" href="#/projects" title={activeProject.name}>
              <span className="dot" />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeProject.name}</span>
            </a>
          )}
          <button
            type="button"
            className="icon-btn"
            aria-label={`${lang === 'es' ? 'Cambiar idioma' : 'Switch language'} — ${lang.toUpperCase()}`}
            title={lang === 'es' ? 'English' : 'Español'}
            onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
          >
            <span className="mono" style={{ fontSize: '0.68rem', fontWeight: 600 }}>{lang.toUpperCase()}</span>
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={theme === 'dark' ? t('common.light') : t('common.dark')}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('common.settings')}
            onClick={() => openSettings()}
          >
            <Icon name="settings" size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

export function MobileNav() {
  const { t } = useI18n();
  const route = useRoute();
  const { activeProject } = useApp();
  const items: { route: string; key: DictKey; icon: IconName }[] = [
    { route: 'measure', key: 'nav.measure', icon: 'leaf' },
    { route: 'results', key: 'nav.results', icon: 'chart' },
    { route: 'reduce', key: 'nav.reduce', icon: 'target' },
    { route: 'offset', key: 'nav.offset', icon: 'shield' },
    { route: 'factors', key: 'nav.factors', icon: 'database' },
    { route: 'transparency', key: 'nav.transparency', icon: 'eye' },
  ];
  const projectRoutes = new Set(['measure', 'results', 'reduce', 'offset']);
  return (
    <nav className="mobile-nav no-print" aria-label={t('nav.measure')}>
      {items.map((item) => {
        const disabled = projectRoutes.has(item.route) && !activeProject;
        return (
          <a
            key={item.route}
            href={`#/${item.route}`}
            className={route.name === item.route ? 'active' : ''}
            aria-current={route.name === item.route ? 'page' : undefined}
            onClick={(event) => {
              if (disabled) {
                event.preventDefault();
                navigate('onboarding');
              }
            }}
          >
            <Icon name={item.icon} size={19} />
            <span>{t(item.key)}</span>
          </a>
        );
      })}
    </nav>
  );
}

export function Footer() {
  const { t, lang } = useI18n();
  return (
    <footer className="footer no-print">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Brand />
            <p className="small muted mt-4" style={{ maxWidth: '34ch' }}>{t('footer.disclaimer')}</p>
            <p className="tiny muted mt-3">{t('footer.local')}</p>
          </div>
          <div>
            <h2>{t('nav.measure')}</h2>
            <ul>
              <li><a href="#/onboarding">{t('welcome.cta')}</a></li>
              <li><a href="#/projects">{t('projects.title')}</a></li>
              <li><a href="#/report">{t('report.title')}</a></li>
            </ul>
          </div>
          <div>
            <h2>{t('footer.method')}</h2>
            <ul>
              <li><a href="#/transparency">{t('transparency.title')}</a></li>
              <li><a href="#/transparency">{t('transparency.sources')}</a></li>
              <li><a href="https://ghgprotocol.org/" target="_blank" rel="noreferrer">GHG Protocol ↗</a></li>
              <li><a href="https://www.waterfootprint.org/" target="_blank" rel="noreferrer">Water Footprint Network ↗</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>{t('footer.line')} · {t('footer.version')}</span>
          <span>{lang === 'es' ? 'Diseñado y calculado en Perú' : 'Designed and calculated in Peru'} · GOWL</span>
        </div>
      </div>
    </footer>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <button
          type="button"
          key={toast.id}
          className={`toast ${toast.kind === 'error' ? 'toast-error' : ''}`}
          onClick={() => dismissToast(toast.id)}
        >
          <Icon name={toast.kind === 'error' ? 'alert' : 'check'} size={17} />
          <span>{toast.message}</span>
        </button>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { settingsOpen } = useApp();
  const [splashDone, setSplashDone] = useState(() => {
    try { return sessionStorage.getItem('gol.splash.v1') === 'done'; } catch { return false; }
  });
  const markDone = useMemo(() => () => {
    try { sessionStorage.setItem('gol.splash.v1', 'done'); } catch { /* noop */ }
    setSplashDone(true);
  }, []);

  return (
    <div className="app-shell">
      {!splashDone && <Splash onDone={markDone} />}
      <TopBar />
      <a className="skip-link" href="#main">Saltar al contenido</a>
      <main id="main" style={{ flex: 1 }}>{children}</main>
      <Footer />
      <MobileNav />
      {settingsOpen && <SettingsSheet />}
      <Toasts />
    </div>
  );
}
