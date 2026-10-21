import type { ReactNode } from 'react';
import type { Failure } from '../../application/errors';
import type { TriageLevel } from '../../domain/triage';
import { useI18n } from '../i18n/I18nProvider';
import { FAILURE_FIX } from '../i18n/messages';
import { Icon, type IconName } from './Icon';

const LEVEL_ICON: Record<TriageLevel, IconName> = { high_priority: 'alert', review: 'eye', no_suspicious_findings: 'check' };

/** Level shown with icon + text + color, never color alone (UX-VIS-013). */
export function LevelBadge({ level, large = false }: { level: TriageLevel; large?: boolean }) {
  const { t } = useI18n();
  return (
    <span className={`level level--${level}${large ? ' level--large' : ''}`}>
      <Icon name={LEVEL_ICON[level]} size={large ? 'lg' : 'md'} />
      <span>{t.levels[level].label}</span>
    </span>
  );
}

type Tone = 'info' | 'warning' | 'danger' | 'success';
const TONE_ICON: Record<Tone, IconName> = { info: 'info', warning: 'alert', danger: 'error', success: 'check' };

/** View-wide message (UX-FBK-002). `live` announces it to assistive technologies (UX-FBK-005). */
export function Banner({ tone, title, children, live }:
  { tone: Tone; title?: string; children?: ReactNode; live?: 'polite' | 'assertive' }) {
  const role = live === 'assertive' ? 'alert' : live === 'polite' ? 'status' : undefined;
  return (
    <div className={`banner banner--${tone}`} role={role}>
      <Icon name={TONE_ICON[tone]} />
      <div className="banner__body">
        {title && <p className="banner__title">{title}</p>}
        {children}
      </div>
    </div>
  );
}

export function Disclaimer() {
  const { t } = useI18n();
  return (
    <p className="disclaimer">
      <Icon name="shield" />
      <span>{t.disclaimer}</span>
    </p>
  );
}

/** Error with a way out (UX-EST-004): what failed, whether it is temporary, what to do, reference code. */
export function FailurePanel({ failure, headingLevel = 2, actions }:
  { failure: Failure; headingLevel?: 2 | 3; actions: ReactNode }) {
  const { t } = useI18n();
  const copy = t.failures[failure.kind];
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section className="failure" aria-labelledby="failure-title">
      <div className="failure__header">
        <Icon name={failure.kind === 'offline' ? 'offline' : 'error'} size="lg" />
        <Heading id="failure-title" className="failure__title">{copy.title}</Heading>
      </div>
      <p>{copy.body(failure.retryAfterSeconds)}</p>
      {failure.rejectedPanels && failure.rejectedPanels.length > 0 && (
        <p className="text-secondary">{t.failurePanel.reviewedPanels(failure.rejectedPanels.length)}</p>
      )}
      <div className="actions">
        {FAILURE_FIX[failure.kind] === 'reload'
          ? <button type="button" className="button button--primary" onClick={() => window.location.reload()}>{t.reload}</button>
          : actions}
      </div>
      <p className="text-secondary failure__reference">{t.failurePanel.reference} <code>{failure.correlationId}</code></p>
    </section>
  );
}
