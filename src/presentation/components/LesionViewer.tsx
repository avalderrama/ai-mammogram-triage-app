import { useId, useState } from 'react';
import type { ViewResult } from '../../domain/triage';
import { useI18n } from '../i18n/I18nProvider';

/**
 * The heatmap image with numbered boxes on the most suspicious areas (strongest = 1). Boxes are positioned in
 * percentages of the image, so they stay aligned at any size. The list below repeats each location in words for
 * screen readers and for anyone who hides the markers.
 */
export function LesionViewer({ view }: { view: ViewResult }) {
  const { t } = useI18n();
  const [showMarkers, setShowMarkers] = useState(true);
  const toggleId = useId();
  const name = t.result.viewName(view.side, view.panel, view.view);

  if (!view.heatmap) {
    const lowResolution = view.heatmapUnavailableReason?.startsWith('low_resolution') ?? false;
    return <p className="note">{t.result.heatmapUnavailable(name, lowResolution)}</p>;
  }
  return (
    <figure className="viewer">
      <div className="viewer__frame">
        <div className="viewer__canvas" style={{ aspectRatio: `${view.heatmap.width} / ${view.heatmap.height}` }}>
          <img src={view.heatmap.url} width={view.heatmap.width} height={view.heatmap.height} loading="lazy"
            alt={t.result.heatmapAlt(name)} />
          {showMarkers && view.regions.map((r, i) => (
            <span key={i} className="marker" aria-hidden="true"
              style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.width * 100}%`, height: `${r.height * 100}%` }}>
              <span className="marker__label">{i + 1}</span>
            </span>
          ))}
        </div>
      </div>
      <figcaption className="viewer__caption">
        <span className="viewer__name">{t.result.heatmapCaption(name)}</span>
        {view.regions.length > 0 && (
          <label className="switch" htmlFor={toggleId}>
            <input id={toggleId} type="checkbox" checked={showMarkers} onChange={(e) => setShowMarkers(e.target.checked)} />
            <span>{t.result.showMarkers}</span>
          </label>
        )}
      </figcaption>
      <div className="regions">
        <p className="regions__title">{t.result.regionsTitle}</p>
        {view.regions.length > 0 ? (
          <>
            <ol className="regions__list">
              {view.regions.map((r, i) => (
                <li key={i}><span className="regions__number" aria-hidden="true">{i + 1}</span>{t.result.region(i + 1, r.depth, r.vertical)}</li>
              ))}
            </ol>
            <p className="note">{t.result.regionsNote}</p>
          </>
        ) : <p className="note">{t.result.noRegions}</p>}
      </div>
    </figure>
  );
}
