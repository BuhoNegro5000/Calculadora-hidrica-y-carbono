import { useCallback, useEffect, useState } from 'react';

export type RouteName =
  | 'welcome'
  | 'onboarding'
  | 'measure'
  | 'results'
  | 'reduce'
  | 'offset'
  | 'projects'
  | 'report'
  | 'transparency'
  | 'factors'
  | 'notfound';

export interface Route {
  name: RouteName;
  raw: string;
}

function parse(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '').split('?')[0].replace(/\/+$/, '');
  const first = raw.split('/')[0] || 'welcome';
  const known: RouteName[] = ['welcome', 'onboarding', 'measure', 'results', 'reduce', 'offset', 'projects', 'report', 'transparency', 'factors'];
  return { name: (known.includes(first as RouteName) ? first : 'notfound') as RouteName, raw };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

export function navigate(name: RouteName | string): void {
  const target = `#/${String(name).replace(/^#?\/?/, '')}`;
  if (window.location.hash === target) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  window.location.hash = target;
}

export function useNavigate(): (name: RouteName | string) => void {
  return useCallback((name: RouteName | string) => navigate(name), []);
}
