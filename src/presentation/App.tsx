import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnalysisStep, AnalyzeMammogram, Outcome } from '../application/analyzeMammogram';
import type { ConnectionSettingsUseCases } from '../application/connection';
import { toFailure, TriageError } from '../application/errors';
import { APP_NAME } from './copy';
import { Banner } from './components/Feedback';
import { Icon } from './components/Icon';
import { useOnline, useViewHeading } from './hooks';
import { ROUTES, useRoute } from './routing';
import { AnalyzingView } from './views/AnalyzingView';
import { HomeView } from './views/HomeView';
import { ResultView } from './views/ResultView';
import { DEFAULT_OPTIONS, ReviewView, type ImageOptions } from './views/ReviewView';
import { SettingsView } from './views/SettingsView';

export interface AppServices {
  readonly analyze: AnalyzeMammogram;
  readonly connection: ConnectionSettingsUseCases;
}

type Run =
  | { readonly status: 'idle' }
  | { readonly status: 'running'; readonly step: AnalysisStep; readonly startedAt: number }
  | { readonly status: 'done'; readonly outcome: Outcome };

function isConfigured(connection: ConnectionSettingsUseCases): boolean {
  const s = connection.load();
  return Boolean(s.serverUrl && s.accessKey);
}

/**
 * Holds the picked image and the last result in memory only. Leaving the result ("Analizar otra imagen")
 * drops both, so no image or result outlives the session.
 */
export function App({ services }: { services: AppServices }) {
  const [route, navigate] = useRoute();
  const online = useOnline();
  const [image, setImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const previewRef = useRef<string | null>(null);
  const file = image?.file ?? null;
  const [options, setOptions] = useState<ImageOptions>(DEFAULT_OPTIONS);
  const [run, setRun] = useState<Run>({ status: 'idle' });
  const [configured, setConfigured] = useState(() => isConfigured(services.connection));
  const controller = useRef<AbortController | null>(null);

  /** The preview URL is created and revoked here, together with the file it shows. */
  const replaceImage = useCallback((next: File | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next ? URL.createObjectURL(next) : null;
    setImage(next && previewRef.current ? { file: next, previewUrl: previewRef.current } : null);
  }, []);
  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  /** Abandons the running analysis: its late result is ignored and a new one can start right away. */
  const detach = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
  }, []);

  const pick = useCallback((picked: File) => {
    detach();
    replaceImage(picked);
    setOptions(DEFAULT_OPTIONS);
    setRun({ status: 'idle' });
    navigate('review');
  }, [navigate, replaceImage, detach]);

  const analyze = useCallback(async () => {
    if (!file || controller.current) return; // prevents double submission (UX-CMP-005)
    const abort = new AbortController();
    controller.current = abort;
    setRun({ status: 'running', step: 'preparing', startedAt: Date.now() });
    navigate('analyzing');
    const count = options.panelCount === 'auto' ? undefined : options.panelCount;
    const layout = count !== undefined && (options.sides.some((s) => s !== 'unknown') || options.views.some((v) => v !== 'unknown'))
      ? { sides: options.sides, views: options.views } : undefined;
    const outcome = await services.analyze({ file, panelCount: count, layout },
      (step) => setRun((r) => (r.status === 'running' ? { ...r, step } : r)), abort.signal);
    if (controller.current !== abort) return; // abandoned (new image, start over or Back): ignore the late result
    controller.current = null;
    setRun({ status: 'done', outcome });
    // If the user already left with Back, stay where they went; otherwise replace "analyzing" in history.
    if (window.location.hash === ROUTES.analyzing) navigate('result', { replace: true });
  }, [file, options, navigate, services]);

  /** Cancels immediately, even while the photo is still being prepared on the phone; the late result is ignored. */
  const cancel = useCallback(() => {
    if (!controller.current) return;
    detach();
    setRun({ status: 'done', outcome: { ok: false, failure: toFailure(new TriageError('cancelled'),
      crypto.randomUUID().slice(0, 8).toUpperCase()) } });
    navigate('result', { replace: true });
  }, [detach, navigate]);

  const startOver = useCallback(() => {
    detach();
    replaceImage(null);
    setOptions(DEFAULT_OPTIONS);
    setRun({ status: 'idle' });
    navigate('home');
  }, [navigate, replaceImage, detach]);

  // Leaving the analyzing view with Back cancels the request instead of leaving it orphaned.
  useEffect(() => {
    if (route === 'analyzing' || route === 'result' || !controller.current) return;
    detach();
    setRun((r) => (r.status === 'running' ? { status: 'idle' } : r)); // Back left the analysis: nothing is running
  }, [route, detach]);

  const view = (() => {
    switch (route) {
      case 'home':
        return <HomeView configured={configured} onPick={pick} />;
      case 'review':
        return <ReviewView file={file} previewUrl={image?.previewUrl ?? null} options={options} onOptionsChange={setOptions}
          onAnalyze={() => void analyze()} onPick={pick} configured={configured} online={online}
          busy={run.status === 'running'} />;
      case 'analyzing':
        return run.status === 'running'
          ? <AnalyzingView step={run.step} startedAt={run.startedAt} onCancel={cancel} />
          : <ResultView outcome={run.status === 'done' ? run.outcome : null} running={false}
            onRetry={() => void analyze()} onNewImage={startOver} />;
      case 'result':
        return <ResultView outcome={run.status === 'done' ? run.outcome : null} running={run.status === 'running'}
          onRetry={() => void analyze()} onNewImage={startOver} />;
      case 'settings':
        return <SettingsView connection={services.connection}
          onSaved={() => setConfigured(isConfigured(services.connection))} />;
      default:
        return <NotFound />;
    }
  })();

  return (
    <>
      <a className="skip-link" href="#main" onClick={(e) => {
        e.preventDefault();
        document.getElementById('main')?.focus();
      }}>Saltar al contenido</a>
      <header className="header">
        <div className="header__inner">
          <a className="header__brand" href={ROUTES.home}>{APP_NAME} <span className="tag">Prueba</span></a>
          <nav aria-label="Principal">
            <ul className="nav">
              <li><a href={ROUTES.home} aria-current={route === 'home' ? 'page' : undefined}>Inicio</a></li>
              <li>
                <a href={ROUTES.settings} aria-current={route === 'settings' ? 'page' : undefined}>
                  <Icon name="settings" /> Ajustes
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      {!online && (
        <div className="container">
          <Banner tone="warning" live="polite" title="Sin conexión a internet">
            <p>Puedes seguir revisando la imagen. Para analizarla necesitas conexión.</p>
          </Banner>
        </div>
      )}
      <main id="main" className="container stack" tabIndex={-1}>{view}</main>
      <footer className="footer container">
        <p className="text-secondary">Herramienta de investigación. Las imágenes no se guardan.</p>
      </footer>
    </>
  );
}

function NotFound() {
  const heading = useViewHeading<HTMLHeadingElement>('Página no encontrada');
  return (
    <section className="empty">
      <h1 ref={heading} tabIndex={-1}>Esta página no existe</h1>
      <p>La dirección no corresponde a ninguna sección de la app.</p>
      <div className="actions"><a className="button button--primary" href={ROUTES.home}>Ir al inicio</a></div>
    </section>
  );
}
