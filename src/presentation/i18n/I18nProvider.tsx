import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en } from './en';
import { es } from './es';
import { DEFAULT_LOCALE, LOCALES, type Locale, type Messages } from './messages';

const CATALOG: Record<Locale, Messages> = { en, es };
const STORAGE_KEY = 'mammo-triage.locale';

/** The language preference is not sensitive, so it is remembered in localStorage (when available). */
function storedLocale(): Locale {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

interface I18n {
  readonly t: Messages;
  readonly locale: Locale;
  readonly setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18n>({ t: en, locale: 'en', setLocale: () => undefined });

/** English by default; the user can switch to Spanish. Keeps <html lang> in sync (UX-ACC-011). */
export function I18nProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? storedLocale());

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch { /* storage blocked: keep it for this session only */ }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(() => ({ t: CATALOG[locale], locale, setLocale }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  return useContext(I18nContext);
}
