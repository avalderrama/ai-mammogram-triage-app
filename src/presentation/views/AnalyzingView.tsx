import type { AnalysisStep } from '../../application/analyzeMammogram';
import { Icon } from '../components/Icon';
import { useElapsedSeconds, useViewHeading } from '../hooks';

const STEPS: { id: AnalysisStep | 'done'; label: string }[] = [
  { id: 'preparing', label: 'Preparar la imagen en este dispositivo' },
  { id: 'analyzing', label: 'Tapar datos personales, comprobar que sea una mamografía y analizar cada mama' },
];

/** Long wait (> 5 s): real steps, elapsed time and a way to cancel (UX-EST-001, UX-PRN-005). */
export function AnalyzingView({ step, startedAt, onCancel }:
  { step: AnalysisStep; startedAt: number; onCancel: () => void }) {
  const heading = useViewHeading<HTMLHeadingElement>('Analizando');
  const seconds = useElapsedSeconds(startedAt);
  const current = STEPS.findIndex((s) => s.id === step);
  return (
    <>
      <h1 ref={heading} tabIndex={-1}>Analizando la imagen</h1>
      <p className="lead">Suele tardar entre 5 y 30 segundos. Puedes cancelar en cualquier momento.</p>
      <ol className="steps" aria-label="Pasos del análisis">
        {STEPS.map((s, i) => {
          const state = i < current ? 'done' : i === current ? 'current' : 'pending';
          return (
            <li key={s.id} className={`steps__item steps__item--${state}`} aria-current={state === 'current' ? 'step' : undefined}>
              <Icon name={state === 'done' ? 'check' : state === 'current' ? 'clock' : 'circle'} />
              <span>
                {s.label}
                <span className="visually-hidden">
                  {state === 'done' ? ' (completado)' : state === 'current' ? ' (en curso)' : ' (pendiente)'}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="progress" aria-hidden="true"><div className="progress__bar" /></div>
      <p role="status" className="visually-hidden">{STEPS[current]?.label}</p>
      <p className="text-secondary">Tiempo transcurrido: {seconds} s</p>
      <div className="actions">
        <button type="button" className="button button--secondary" onClick={onCancel}>Cancelar análisis</button>
      </div>
    </>
  );
}
