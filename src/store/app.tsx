import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import type { Lang, Project } from '../engine/types';
import type { DictKey } from '../i18n';
import { translate } from '../i18n';
import { DEFAULT_COUNTRY_BY_LANG } from '../engine/project';

export type Theme = 'light' | 'dark' | 'system';
type ToastKind = 'ok' | 'error';

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface AppValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  projects: Project[];
  activeProject: Project | undefined;
  activeId: string | null;
  selectProject: (id: string | null) => void;
  createProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  deleteProject: (id: string) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  settingsFocus: string | null;
  openSettings: (focus?: string) => void;
  toast: (message: DictKey | string, kind?: ToastKind) => void;
  toasts: Toast[];
  dismissToast: (id: number) => void;
}

const AppContext = createContext<AppValue | null>(null);

const KEYS = {
  lang: 'gol.lang.v1',
  theme: 'gol.theme.v1',
  projects: 'gol.projects.v1',
  active: 'gol.active.v1',
} as const;

function readLang(): Lang {
  try {
    const raw = localStorage.getItem(KEYS.lang);
    if (raw === 'es' || raw === 'en') return raw;
  } catch { /* almacenamiento no disponible */ }
  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('en')) return 'en';
  return 'es';
}

function readTheme(): Theme {
  try {
    const raw = localStorage.getItem(KEYS.theme);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch { /* almacenamiento no disponible */ }
  return 'system';
}

function readProjects(): Project[] {
  try {
    const raw = localStorage.getItem(KEYS.projects);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is Project => Boolean(item && typeof item.id === 'string' && item.version === 1));
  } catch {
    return [];
  }
}

function readActive(): string | null {
  try {
    return localStorage.getItem(KEYS.active);
  } catch {
    return null;
  }
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);
  const [theme, setThemeState] = useState<Theme>(readTheme);
  const [projects, setProjects] = useState<Project[]>(readProjects);
  const [activeId, setActiveId] = useState<string | null>(readActive);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsFocus, setSettingsFocus] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(1);

  // ── Persistencia ─────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(KEYS.lang, lang); } catch { /* noop */ }
  }, [lang]);

  useEffect(() => {
    try { localStorage.setItem(KEYS.theme, theme); } catch { /* noop */ }
    const apply = () => {
      const resolved = resolveTheme(theme);
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', resolved === 'dark' ? '#071a15' : '#f8f3e7');
    };
    apply();
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    try { localStorage.setItem(KEYS.projects, JSON.stringify(projects)); } catch { /* noop */ }
  }, [projects]);

  useEffect(() => {
    try {
      if (activeId) localStorage.setItem(KEYS.active, activeId);
      else localStorage.removeItem(KEYS.active);
    } catch { /* noop */ }
  }, [activeId]);

  // Mantener un proyecto activo válido.
  useEffect(() => {
    if (activeId && !projects.some((project) => project.id === activeId)) {
      setActiveId(projects[0]?.id ?? null);
    } else if (!activeId && projects.length > 0) {
      setActiveId(projects[0].id);
    }
  }, [activeId, projects]);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeId),
    [projects, activeId],
  );

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    setProjects((current) => current.map((project) => (
      project.name === defaultName(project.entity)
        ? { ...project, name: translate(next, defaultNameKey(project.entity)), updatedAt: new Date().toISOString() }
        : project
    )));
  }, []);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);

  const selectProject = useCallback((id: string | null) => setActiveId(id), []);

  const createProject = useCallback((project: Project) => {
    const normalized: Project = {
      ...project,
      country: project.country || DEFAULT_COUNTRY_BY_LANG,
    };
    setProjects((current) => [normalized, ...current]);
    setActiveId(normalized.id);
  }, []);

  const updateProject = useCallback((project: Project) => {
    setProjects((current) => current.map((item) => (
      item.id === project.id ? { ...project, updatedAt: new Date().toISOString() } : item
    )));
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((current) => {
      const next = current.filter((project) => project.id !== id);
      setActiveId((active) => (active === id ? next[0]?.id ?? null : active));
      return next;
    });
  }, []);

  const openSettings = useCallback((focus?: string) => {
    setSettingsFocus(focus ?? null);
    setSettingsOpen(true);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((message: DictKey | string, kind: ToastKind = 'ok') => {
    const id = toastId.current++;
    setToasts((current) => [...current.slice(-2), { id, message: resolveMessage(lang, message), kind }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 3600);
  }, [lang]);

  const value = useMemo<AppValue>(() => ({
    lang,
    setLang,
    theme,
    setTheme,
    projects,
    activeProject,
    activeId,
    selectProject,
    createProject,
    updateProject,
    deleteProject,
    settingsOpen,
    setSettingsOpen,
    settingsFocus,
    openSettings,
    toast,
    toasts,
    dismissToast,
  }), [
    lang, setLang, theme, setTheme, projects, activeProject, activeId, selectProject,
    createProject, updateProject, deleteProject, settingsOpen, settingsFocus, openSettings,
    toast, toasts, dismissToast,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function resolveMessage(lang: Lang, key: string): string {
  // Las claves del diccionario se traducen; los textos libres se muestran tal cual.
  if (/^[a-z0-9]+(\.[a-z0-9]+)+$/i.test(key)) {
    return translate(lang, key as DictKey);
  }
  return key;
}

function defaultNameKey(entity: Project['entity']): DictKey {
  return entity === 'person' ? 'onboarding.type.person'
    : entity === 'company' ? 'onboarding.type.company'
      : entity === 'event' ? 'onboarding.type.event' : 'onboarding.type.product';
}

function defaultName(entity: Project['entity']): string {
  return translate('es', defaultNameKey(entity));
}

export function useApp(): AppValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp debe usarse dentro de AppProvider');
  return value;
}
