import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserLocale, I18nProvider, useI18n } from './I18nProvider';

function CurrentLocale() {
  return <span data-testid="locale">{useI18n().locale}</span>;
}

describe('browserLocale', () => {
  it.each([
    [['es-CO', 'en-US'], 'es'],
    [['ES'], 'es'],
    [['fr-FR', 'es-MX'], 'es'],
    [['en-GB', 'es'], 'en'],
    [['fr', 'de'], 'en'],
    [[], 'en'],
    [[undefined], 'en'],
  ])('%j → %s', (languages, expected) => {
    expect(browserLocale(languages)).toBe(expected);
  });
});

describe('I18nProvider initial language', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  const renderWithBrowser = (languages: string[], language = languages[0]) => {
    vi.stubGlobal('navigator', { ...navigator, languages, language });
    return render(<I18nProvider><CurrentLocale /></I18nProvider>);
  };

  it('falls back to navigator.language when the languages list is empty', () => {
    expect(renderWithBrowser([], 'es-ES').getByTestId('locale')).toHaveTextContent('es');
  });

  it('starts in the browser language and sets <html lang>', () => {
    const { getByTestId } = renderWithBrowser(['es-CO', 'en']);
    expect(getByTestId('locale')).toHaveTextContent('es');
    expect(document.documentElement.lang).toBe('es');
  });

  it('keeps the language the user chose over the browser one', () => {
    localStorage.setItem('mammo-triage.locale', 'en');
    expect(renderWithBrowser(['es-CO']).getByTestId('locale')).toHaveTextContent('en');
  });
});
