import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AnalyzeMammogram, Outcome } from '../application/analyzeMammogram';
import type { ConnectionSettingsUseCases } from '../application/connection';
import { analysis, breast } from '../test/fixtures';
import { expectNoSeriousA11yViolations } from '../test/axe';
import { App, type AppServices } from './App';
import { DISCLAIMER } from './copy';

const photo = new File(['fake'], 'mamografia.jpg', { type: 'image/jpeg' });

function connection(configured = true): ConnectionSettingsUseCases {
  let stored = { serverUrl: configured ? 'https://x.example/mcp' : '', accessKey: configured ? 'k'.repeat(32) : '', rememberKey: false };
  return {
    load: () => stored,
    save: (s) => { stored = s; },
    test: vi.fn(async () => ({ ok: true as const })),
  };
}

function renderApp(outcome: Outcome | (() => Promise<Outcome>), configured = true) {
  const analyze = vi.fn(typeof outcome === 'function' ? outcome : async () => outcome) as unknown as AnalyzeMammogram;
  const services: AppServices = { analyze, connection: connection(configured) };
  render(<App services={services} />);
  return { analyze, services };
}

async function pickAndAnalyze(user = userEvent.setup()) {
  const gallery = document.querySelector<HTMLInputElement>('input[type="file"]:not([capture])')!;
  await user.upload(gallery, photo);
  expect(await screen.findByRole('heading', { level: 1, name: 'Revisar imagen' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Analizar imagen' }));
}

describe('App', () => {
  it('home offers camera and gallery, shows the disclaimer and has no serious a11y violations', async () => {
    renderApp({ ok: true, analysis: analysis() });
    expect(screen.getByRole('heading', { level: 1, name: 'Triaje orientativo de mamografías' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tomar foto/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Elegir imagen guardada/ })).toBeInTheDocument();
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toBeInTheDocument();
    await expectNoSeriousA11yViolations();
  });

  it('shows each breast level with text, icon and disclaimer, plus quality advice and heatmap', async () => {
    renderApp({ ok: true, analysis: analysis({
      overallLevel: 'high_priority',
      breasts: [breast(), breast({ label: 'L', side: 'L', level: 'no_suspicious_findings', qualityIssues: ['glare'],
        views: [{ ...breast().views[0]!, panel: 2, side: 'L', view: 'CC' }] })],
    }) });
    await pickAndAnalyze();
    expect(await screen.findByRole('heading', { level: 1, name: 'Resultado del triaje' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Mama derecha' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Mama izquierda' })).toBeInTheDocument();
    expect(screen.getAllByText('Alta prioridad').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Sin hallazgos sospechosos')).toBeInTheDocument();
    expect(screen.getByText(/Reflejos o zonas quemadas/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Mapa de calor de Mama derecha, MLO/ })).toHaveAttribute('width', '400');
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument();
    expect(screen.getByText(/se taparon 2 zonas de texto/)).toBeInTheDocument();
    await expectNoSeriousA11yViolations();
  });

  it('explains a missing heatmap and marks the result as partial', async () => {
    renderApp({ ok: true, analysis: analysis({
      breasts: [breast({ scoringMode: 'global_only', views: [{ ...breast().views[0]!, heatmap: null,
        heatmapUnavailableReason: 'low_resolution: needs at least 1500 px of height' }] })],
      rejectedPanels: [{ panel: 2, mammogramConfidence: 0.03 }],
    }) });
    await pickAndAnalyze();
    expect(await screen.findByText('Resultado parcial')).toBeInTheDocument();
    expect(screen.getByText(/al menos 1500 píxeles de alto/)).toBeInTheDocument();
    expect(screen.getByText(/No se analizaron la vista 2/)).toBeInTheDocument();
  });

  it('does not show any BI-RADS result when the image is not a mammogram', async () => {
    renderApp({ ok: false, failure: { kind: 'not_a_mammogram', correlationId: 'AB12CD34', retryable: false,
      rejectedPanels: [{ panel: 1, mammogramConfidence: 0.01 }] } });
    await pickAndAnalyze();
    expect(await screen.findByRole('heading', { name: 'La imagen no parece una mamografía' })).toBeInTheDocument();
    expect(screen.queryByText(/BI-RADS 4-5 \(biopsia\)/)).not.toBeInTheDocument();
    expect(screen.queryByText('Alta prioridad')).not.toBeInTheDocument();
    expect(screen.getByText('AB12CD34')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Volver a intentarlo' })).not.toBeInTheDocument();
    await expectNoSeriousA11yViolations();
  });

  it('shows real progress steps, lets the user cancel and offers a retry', async () => {
    let finish!: (o: Outcome) => void;
    const user = userEvent.setup();
    const { analyze } = renderApp(() => new Promise<Outcome>((resolve) => { finish = resolve; }));
    await pickAndAnalyze(user);
    expect(await screen.findByRole('heading', { level: 1, name: 'Analizando la imagen' })).toBeInTheDocument();
    await expectNoSeriousA11yViolations();
    await user.click(screen.getByRole('button', { name: 'Cancelar análisis' }));
    const signal = (analyze as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![2] as AbortSignal;
    expect(signal.aborted).toBe(true);
    // The cancellation shows right away, without waiting for the request to settle.
    expect(await screen.findByRole('heading', { name: 'Cancelaste el análisis' })).toBeInTheDocument();
    await act(async () => finish({ ok: true, analysis: analysis() }));
    expect(screen.queryByText('Mama derecha')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver a intentarlo' })).toBeInTheDocument();
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
    const button = await screen.findByRole('button', { name: 'Analizar imagen' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAccessibleDescription(/configura el servidor y la clave/);
    await user.click(button);
    expect(analyze).not.toHaveBeenCalled();
  });

  it('draws each probability bar proportional to its value', async () => {
    renderApp({ ok: true, analysis: analysis({ breasts: [breast({ probabilities: { routine: 0.45, shortFollowUp: 0.03, biopsy: 0.52 } })] }) });
    await pickAndAnalyze();
    await screen.findByRole('heading', { level: 1, name: 'Resultado del triaje' });
    const widths = [...document.querySelectorAll<HTMLElement>('.meter__fill')].map((el) => el.style.inlineSize);
    expect(widths).toEqual(['45%', '3%', '52%']);
  });

  it('ignores the late result of an abandoned analysis when a new image is picked', async () => {
    const user = userEvent.setup();
    let finish!: (o: Outcome) => void;
    const { analyze } = renderApp(() => new Promise<Outcome>((resolve) => { finish = resolve; }));
    await pickAndAnalyze(user);
    await act(async () => { window.history.back(); });
    await screen.findByRole('heading', { level: 1, name: 'Revisar imagen' });
    const gallery = document.querySelector<HTMLInputElement>('input[type="file"]:not([capture])')!;
    await user.upload(gallery, new File(['other'], 'otra.png', { type: 'image/png' }));
    const signal = (analyze as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![2] as AbortSignal;
    expect(signal.aborted).toBe(true);
    await act(async () => finish({ ok: true, analysis: analysis() }));
    expect(screen.getByRole('heading', { level: 1, name: 'Revisar imagen' })).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Analizar imagen' });
    expect(button).not.toHaveAttribute('aria-disabled', 'true');
    await user.click(button);
    expect(analyze).toHaveBeenCalledTimes(2);
  });

  it('result view without an analysis shows an actionable empty state', async () => {
    window.location.hash = '#/resultado';
    renderApp({ ok: true, analysis: analysis() });
    expect(await screen.findByRole('heading', { name: 'Todavía no hay ningún resultado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Elegir una imagen' })).toBeInTheDocument();
  });
});

describe('Settings', () => {
  it('validates inline, keeps what was typed and tests the connection', async () => {
    window.location.hash = '#/ajustes';
    const user = userEvent.setup();
    const { services } = renderApp({ ok: true, analysis: analysis() }, false);
    const url = await screen.findByLabelText(/Dirección del servidor/);
    await user.type(url, 'http://remote.example/mcp');
    await user.type(screen.getByLabelText(/Clave de acceso/), 'short');
    await user.click(screen.getByRole('button', { name: 'Guardar y probar conexión' }));
    expect(url).toHaveAttribute('aria-invalid', 'true');
    expect(url).toHaveAccessibleDescription(/https:\/\//);
    expect(url).toHaveFocus();
    expect(url).toHaveValue('http://remote.example/mcp');
    await expectNoSeriousA11yViolations();

    await user.clear(url);
    await user.type(url, 'https://tunnel.example/mcp');
    const key = screen.getByLabelText(/Clave de acceso/);
    await user.clear(key);
    await user.type(key, 'k'.repeat(30));
    await user.click(screen.getByRole('button', { name: 'Guardar y probar conexión' }));
    expect(await screen.findByText('Conexión correcta')).toBeInTheDocument();
    expect(services.connection.test).toHaveBeenCalledWith({ serverUrl: 'https://tunnel.example/mcp', accessKey: 'k'.repeat(30) });
  });
});
