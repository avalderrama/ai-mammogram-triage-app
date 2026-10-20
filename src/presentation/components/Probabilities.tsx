import type { BiradsProbabilities } from '../../domain/triage';
import { useI18n } from '../i18n/I18nProvider';

const GROUPS = [
  { key: 'routine', className: 'routine' },
  { key: 'shortFollowUp', className: 'follow-up' },
  { key: 'biopsy', className: 'biopsy' },
] as const;

/**
 * One stacked bar with the three BI-RADS groups plus a legend with the exact percentages. The bar is decorative
 * (aria-hidden); the legend carries the information as text, so color is never the only carrier (UX-VIS-013).
 */
export function Probabilities({ probabilities }: { probabilities: BiradsProbabilities }) {
  const { t } = useI18n();
  return (
    <div className="probabilities">
      <div className="stack-bar" aria-hidden="true">
        {GROUPS.map((g) => (
          // CSS width needs "45%" without the locale's space, so it is not built with the formatter.
          <span key={g.key} className={`stack-bar__segment stack-bar__segment--${g.className}`}
            style={{ inlineSize: `${Math.round(probabilities[g.key] * 100)}%` }} />
        ))}
      </div>
      <dl className="legend" aria-label={t.result.probabilitiesLabel}>
        {GROUPS.map((g) => (
          <div key={g.key} className="legend__row">
            <dt><span className={`legend__swatch legend__swatch--${g.className}`} aria-hidden="true" />{t.result.groups[g.key]}</dt>
            <dd>{t.percent(probabilities[g.key])}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
