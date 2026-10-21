import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnalysisStep, AnalyzeMammogram, Outcome } from '../application/analyzeMammogram';
import type { ConnectionSettingsUseCases } from '../application/connection';
import { toFailure, TriageError } from '../application/errors';
import type { CropProposal } from '../application/ports';
import type { ProposeCrop } from '../application/proposeCrop';
import type { CropBox } from '../domain/crop';
import { Banner } from './components/Feedback';
import { Icon } from './components/Icon';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { useOnline, useViewHeading } from './hooks';
import { useI18n } from './i18n/I18nProvider';
import { ROUTES, useRoute } from './routing';
import { AnalyzingView } from './views/AnalyzingView';
import { HomeView } from './views/HomeView';
import { ResultView } from './views/ResultView';
import { DEFAULT_OPTIONS, ReviewView, type CropState, type ImageOptions } from './views/ReviewView';
import { SettingsView } from './views/SettingsView';

export interface AppServices {
  readonly analyze: AnalyzeMammogram;
  readonly connection: ConnectionSettingsUseCases;
  readonly proposeCrop: ProposeCrop;
}

type Run =
  | { readonly status: 'idle' }
  | { readonly status: 'running'; readonly step: AnalysisStep; readonly startedAt: number }
  | { readonly status: 'done'; readonly outcome: Outcome };

function isConfigured(connection: ConnectionSettingsUseCases): boolean {
  const s = connection.load();
  return Boolean(s.serverUrl); // the access key is optional (not needed behind Cloudflare Access)
}

/**
 * Holds the picked image and the last result in memory only. Leaving the result ("Analyze another image")
 * drops both, so no image or result outlives the session.
 */
export function App({ services }: { services: AppServices }) {
  const { t } = useI18n();
  const [route, navigate] = useRoute();
  const online = useOnline();
  const [image, setImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const previewRef = useRef<string | null>(null);
  const file = image?.file ?? null;
  const [options, setOptions] = useState<ImageOptions>(DEFAULT_OPTIONS);
  const [run, setRun] = useState<Run>({ status: 'idle' });
  const [crop, setCrop] = useState<CropState>({ status: 'detecting' });
  const proposal = useRef<CropProposal | null>(null);
  const cropDetection = useRef<AbortController | null>(null);
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

  /** Proposes the crop of a new image; a late proposal for an image that was replaced is ignored. */
  const detectCrop = useCallback((picked: File) => {
    cropDetection.current?.abort();
    const detection = new AbortController();
    cropDetection.current = detection;
    proposal.current = null;
    setCrop({ status: 'detecting' });
    services.proposeCrop(picked, detection.signal).then((found) => {
      if (cropDetection.current !== detection) return;
      proposal.current = found;
      setCrop({ status: 'ready', source: found.source, box: found.box });
    }, (error: unknown) => {
      if (cropDetection.current !== detection || detection.signal.aborted) return;
      setCrop({ status: 'rejected', failure: toFailure(error, crypto.randomUUID().slice(0, 8).toUpperCase()) });
    });
  }, [services]);
  useEffect(() => () => cropDetection.current?.abort(), []);

  const pick = useCallback((picked: File) => {
    detach();
    replaceImage(picked);
    setOptions(DEFAULT_OPTIONS);
    setRun({ status: 'idle' });
    detectCrop(picked);
    navigate('review');
  }, [navigate, replaceImage, detach, detectCrop]);

  const changeCrop = useCallback((box: CropBox) => {
    setCrop((c) => (c.status === 'ready' ? { ...c, box } : c));
  }, []);
  const resetCrop = useCallback(() => {
    if (proposal.current) setCrop({ status: 'ready', ...proposal.current });
  }, []);

  const analyze = useCallback(async () => {
    if (!file || controller.current || crop.status !== 'ready') return; // prevents double submission (UX-CMP-005)
    const box = crop.box;
    const abort = new AbortController();
    controller.current = abort;
    setRun({ status: 'running', step: 'preparing', startedAt: Date.now() });
    navigate('analyzing');
    const count = options.panelCount === 'auto' ? undefined : options.panelCount;
    const layout = count !== undefined && (options.sides.some((s) => s !== 'unknown') || options.views.some((v) => v !== 'unknown'))
      ? { sides: options.sides, views: options.views } : undefined;
    const outcome = await services.analyze({ file, crop: box, panelCount: count, layout },
      (step) => setRun((r) => (r.status === 'running' ? { ...r, step } : r)), abort.signal);
    if (controller.current !== abort) return; // abandoned (new image, start over or Back): ignore the late result
    controller.current = null;
    setRun({ status: 'done', outcome });
    // If the user already left with Back, stay where they went; otherwise replace "analyzing" in history.
    if (window.location.hash === ROUTES.analyzing) navigate('result', { replace: true });
  }, [file, crop, options, navigate, services]);

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
    cropDetection.current?.abort();
    cropDetection.current = null;
    proposal.current = null;
    setCrop({ status: 'detecting' });
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
          onAnalyze={() => void analyze()} onPick={pick} crop={crop} onCropChange={changeCrop} onCropReset={resetCrop}
          configured={configured} online={online}
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
      }}>{t.app.skipLink}</a>
      <header className="header">
        <div className="header__inner">
          <a className="header__brand" href={ROUTES.home}>
            <img className="header__logo" src="./icon.svg" alt="" width="32" height="32" />
            <span>{t.app.name}</span> <span className="tag">{t.app.tag}</span>
          </a>
          <div className="header__end">
            <nav aria-label={t.app.navLabel}>
              <ul className="nav">
                <li><a href={ROUTES.home} aria-current={route === 'home' ? 'page' : undefined}>{t.app.navHome}</a></li>
                <li>
                  <a href={ROUTES.settings} aria-current={route === 'settings' ? 'page' : undefined}>
                    <Icon name="settings" /> {t.app.navSettings}
                  </a>
                </li>
              </ul>
            </nav>
            <LanguageSwitcher />
          </div>
        </div>
      </header>
      {!online && (
        <div className="container">
          <Banner tone="warning" live="polite" title={t.app.offlineTitle}>
            <p>{t.app.offlineBody}</p>
          </Banner>
        </div>
      )}
      <main id="main" className="container stack" tabIndex={-1}>{view}</main>
      <footer className="footer container">
        <p className="text-secondary">{t.app.footer}</p>
      </footer>
    </>
  );
}

function NotFound() {
  const { t } = useI18n();
  const heading = useViewHeading<HTMLHeadingElement>(t.notFound.docTitle);
  return (
    <section className="empty">
      <h1 ref={heading} tabIndex={-1}>{t.notFound.title}</h1>
      <p>{t.notFound.body}</p>
      <div className="actions"><a className="button button--primary" href={ROUTES.home}>{t.notFound.home}</a></div>
    </section>
  );
}
