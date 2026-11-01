import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { es, type Dict } from './es';
import { en } from './en';
import type { Lang } from '../engine/types';

const dictionaries: Record<Lang, Dict> = { es, en };

export type DictKey = keyof Dict;
export type Vars = Record<string, string | number>;

export function translate(lang: Lang, key: DictKey, vars?: Vars): string {
  const raw = dictionaries[lang][key] ?? es[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: DictKey, vars?: Vars) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ lang, setLang, children }: { lang: Lang; setLang: (lang: Lang) => void; children: ReactNode }) {
  const value = useMemo<I18nValue>(() => ({
    lang,
    setLang,
    t: (key, vars) => translate(lang, key, vars),
  }), [lang, setLang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n debe usarse dentro de I18nProvider');
  return value;
}

export { dictionaries };
