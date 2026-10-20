import type { AnalysisStep } from '../../application/analyzeMammogram';
import { Icon } from '../components/Icon';
import { useElapsedSeconds, useViewHeading } from '../hooks';
import { useI18n } from '../i18n/I18nProvider';

const STEPS: readonly AnalysisStep[] = ['preparing', 'analyzing'];

/** Long wait (> 5 s): real steps, elapsed time and a way to cancel (UX-EST-001, UX-PRN-005). */
export function AnalyzingView({ step, startedAt, onCancel }:
  { step: AnalysisStep; startedAt: number; onCancel: () => void }) {
  const { t } = useI18n();
  const a = t.analyzing;
  const heading = useViewHeading<HTMLHeadingElement>(a.docTitle);
  const seconds = useElapsedSeconds(startedAt);
  const current = STEPS.indexOf(step);
  const label = (s: AnalysisStep) => (s === 'preparing' ? a.stepPreparing : a.stepAnalyzing);
  return (
    <>
      <h1 ref={heading} tabIndex={-1}>{a.title}</h1>
      <p className="lead">{a.lead}</p>
      <ol className="steps" aria-label={a.stepsLabel}>
        {STEPS.map((s, i) => {
          const state = i < current ? 'done' : i === current ? 'current' : 'pending';
          return (
            <li key={s} className={`steps__item steps__item--${state}`} aria-current={state === 'current' ? 'step' : undefined}>
              <Icon name={state === 'done' ? 'check' : state === 'current' ? 'clock' : 'circle'} />
              <span>
                {label(s)}
                <span className="visually-hidden">{state === 'done' ? a.done : state === 'current' ? a.current : a.pending}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="progress" aria-hidden="true"><div className="progress__bar" /></div>
      <p role="status" className="visually-hidden">{label(step)}</p>
      <p className="text-secondary">{a.elapsed(seconds)}</p>
      <div className="actions">
        <button type="button" className="button button--secondary" onClick={onCancel}>{a.cancel}</button>
      </div>
    </>
  );
}
