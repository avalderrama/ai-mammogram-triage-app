import { useId } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { LOCALES, type Locale } from '../i18n/messages';

/** Each language is named in its own language and marked with `lang`, so screen readers pronounce it right. */
const NAMES: Record<Locale, string> = { en: 'English', es: 'Español' };

export function LanguageSwitcher() {
  const { t, locale, setLocale } = useI18n();
  const id = useId();
  return (
    <div className="language">
      <label htmlFor={id} className="visually-hidden">{t.app.languageLabel}</label>
      <select id={id} className="language__select" value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
        {LOCALES.map((l) => <option key={l} value={l} lang={l}>{NAMES[l]}</option>)}
      </select>
    </div>
  );
}
