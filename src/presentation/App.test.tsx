import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AnalyzeMammogram, Outcome } from '../application/analyzeMammogram';
import type { ConnectionSettingsUseCases } from '../application/connection';
import { analysis, breast } from '../test/fixtures';
import { expectNoSeriousA11yViolations } from '../test/axe';
import { App, type AppServices } from './App';
import { en } from './i18n/en';
import { es } from './i18n/es';
import { I18nProvider } from './i18n/I18nProvider';
import type { Locale } from './i18n/messages';

const photo = new File(['fake'], 'mammogram.jpg', { type: 'image/jpeg' });

function connection(configured = true): ConnectionSettingsUseCases {
  let stored = { serverUrl: configured ? 'https://x.example/mcp' : '', accessKey: configured ? 'k'.repeat(32) : '', rememberKey: false };
  return {
    load: () => stored,
    save: (s) => { stored = s; },
    test: vi.fn(async () => ({ ok: true as const })),
  };
}

function renderApp(outcome: Outcome | (() => Promise<Outcome>), configured = true, locale?: Locale) {
  const analyze = vi.fn(typeof outcome === 'function' ? outcome : async () => outcome) as unknown as AnalyzeMammogram;
  const services: AppServices = { analyze, connection: connection(configured) };
  render(<I18nProvider initialLocale={locale}><App services={services} /></I18nProvider>);
  return { analyze, services };
}

