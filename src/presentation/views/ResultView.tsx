import type { ReactNode } from 'react';
import type { Outcome } from '../../application/analyzeMammogram';
import { breastsByUrgency, isPartial, studyQualityIssues, type Analysis, type BreastResult } from '../../domain/triage';
import { Banner, Disclaimer, FailurePanel, LevelBadge } from '../components/Feedback';
import { LesionViewer } from '../components/LesionViewer';
import { Probabilities } from '../components/Probabilities';
import { useViewHeading } from '../hooks';
import { useI18n } from '../i18n/I18nProvider';
import { FAILURE_FIX } from '../i18n/messages';
import { ROUTES } from '../routing';

interface Props {
  outcome: Outcome | null;
  running: boolean;
  onRetry: () => void;
  onNewImage: () => void;
}

/** Five states (UX-EST-000): loading, empty, error, partial and with data. */
export function ResultView({ outcome, running, onRetry, onNewImage }: Props) {
  const { t } = useI18n();
  const r = t.result;
  const heading = useViewHeading<HTMLHeadingElement>(r.docTitle);
  const title = <h1 ref={heading} tabIndex={-1}>{r.title}</h1>;

  if (running) {
    return (
      <>
        {title}
        <div className="skeleton" role="status" aria-label={r.loading}>
          <div className="skeleton__line skeleton__line--wide" />
          <div className="skeleton__block" />
          <div className="skeleton__block" />
        </div>
      </>
    );
  }
  if (!outcome) {
    return (
      <>
        {title}
        <section className="empty" aria-labelledby="empty-title">
          <h2 id="empty-title">{r.emptyTitle}</h2>
          <p>{r.emptyBody}</p>
          <div className="actions">
            <button type="button" className="button button--primary" onClick={onNewImage}>{r.pickImage}</button>
          </div>
        </section>
      </>
    );
  }
  if (!outcome.ok) {
    const fix = FAILURE_FIX[outcome.failure.kind];
    return (
      <>
        {title}
        <FailurePanel failure={outcome.failure} actions={
          <>
            {outcome.failure.retryable && (
              <button type="button" className="button button--primary" onClick={onRetry}>{r.retry}</button>
            )}
            {fix === 'settings' && <a className="button button--primary" href={ROUTES.settings}>{r.goToSettings}</a>}
            <button type="button" className={`button ${fix === 'image' ? 'button--primary' : 'button--secondary'}`}
              onClick={onNewImage}>{r.pickOther}</button>
          </>
        } />
        <Disclaimer />
      </>
    );
  }
  return <AnalysisResult heading={title} analysis={outcome.analysis} onNewImage={onNewImage} />;
}

function AnalysisResult({ heading, analysis, onNewImage }:
  { heading: ReactNode; analysis: Analysis; onNewImage: () => void }) {
  const { t } = useI18n();
  const r = t.result;
  const issues = studyQualityIssues(analysis);
  return (
    <>
      {heading}
      <div className="result-layout">
        <aside className="result-layout__aside">
          <section className={`summary summary--${analysis.overallLevel}`} aria-labelledby="summary-title" role="status">
            <h2 id="summary-title" className="eyebrow">{r.overall}</h2>
            <LevelBadge level={analysis.overallLevel} large />
            <p>{t.levels[analysis.overallLevel].explanation}</p>
            <p className="note">{r.summaryNextStep}</p>
          </section>
          <Disclaimer />
          <p className="note">{r.masked(analysis.maskedTextRegions)} {r.modelVersion(analysis.modelVersion)}</p>
        </aside>
        <div className="result-layout__main">
          {isPartial(analysis) && (
            <Banner tone="warning" title={r.partialTitle}>
              {analysis.rejectedPanels.length > 0 && <p>{r.rejectedPanels(analysis.rejectedPanels.map((p) => p.panel))}</p>}
              {analysis.breasts.some((b) => b.scoringMode === 'global_only') && <p>{r.globalOnly}</p>}
            </Banner>
          )}
          {issues.length > 0 && (
            <Banner tone="warning" title={r.qualityTitle}>
              <ul className="list">
                {issues.map((q) => <li key={q}><strong>{t.quality[q].problem}</strong> {t.quality[q].action}</li>)}
              </ul>
            </Banner>
          )}
          {breastsByUrgency(analysis).map((b) => <BreastCard key={b.label} breast={b} />)}
        </div>
        {/* After the details on phones; under the summary on wide screens (reading order = DOM order on phones). */}
        <div className="result-layout__actions actions actions--stacked">
          <button type="button" className="button button--primary" onClick={onNewImage}>{r.analyzeAnother}</button>
          <a className="button button--secondary" href={ROUTES.review}>{r.backToImage}</a>
        </div>
      </div>
    </>
  );
}

function BreastCard({ breast }: { breast: BreastResult }) {
  const { t } = useI18n();
  const id = `breast-${breast.label.replace(/\W+/g, '-')}`;
  return (
    <article className={`card breast breast--${breast.level}`} aria-labelledby={id}>
      <header className="breast__header">
        <h2 id={id}>{t.breastTitle(breast.side, breast.label)}</h2>
        <LevelBadge level={breast.level} />
      </header>
      <p>{t.levels[breast.level].explanation}</p>
      <Probabilities probabilities={breast.probabilities} />
      <div className="breast__views">
        {breast.views.map((v) => <LesionViewer key={v.panel} view={v} />)}
      </div>
    </article>
  );
}
