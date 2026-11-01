import {
  Component, lazy, Suspense, useEffect, type ErrorInfo, type ReactNode,
} from 'react';

import { AppProvider, useApp } from './store/app';
import { I18nProvider, translate, useI18n, type DictKey } from './i18n';
import { useRoute, navigate, type RouteName } from './app/router';
import { AppShell } from './components/Shell';
import { Icon } from './components/Icons';
import { Welcome } from './screens/Welcome';

// La portada viaja en el chunk inicial; el resto de rutas se carga bajo demanda.
// Así el primer render no paga el motor, los datos ni las pantallas que aún no se usan.
const Onboarding = lazy(() => import('./screens/Onboarding').then((m) => ({ default: m.Onboarding })));
const Wizard = lazy(() => import('./screens/Wizard').then((m) => ({ default: m.Wizard })));
const Results = lazy(() => import('./screens/Results').then((m) => ({ default: m.Results })));
const Reduce = lazy(() => import('./screens/Reduce').then((m) => ({ default: m.Reduce })));
const Compensate = lazy(() => import('./screens/Compensate').then((m) => ({ default: m.Compensate })));
const Projects = lazy(() => import('./screens/Projects').then((m) => ({ default: m.Projects })));
const Report = lazy(() => import('./screens/Report').then((m) => ({ default: m.Report })));
const Transparency = lazy(() => import('./screens/Transparency').then((m) => ({ default: m.Transparency })));
const Factors = lazy(() => import('./screens/Factors').then((m) => ({ default: m.Factors })));
const FactorScope = lazy(() => import('./store/FactorScope').then((m) => ({ default: m.FactorScope })));

const TITLES: Record<RouteName, DictKey> = {
  welcome: 'welcome.title',
  onboarding: 'nav.measure',
  measure: 'nav.measure',
  results: 'results.title',
  reduce: 'reduce.title',
  offset: 'offset.title',
  projects: 'projects.title',
  report: 'report.title',
  transparency: 'transparency.title',
  factors: 'nav.factors',
  notfound: 'app.name',
};

/** Rutas que requieren un proyecto activo para tener sentido. */
const PROJECT_ROUTES = new Set<RouteName>(['measure', 'results', 'reduce', 'offset', 'report']);

/** Rutas que usan el catálogo de factores y, por tanto, cargan su proveedor. */
const FACTOR_ROUTES = new Set<RouteName>(['measure', 'results', 'reduce', 'offset', 'projects', 'report', 'factors']);

function Screens() {
  const route = useRoute();
  const { lang } = useI18n();
  const { activeProject, projects } = useApp();

  const needsProject = PROJECT_ROUTES.has(route.name);
  const redirectTo: RouteName | null = needsProject && !activeProject
    ? (projects.length > 0 ? 'projects' : 'onboarding')
    : null;

  useEffect(() => {
    if (redirectTo) navigate(redirectTo);
  }, [redirectTo]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [route.name]);

  useEffect(() => {
    const suffix = 'Green Owl Labs';
    const title = route.name === 'notfound'
      ? `${lang === 'es' ? 'Página no encontrada' : 'Page not found'} · ${suffix}`
      : route.name === 'welcome'
        ? `${suffix} · ${lang === 'es' ? 'Calculadora de huella' : 'Footprint calculator'}`
        : `${translate(lang, TITLES[route.name])} · ${suffix}`;
    document.title = activeProject && PROJECT_ROUTES.has(route.name)
      ? `${activeProject.name} · ${title}`
      : title;
  }, [route.name, lang, activeProject]);

  if (redirectTo) return null;

  const screen = (() => {
    switch (route.name) {
      case 'welcome': return <Welcome />;
      case 'onboarding': return <Onboarding />;
      case 'measure': return <Wizard />;
      case 'results': return <Results />;
      case 'reduce': return <Reduce />;
      case 'offset': return <Compensate />;
      case 'projects': return <Projects />;
      case 'report': return <Report />;
      case 'transparency': return <Transparency />;
      case 'factors': return <Factors />;
      default: return <NotFound />;
    }
  })();

  const content = <Suspense fallback={<RouteFallback />}>{screen}</Suspense>;
  if (!FACTOR_ROUTES.has(route.name)) return content;
  return (
    <Suspense fallback={<RouteFallback />}>
      <FactorScope>{content}</FactorScope>
    </Suspense>
  );
}

function RouteFallback() {
  const { lang } = useI18n();
  return (
    <div className="container" style={{ minHeight: '58vh', paddingTop: 72 }} role="status" aria-live="polite">
      <p className="eyebrow">{lang === 'es' ? 'Cargando vista' : 'Loading view'}</p>
      <div className="skeleton-stack" aria-hidden="true">
        <span className="skeleton skeleton-title" />
        <span className="skeleton skeleton-line" />
        <span className="skeleton skeleton-line short" />
      </div>
      <span className="sr-only">{lang === 'es' ? 'Cargando…' : 'Loading…'}</span>
    </div>
  );
}

function NotFound() {
  const { lang } = useI18n();
  return (
    <div className="container">
      <section className="empty-state" style={{ minHeight: '58vh' }}>
        <span className="empty-icon"><Icon name="compass" size={26} /></span>
        <p className="eyebrow">{lang === 'es' ? 'Error 404' : 'Error 404'}</p>
        <h1 style={{ fontSize: 'clamp(1.9rem, 4vw, 3rem)' }}>
          {lang === 'es' ? 'Este sendero no existe.' : 'This trail does not exist.'}
        </h1>
        <p>
          {lang === 'es'
            ? 'La dirección que buscas no forma parte del observatorio. Vuelve al inicio y retoma el pulso.'
            : 'The address you followed is not part of the observatory. Return to the start and pick up the trail.'}
        </p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('welcome')}>
          {lang === 'es' ? 'Volver al inicio' : 'Back to start'}
          <Icon name="arrow-right" size={17} />
        </button>
      </section>
    </div>
  );
}

interface BoundaryState {
  failed: boolean;
}

class ErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Sin backend: dejamos rastro en consola para diagnóstico local.
    console.error('Green Owl Labs · error de interfaz', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="container" style={{ padding: '96px 0', maxWidth: 640 }}>
        <p className="eyebrow">Green Owl Labs</p>
        <h1 style={{ fontSize: '2rem' }}>Algo se interpuso en la lectura.</h1>
        <p className="lede mt-3">
          Ocurrió un error inesperado en esta vista. Tus proyectos siguen guardados en este
          dispositivo; recarga para continuar.
        </p>
        <div className="row gap-3 wrap mt-6">
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Recargar
          </button>
          <a className="btn btn-outline" href="#/welcome">Ir al inicio</a>
        </div>
      </div>
    );
  }
}

function Root() {
  const { lang, setLang } = useApp();
  return (
    <I18nProvider lang={lang} setLang={setLang}>
      <AppShell>
        <Screens />
      </AppShell>
    </I18nProvider>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Root />
      </AppProvider>
    </ErrorBoundary>
  );
}