async function pickAndAnalyze(user = userEvent.setup()) {
  const gallery = document.querySelector<HTMLInputElement>('input[type="file"]:not([capture])')!;
  await user.upload(gallery, photo);
  expect(await screen.findByRole('heading', { level: 1, name: 'Review image' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Analyze image' }));
}

describe('App (English by default)', () => {
  it('home offers camera and gallery, shows the disclaimer and has no serious a11y violations', async () => {
    renderApp({ ok: true, analysis: analysis() });
    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByRole('heading', { level: 1, name: 'Indicative mammogram triage' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Take photo/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Choose saved image/ })).toBeInTheDocument();
    expect(screen.getByText(en.disclaimer)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toBeInTheDocument();
    await expectNoSeriousA11yViolations();
  });

  it('shows each breast level with text, icon and disclaimer, plus quality advice and heatmap', async () => {
    renderApp({ ok: true, analysis: analysis({
      overallLevel: 'high_priority',
      breasts: [breast(), breast({ label: 'L', side: 'L', level: 'no_suspicious_findings', qualityIssues: ['glare'],
        views: [{ ...breast().views[0]!, panel: 2, side: 'L', view: 'CC' }] })],
    }) });
    await pickAndAnalyze();
    expect(await screen.findByRole('heading', { level: 1, name: 'Triage result' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Right breast' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Left breast' })).toBeInTheDocument();
    expect(screen.getAllByText('High priority').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('No suspicious findings')).toBeInTheDocument();
    expect(screen.getByText(/Glare or burnt-out areas/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Heatmap of Right breast, MLO/ })).toHaveAttribute('width', '400');
    expect(screen.getByText(en.disclaimer)).toBeInTheDocument();
    expect(screen.getByText(/2 text areas with possible personal data were covered/)).toBeInTheDocument();
    await expectNoSeriousA11yViolations();
  });

  it('marks and describes where the model found the most suspicious area', async () => {
    const user = userEvent.setup();
    renderApp({ ok: true, analysis: analysis() });
    await pickAndAnalyze(user);
    expect(await screen.findByText('Where the model looks')).toBeInTheDocument();
    expect(screen.getByText('Area 1: middle third, lower part of the breast')).toBeInTheDocument();
    expect(document.querySelectorAll('.marker')).toHaveLength(1);
    await user.click(screen.getByLabelText('Show markers'));
    expect(document.querySelectorAll('.marker')).toHaveLength(0);
    expect(screen.getByText('Area 1: middle third, lower part of the breast')).toBeInTheDocument();
  });

  it('names each breast card by its heading, even for "panel N" labels', async () => {
    renderApp({ ok: true, analysis: analysis({ breasts: [breast({ label: 'panel 1', side: 'unknown' })] }) });
    await pickAndAnalyze();
    expect(await screen.findByRole('article', { name: 'Image (view 1)' })).toBeInTheDocument();
  });

  it('explains a missing heatmap and marks the result as partial', async () => {
    renderApp({ ok: true, analysis: analysis({
      breasts: [breast({ scoringMode: 'global_only', views: [{ ...breast().views[0]!, heatmap: null,
        heatmapUnavailableReason: 'low_resolution: needs at least 1500 px of height' }] })],
      rejectedPanels: [{ panel: 2, mammogramConfidence: 0.03 }],
    }) });
    await pickAndAnalyze();
    expect(await screen.findByText('Partial result')).toBeInTheDocument();
    expect(screen.getByText(/at least 1500 pixels of height/)).toBeInTheDocument();
    expect(screen.getByText(/View 2 was not analyzed/)).toBeInTheDocument();
  });

  it('does not show any BI-RADS result when the image is not a mammogram', async () => {
    renderApp({ ok: false, failure: { kind: 'not_a_mammogram', correlationId: 'AB12CD34', retryable: false,
      rejectedPanels: [{ panel: 1, mammogramConfidence: 0.01 }] } });
    await pickAndAnalyze();
    expect(await screen.findByRole('heading', { name: 'The image doesn’t look like a mammogram' })).toBeInTheDocument();
    expect(screen.queryByText(/BI-RADS 4-5 \(biopsy\)/)).not.toBeInTheDocument();
    expect(screen.queryByText('High priority')).not.toBeInTheDocument();
    expect(screen.getByText('AB12CD34')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    await expectNoSeriousA11yViolations();
  });

  it('shows real progress steps, lets the user cancel and offers a retry', async () => {
    let finish!: (o: Outcome) => void;
    const user = userEvent.setup();
    const { analyze } = renderApp(() => new Promise<Outcome>((resolve) => { finish = resolve; }));
    await pickAndAnalyze(user);
    expect(await screen.findByRole('heading', { level: 1, name: 'Analyzing the image' })).toBeInTheDocument();
    await expectNoSeriousA11yViolations();
    await user.click(screen.getByRole('button', { name: 'Cancel analysis' }));
    const signal = (analyze as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![2] as AbortSignal;
    expect(signal.aborted).toBe(true);
    // The cancellation shows right away, without waiting for the request to settle.
    expect(await screen.findByRole('heading', { name: 'You cancelled the analysis' })).toBeInTheDocument();
    await act(async () => finish({ ok: true, analysis: analysis() }));
    expect(screen.queryByText('Right breast')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('cannot submit twice while an analysis is running', async () => {
    const user = userEvent.setup();
    const { analyze } = renderApp(() => new Promise<Outcome>(() => {}));
    await pickAndAnalyze(user);
    await act(async () => { window.history.back(); });
    await waitFor(() => expect(analyze).toHaveBeenCalledTimes(1));
    expect(analyze).toHaveBeenCalledTimes(1);
  });

  it('explains why analysis is blocked when the connection is not configured', async () => {
    const user = userEvent.setup();
    const { analyze } = renderApp({ ok: true, analysis: analysis() }, false);
    const gallery = document.querySelector<HTMLInputElement>('input[type="file"]:not([capture])')!;
    await user.upload(gallery, photo);
    const button = await screen.findByRole('button', { name: 'Analyze image' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAccessibleDescription(/set up the server and the key/);
    await user.click(button);
    expect(analyze).not.toHaveBeenCalled();
  });

  it('draws each probability bar proportional to its value', async () => {
    renderApp({ ok: true, analysis: analysis({ breasts: [breast({ probabilities: { routine: 0.45, shortFollowUp: 0.03, biopsy: 0.52 } })] }) });
    await pickAndAnalyze();
    await screen.findByRole('heading', { level: 1, name: 'Triage result' });
    const widths = [...document.querySelectorAll<HTMLElement>('.stack-bar__segment')].map((el) => el.style.inlineSize);
    expect(widths).toEqual(['45%', '3%', '52%']);
  });

  it('ignores the late result of an abandoned analysis when a new image is picked', async () => {
    const user = userEvent.setup();
    let finish!: (o: Outcome) => void;
    const { analyze } = renderApp(() => new Promise<Outcome>((resolve) => { finish = resolve; }));
    await pickAndAnalyze(user);
    await act(async () => { window.history.back(); });
    await screen.findByRole('heading', { level: 1, name: 'Review image' });
    const gallery = document.querySelector<HTMLInputElement>('input[type="file"]:not([capture])')!;
    await user.upload(gallery, new File(['other'], 'other.png', { type: 'image/png' }));
    const signal = (analyze as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![2] as AbortSignal;
    expect(signal.aborted).toBe(true);
    await act(async () => finish({ ok: true, analysis: analysis() }));
    expect(screen.getByRole('heading', { level: 1, name: 'Review image' })).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Analyze image' });
    expect(button).not.toHaveAttribute('aria-disabled', 'true');
    await user.click(button);
    expect(analyze).toHaveBeenCalledTimes(2);
  });

  it('result view without an analysis shows an actionable empty state', async () => {
    window.location.hash = '#/result';
    renderApp({ ok: true, analysis: analysis() });
    expect(await screen.findByRole('heading', { name: 'There is no result yet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose an image' })).toBeInTheDocument();
  });
});

describe('Settings', () => {
  it('validates inline, keeps what was typed and tests the connection', async () => {
    window.location.hash = '#/settings';
    const user = userEvent.setup();
    const { services } = renderApp({ ok: true, analysis: analysis() }, false);
    const url = await screen.findByLabelText(/Server address/);
    await user.type(url, 'http://remote.example/mcp');
    await user.type(screen.getByLabelText(/Access key/), 'short');
    await user.click(screen.getByRole('button', { name: 'Save and test connection' }));
    expect(url).toHaveAttribute('aria-invalid', 'true');
    expect(url).toHaveAccessibleDescription(/https:\/\//);
    expect(url).toHaveFocus();
    expect(url).toHaveValue('http://remote.example/mcp');
    await expectNoSeriousA11yViolations();

    await user.clear(url);
    await user.type(url, 'https://tunnel.example/mcp');
    const key = screen.getByLabelText(/Access key/);
    await user.clear(key);
    await user.type(key, 'k'.repeat(30));
    await user.click(screen.getByRole('button', { name: 'Save and test connection' }));
    expect(await screen.findByText('Connection OK')).toBeInTheDocument();
    expect(services.connection.test).toHaveBeenCalledWith({ serverUrl: 'https://tunnel.example/mcp', accessKey: 'k'.repeat(30) });
  });
});

describe('Language', () => {
  it('switches to Spanish, updates <html lang> and remembers the choice', async () => {
    const user = userEvent.setup();
    renderApp({ ok: true, analysis: analysis() });
    await user.selectOptions(screen.getByLabelText('Language'), 'es');
    expect(await screen.findByRole('heading', { level: 1, name: 'Triaje orientativo de mamografías' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('es');
    expect(screen.getByText(es.disclaimer)).toBeInTheDocument();
    expect(screen.getByLabelText('Idioma')).toHaveValue('es');
    expect(localStorage.getItem('mammo-triage.locale')).toBe('es');
    await expectNoSeriousA11yViolations();
  });

  it('shows the whole flow in Spanish', async () => {
    const user = userEvent.setup();
    renderApp({ ok: true, analysis: analysis() }, true, 'es');
    const gallery = document.querySelector<HTMLInputElement>('input[type="file"]:not([capture])')!;
    await user.upload(gallery, photo);
    await user.click(await screen.findByRole('button', { name: 'Analizar imagen' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Resultado del triaje' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Mama derecha' })).toBeInTheDocument();
    expect(screen.getAllByText('Alta prioridad').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/se taparon 2 zonas de texto/)).toBeInTheDocument();
    expect(screen.getByText('80 %')).toBeInTheDocument();
  });

  it('keeps every key of the Spanish catalog in sync with English', () => {
    const shape = (o: object): string[] => Object.entries(o).flatMap(([k, v]) =>
      (v && typeof v === 'object' && !Array.isArray(v) ? shape(v).map((s) => `${k}.${s}`) : [k])).sort();
    expect(shape(es)).toEqual(shape(en));
    expect(es.home.tips).toHaveLength(en.home.tips.length);
  });
});
