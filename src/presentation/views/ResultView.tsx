import type { ReactNode } from 'react';
import type { Outcome } from '../../application/analyzeMammogram';
import {
  breastsByUrgency, isPartial, studyQualityIssues, type Analysis, type BiradsProbabilities, type BreastResult,
  type ViewResult,
} from '../../domain/triage';
import { Banner, Disclaimer, FailurePanel, LevelBadge } from '../components/Feedback';
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
      <section className="summary" aria-labelledby="summary-title" role="status">
        <h2 id="summary-title" className="visually-hidden">{r.overall}</h2>
        <p className="summary__label">{r.overall}</p>
        <LevelBadge level={analysis.overallLevel} large />
        <p>{t.levels[analysis.overallLevel].explanation}</p>
      </section>
      <Disclaimer />
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
      <p className="text-secondary">{r.masked(analysis.maskedTextRegions)} {r.modelVersion(analysis.modelVersion)}</p>
      <div className="actions">
        <button type="button" className="button button--primary" onClick={onNewImage}>{r.analyzeAnother}</button>
        <a className="button button--secondary" href={ROUTES.review}>{r.backToImage}</a>
      </div>
    </>
  );
}

function BreastCard({ breast }: { breast: BreastResult }) {
  const { t } = useI18n();
  const id = `breast-${breast.label.replace(/\W+/g, '-')}`;
  return (
    <article className="card" aria-labelledby={id}>
      <div className="card__header">
        <h2 id={id}>{t.breastTitle(breast.side, breast.label)}</h2>
        <LevelBadge level={breast.level} />
      </div>
      <p>{t.levels[breast.level].explanation}</p>
      <Probabilities probabilities={breast.probabilities} />
      {breast.views.map((v) => <ViewHeatmap key={v.panel} view={v} />)}
    </article>
  );
}

function Probabilities({ probabilities }: { probabilities: BiradsProbabilities }) {
  const { t } = useI18n();
  const g = t.result.groups;
  const rows: [string, number][] = [
    [g.routine, probabilities.routine],
    [g.shortFollowUp, probabilities.shortFollowUp],
    [g.biopsy, probabilities.biopsy],
  ];
  return (
    <dl className="probabilities" aria-label={t.result.probabilitiesLabel}>
      {rows.map(([label, value]) => (
        <div key={label} className="probabilities__row">
          <dt>{label}</dt>
          <dd>
            <span className="probabilities__value">{t.percent(value)}</span>
            {/* CSS width needs "45%" without the locale's space, so it is not built with the formatter. */}
            <span className="meter" aria-hidden="true"><span className="meter__fill" style={{ inlineSize: `${Math.round(value * 100)}%` }} /></span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ViewHeatmap({ view }: { view: ViewResult }) {
  const { t } = useI18n();
  const name = t.result.viewName(view.side, view.panel, view.view);
  if (!view.heatmap) {
    const lowResolution = view.heatmapUnavailableReason?.startsWith('low_resolution') ?? false;
    return <p className="text-secondary">{t.result.heatmapUnavailable(name, lowResolution)}</p>;
  }
  return (
    <figure className="heatmap">
      <img src={view.heatmap.url} width={view.heatmap.width} height={view.heatmap.height} loading="lazy"
        alt={t.result.heatmapAlt(name)} />
      <figcaption className="text-secondary">{t.result.heatmapCaption(name)}</figcaption>
    </figure>
  );
}
