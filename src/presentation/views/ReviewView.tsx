import { useId, type FormEvent } from 'react';
import type { Failure } from '../../application/errors';
import type { CropSource } from '../../application/ports';
import type { CropBox } from '../../domain/crop';
import type { BreastSide, ViewType } from '../../domain/triage';
import { CropActions, CropEditor } from '../components/CropEditor';
import { Banner, FailurePanel } from '../components/Feedback';
import { ImagePicker } from '../components/ImagePicker';
import { useViewHeading } from '../hooks';
import { useI18n } from '../i18n/I18nProvider';
import { ROUTES } from '../routing';

/** 'grid': four views in two rows of two (a 2 x 2 figure). */
export type PanelCount = 'auto' | 1 | 2 | 4 | 'grid';

export interface ImageOptions {
  readonly panelCount: PanelCount;
  readonly sides: readonly BreastSide[];
  readonly views: readonly ViewType[];
}

export const DEFAULT_OPTIONS: ImageOptions = { panelCount: 'auto', sides: [], views: [] };

/** The crop of the picked image: being proposed, ready to adjust, or refused (an image too large to open). */
export type CropState =
  | { readonly status: 'detecting' }
  | { readonly status: 'ready'; readonly source: CropSource; readonly box: CropBox }
  | { readonly status: 'rejected'; readonly failure: Failure };

const COUNT_CHOICES: { value: PanelCount; key: 'auto' | 'one' | 'two' | 'four' | 'grid' }[] = [
  { value: 'auto', key: 'auto' },
  { value: 1, key: 'one' },
  { value: 2, key: 'two' },
  { value: 4, key: 'four' },
  { value: 'grid', key: 'grid' },
];

/** How many views a choice means (none for automatic detection). */
export function viewCount(count: PanelCount): number {
  if (count === 'auto') return 0;
  return count === 'grid' ? 4 : count;
}

function withCount(count: PanelCount): ImageOptions {
  const n = viewCount(count);
  return { panelCount: count, sides: Array(n).fill('unknown'), views: Array(n).fill('unknown') };
}

interface Props {
  file: File | null;
  previewUrl: string | null;
  options: ImageOptions;
  onOptionsChange: (options: ImageOptions) => void;
  onAnalyze: () => void;
  onPick: (file: File) => void;
  crop: CropState;
  onCropChange: (box: CropBox) => void;
  onCropReset: () => void;
  configured: boolean;
  online: boolean;
  busy: boolean;
}

export function ReviewView({ file, previewUrl, options, onOptionsChange, onAnalyze, onPick, crop, onCropChange,
  onCropReset, configured, online, busy }: Props) {
  const { t } = useI18n();
  const r = t.review;
  const heading = useViewHeading<HTMLHeadingElement>(r.docTitle);
  const reasonId = useId();
  const cropHelpId = useId();

  if (!file) {
    return (
      <>
        <h1 ref={heading} tabIndex={-1}>{r.title}</h1>
        <section className="empty" aria-labelledby="empty-title">
          <h2 id="empty-title">{r.emptyTitle}</h2>
          <p>{r.emptyBody}</p>
          <ImagePicker onPick={onPick} />
        </section>
      </>
    );
  }

  const blocked = !configured ? r.blockedNotConfigured : !online ? r.blockedOffline
    : crop.status === 'detecting' ? r.blockedDetecting : crop.status === 'rejected' ? r.blockedRejected : null;
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
      <h1 ref={heading} tabIndex={-1}>{r.title}</h1>
      <div className="split">
        <div className="stack stack--tight">
          {crop.status === 'rejected' ? <FailurePanel failure={crop.failure} actions={null} /> : (
            <figure className="preview">
              {/* The image is drawn only once its size was checked: a huge one is never decoded on the phone. */}
              {previewUrl && crop.status === 'ready'
                ? <CropEditor imageUrl={previewUrl} alt={r.previewAlt} box={crop.box} onChange={onCropChange}
                  helpId={cropHelpId} />
                : <div className="preview__placeholder" aria-hidden="true" />}
              <figcaption className="text-secondary">{file.name} · {t.megabytes(file.size)}</figcaption>
            </figure>
          )}
          <div aria-live="polite" className="stack stack--tight">
            {crop.status === 'detecting' && <p className="text-secondary">{r.cropDetecting}</p>}
            {crop.status === 'ready' && crop.source === 'detected' && <p className="text-secondary">{r.cropDetected}</p>}
            {crop.status === 'ready' && crop.source === 'uncertain' && (
              <Banner tone="info" title={r.cropUncertainTitle}><p>{r.cropUncertain}</p></Banner>
            )}
          </div>
          {crop.status === 'ready' && <CropActions onReset={onCropReset} onChange={onCropChange} helpId={cropHelpId} />}
        </div>
        <div className="card stack">
          <form onSubmit={submit} className="stack" noValidate>
            <fieldset className="fieldset">
              <legend>{r.panelCountLegend}</legend>
              {COUNT_CHOICES.map((c) => (
                <label key={String(c.value)} className="choice">
                  <input type="radio" name="panel-count" value={String(c.value)} checked={options.panelCount === c.value}
                    onChange={() => onOptionsChange(withCount(c.value))} />
                  {r.panelCounts[c.key]}
                </label>
              ))}
            </fieldset>
            {options.panelCount !== 'auto' && (
              <details className="details">
                <summary>{r.layoutSummary}</summary>
                <p className="text-secondary">{options.panelCount === 'grid' ? r.gridLayoutHint : r.layoutHint}</p>
                {options.sides.map((side, i) => (
                  <fieldset key={i} className="fieldset fieldset--inline">
                    <legend>{options.panelCount === 'grid' ? r.gridPanelLegend(i) : r.panelLegend(i + 1)}</legend>
                    <label className="field">
                      <span className="field__label">{r.sideLabel}</span>
                      <select value={side} onChange={(e) => setPanel(i, 'sides', e.target.value)}>
                        <option value="unknown">{r.unknownOption}</option>
                        <option value="R">{r.right}</option>
                        <option value="L">{r.left}</option>
                      </select>
                    </label>
                    <label className="field">
                      <span className="field__label">{r.viewLabel}</span>
                      <select value={options.views[i]} onChange={(e) => setPanel(i, 'views', e.target.value)}>
                        <option value="unknown">{r.unknownOption}</option>
                        <option value="CC">{r.cc}</option>
                        <option value="MLO">{r.mlo}</option>
                      </select>
                    </label>
                  </fieldset>
                ))}
              </details>
            )}
            {blocked && (
              <Banner tone="info">
                <p id={reasonId}>
                  {blocked} {!configured && <a href={ROUTES.settings}>{r.goToSettings}</a>}
                </p>
              </Banner>
            )}
            <div className="actions">
              <button type="submit" className="button button--primary button--block" aria-disabled={blocked !== null || busy}
                aria-describedby={blocked ? reasonId : undefined}>
                {r.analyze}
              </button>
            </div>
          </form>
          <section aria-labelledby="change-title" className="stack stack--tight divider-top">
            <h2 id="change-title" className="heading-sm">{r.wrongImage}</h2>
            <ImagePicker onPick={onPick} variant="compact" />
          </section>
        </div>
      </div>
    </>
  );
}
