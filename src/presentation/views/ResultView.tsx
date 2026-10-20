import type { ReactNode } from 'react';
import type { Outcome } from '../../application/analyzeMammogram';
import {
  breastsByUrgency, isPartial, studyQualityIssues, type Analysis, type BiradsProbabilities, type BreastResult,
  type ViewResult,
} from '../../domain/triage';
import { breastTitle, FAILURE_COPY, LEVEL_COPY, percent, QUALITY_COPY, SIDE_COPY, VIEW_COPY } from '../copy';
import { Banner, Disclaimer, FailurePanel, LevelBadge } from '../components/Feedback';
import { useViewHeading } from '../hooks';
import { ROUTES } from '../routing';

interface Props {
  outcome: Outcome | null;
  running: boolean;
  onRetry: () => void;
  onNewImage: () => void;
}

/** Five states (UX-EST-000): loading, empty, error, partial and with data. */
export function ResultView({ outcome, running, onRetry, onNewImage }: Props) {
  const heading = useViewHeading<HTMLHeadingElement>('Resultado');
  const title = <h1 ref={heading} tabIndex={-1}>Resultado del triaje</h1>;

  if (running) {
    return (
      <>
        {title}
        <div className="skeleton" role="status" aria-label="Cargando el resultado">
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
          <h2 id="empty-title">Todavía no hay ningún resultado</h2>
          <p>Los resultados no se guardan: solo ves el último análisis mientras la app está abierta.</p>
          <div className="actions">
            <button type="button" className="button button--primary" onClick={onNewImage}>Elegir una imagen</button>
          </div>
        </section>
      </>
    );
  }
  if (!outcome.ok) {
    const fix = FAILURE_COPY[outcome.failure.kind].fix;
    return (
      <>
        {title}
        <FailurePanel failure={outcome.failure} actions={
          <>
            {outcome.failure.retryable && (
              <button type="button" className="button button--primary" onClick={onRetry}>Volver a intentarlo</button>
            )}
            {fix === 'settings' && <a className="button button--primary" href={ROUTES.settings}>Ir a Ajustes</a>}
            <button type="button" className={`button ${fix === 'image' ? 'button--primary' : 'button--secondary'}`}
              onClick={onNewImage}>Elegir otra imagen</button>
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
  const issues = studyQualityIssues(analysis);
  return (
    <>
      {heading}
      <section className="summary" aria-labelledby="summary-title" role="status">
        <h2 id="summary-title" className="visually-hidden">Resultado general</h2>
        <p className="summary__label">Resultado general</p>
        <LevelBadge level={analysis.overallLevel} large />
        <p>{LEVEL_COPY[analysis.overallLevel].explanation}</p>
      </section>
      <Disclaimer />
      {isPartial(analysis) && (
        <Banner tone="warning" title="Resultado parcial">
          {analysis.rejectedPanels.length > 0 && (
            <p>No se analizaron {analysis.rejectedPanels.length === 1 ? 'la vista' : 'las vistas'}{' '}
              {analysis.rejectedPanels.map((r) => r.panel).join(', ')} porque no parecen mamografías.</p>
          )}
          {analysis.breasts.some((b) => b.scoringMode === 'global_only') && (
            <p>La resolución no alcanza para el análisis detallado ni el mapa de calor en algunas vistas: se usó solo el
              modelo general.</p>
          )}
        </Banner>
      )}
      {issues.length > 0 && (
        <Banner tone="warning" title="Mejora la foto para un resultado más fiable">
          <ul className="list">
            {issues.map((q) => <li key={q}><strong>{QUALITY_COPY[q].problem}</strong> {QUALITY_COPY[q].action}</li>)}
          </ul>
        </Banner>
      )}
      {breastsByUrgency(analysis).map((b) => <BreastCard key={b.label} breast={b} />)}
      <p className="text-secondary">
        {analysis.maskedTextRegions === 0 ? 'No se encontró texto con datos personales en la imagen.'
          : analysis.maskedTextRegions === 1 ? 'Antes de analizar se tapó 1 zona de texto con posibles datos personales.'
            : `Antes de analizar se taparon ${analysis.maskedTextRegions} zonas de texto con posibles datos personales.`}{' '}
        Versión del modelo: {analysis.modelVersion}.
      </p>
      <div className="actions">
        <button type="button" className="button button--primary" onClick={onNewImage}>Analizar otra imagen</button>
        <a className="button button--secondary" href={ROUTES.review}>Volver a la imagen</a>
      </div>
    </>
  );
}

function BreastCard({ breast }: { breast: BreastResult }) {
  const id = `breast-${breast.label.replace(/\W+/g, '-')}`;
  return (
    <article className="card" aria-labelledby={id}>
      <div className="card__header">
        <h2 id={id}>{breastTitle(breast.side, breast.label)}</h2>
        <LevelBadge level={breast.level} />
      </div>
      <p>{LEVEL_COPY[breast.level].explanation}</p>
      <Probabilities probabilities={breast.probabilities} />
      {breast.views.map((v) => <ViewHeatmap key={v.panel} view={v} />)}
    </article>
  );
}

function Probabilities({ probabilities }: { probabilities: BiradsProbabilities }) {
  const rows: [string, number][] = [
    ['BI-RADS 1-2 (control habitual)', probabilities.routine],
    ['BI-RADS 3 (seguimiento corto)', probabilities.shortFollowUp],
    ['BI-RADS 4-5 (biopsia)', probabilities.biopsy],
  ];
  return (
    <dl className="probabilities" aria-label="Probabilidad estimada por grupo BI-RADS">
      {rows.map(([label, value]) => (
        <div key={label} className="probabilities__row">
          <dt>{label}</dt>
          <dd>
            <span className="probabilities__value">{percent(value)}</span>
            <span className="meter" aria-hidden="true"><span className="meter__fill" style={{ inlineSize: `${Math.round(value * 100)}%` }} /></span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ViewHeatmap({ view }: { view: ViewResult }) {
  const name = `${view.side === 'unknown' ? `Vista ${view.panel}` : SIDE_COPY[view.side]}, ${VIEW_COPY[view.view]}`;
  if (!view.heatmap) {
    const lowResolution = view.heatmapUnavailableReason?.startsWith('low_resolution');
    return (
      <p className="text-secondary">
        Mapa de calor no disponible ({name}):{' '}
        {lowResolution
          ? 'la imagen necesita al menos 1500 píxeles de alto. Usa la imagen original o acércate más.'
          : 'no se generó para esta vista.'}
      </p>
    );
  }
  return (
    <figure className="heatmap">
      <img src={view.heatmap.url} width={view.heatmap.width} height={view.heatmap.height} loading="lazy"
        alt={`Mapa de calor de ${name}: las zonas en rojo son las que más llamaron la atención del modelo.`} />
      <figcaption className="text-secondary">{name}. En rojo, las zonas que más llamaron la atención del modelo.</figcaption>
    </figure>
  );
}
