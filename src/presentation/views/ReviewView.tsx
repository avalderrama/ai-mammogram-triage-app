import { useId, type FormEvent } from 'react';
import type { BreastSide, ViewType } from '../../domain/triage';
import { Banner } from '../components/Feedback';
import { ImagePicker } from '../components/ImagePicker';
import { useViewHeading } from '../hooks';
import { ROUTES } from '../routing';

export type PanelCount = 'auto' | 1 | 2 | 4;

export interface ImageOptions {
  readonly panelCount: PanelCount;
  readonly sides: readonly BreastSide[];
  readonly views: readonly ViewType[];
}

export const DEFAULT_OPTIONS: ImageOptions = { panelCount: 'auto', sides: [], views: [] };

const COUNT_CHOICES: { value: PanelCount; label: string }[] = [
  { value: 'auto', label: 'Detectar automáticamente' },
  { value: 1, label: '1 vista' },
  { value: 2, label: '2 vistas lado a lado' },
  { value: 4, label: '4 vistas lado a lado' },
];

function withCount(count: PanelCount): ImageOptions {
  const n = count === 'auto' ? 0 : count;
  return { panelCount: count, sides: Array(n).fill('unknown'), views: Array(n).fill('unknown') };
}

interface Props {
  file: File | null;
  previewUrl: string | null;
  options: ImageOptions;
  onOptionsChange: (options: ImageOptions) => void;
  onAnalyze: () => void;
  onPick: (file: File) => void;
  configured: boolean;
  online: boolean;
  busy: boolean;
}

export function ReviewView({ file, previewUrl, options, onOptionsChange, onAnalyze, onPick, configured, online,
  busy }: Props) {
  const heading = useViewHeading<HTMLHeadingElement>('Revisar imagen');
  const reasonId = useId();

  if (!file) {
    return (
      <>
        <h1 ref={heading} tabIndex={-1}>Revisar imagen</h1>
        <section className="empty" aria-labelledby="empty-title">
          <h2 id="empty-title">Todavía no elegiste ninguna imagen</h2>
          <p>Toma una foto de la mamografía o elige una imagen guardada para revisarla antes de analizarla.</p>
          <ImagePicker onPick={onPick} />
        </section>
      </>
    );
  }

  const blocked = !configured ? 'Primero configura el servidor y la clave en Ajustes.'
    : !online ? 'Sin conexión a internet: conéctate para analizar.' : null;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!blocked && !busy) onAnalyze();
  };
  const setPanel = (index: number, key: 'sides' | 'views', value: string) => {
    const next: string[] = [...options[key]];
    next[index] = value;
    onOptionsChange({ ...options, [key]: next } as ImageOptions);
  };

  return (
    <>
      <h1 ref={heading} tabIndex={-1}>Revisar imagen</h1>
      <figure className="preview">
        {previewUrl && <img src={previewUrl} alt="Vista previa de la imagen elegida" />}
        <figcaption className="text-secondary">
          {file.name} · {(file.size / 1_000_000).toLocaleString('es', { maximumFractionDigits: 1 })} MB
        </figcaption>
      </figure>
      <form onSubmit={submit} className="stack" noValidate>
        <fieldset className="fieldset">
          <legend>¿Cuántas vistas hay en la imagen?</legend>
          {COUNT_CHOICES.map((c) => (
            <label key={String(c.value)} className="choice">
              <input type="radio" name="panel-count" value={String(c.value)} checked={options.panelCount === c.value}
                onChange={() => onOptionsChange(withCount(c.value))} />
              {c.label}
            </label>
          ))}
        </fieldset>
        {options.panelCount !== 'auto' && (
          <details className="details">
            <summary>Opcional: indicar la mama y la proyección de cada vista</summary>
            <p className="text-secondary">Las vistas se cuentan de izquierda a derecha. Las vistas de la misma mama se
              combinan en un solo resultado.</p>
            {options.sides.map((side, i) => (
              <fieldset key={i} className="fieldset fieldset--inline">
                <legend>Vista {i + 1}</legend>
                <label className="field">
                  <span className="field__label">Mama</span>
                  <select value={side} onChange={(e) => setPanel(i, 'sides', e.target.value)}>
                    <option value="unknown">No lo sé</option>
                    <option value="R">Derecha</option>
                    <option value="L">Izquierda</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field__label">Proyección</span>
                  <select value={options.views[i]} onChange={(e) => setPanel(i, 'views', e.target.value)}>
                    <option value="unknown">No lo sé</option>
                    <option value="CC">CC (craneocaudal)</option>
                    <option value="MLO">MLO (oblicua mediolateral)</option>
                  </select>
                </label>
              </fieldset>
            ))}
          </details>
        )}
        {blocked && (
          <Banner tone="info">
            <p id={reasonId}>
              {blocked} {!configured && <a href={ROUTES.settings}>Ir a Ajustes</a>}
            </p>
          </Banner>
        )}
        <div className="actions">
          <button type="submit" className="button button--primary" aria-disabled={blocked !== null || busy}
            aria-describedby={blocked ? reasonId : undefined}>
            Analizar imagen
          </button>
        </div>
      </form>
      <section aria-labelledby="change-title" className="stack">
        <h2 id="change-title" className="heading-sm">¿No es la imagen correcta?</h2>
        <ImagePicker onPick={onPick} primary="none" />
      </section>
    </>
  );
}
