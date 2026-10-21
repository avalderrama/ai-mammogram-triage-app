import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en } from './en';
import { es } from './es';
import { DEFAULT_LOCALE, LOCALES, type Locale, type Messages } from './messages';

const CATALOG: Record<Locale, Messages> = { en, es };
const STORAGE_KEY = 'mammo-triage.locale';

const isLocale = (value: string | null | undefined): value is Locale => LOCALES.includes(value as Locale);

/** First supported language among the browser's preferences, by primary subtag (es-CO → es); otherwise English. */
export function browserLocale(languages: readonly (string | undefined)[]): Locale {
  return languages.map((tag) => tag?.split('-')[0]?.toLowerCase()).find(isLocale) ?? DEFAULT_LOCALE;
}

/** Some WebViews and privacy modes report an empty `languages` list: fall back to `language`. */
function browserLanguages(): readonly (string | undefined)[] {
  if (typeof navigator === 'undefined') return [];
  return navigator.languages?.length ? navigator.languages : [navigator.language];
}

/** The user's explicit choice wins; it is not sensitive, so it is remembered in localStorage (when available). */
function initialChoice(): Locale {
  const browser = browserLocale(browserLanguages());
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isLocale(stored) ? stored : browser;
  } catch {
    return browser;
  }
}

interface I18n {
  readonly t: Messages;
  readonly locale: Locale;
  readonly setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18n>({ t: en, locale: 'en', setLocale: () => undefined });

/**
 * Starts in the browser's language (English when it is neither English nor Spanish); the user can switch, and that
 * choice is remembered. Keeps <html lang> in sync (UX-ACC-011).
 */
export function I18nProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? initialChoice());

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
