import { useId, useState } from 'react';
import type { ViewResult } from '../../domain/triage';
import { useI18n } from '../i18n/I18nProvider';

/**
 * The processed breast with the heatmap's red areas over it and numbered boxes on the most suspicious areas
 * (strongest = 1). Each can be hidden on its own: without the red areas the tissue they cover shows, and the boxes,
 * which are only outlines, still say where to look.
 * Boxes are positioned in percentages of the image, so they stay aligned at any size. The list below repeats each
 * location in words for screen readers and for anyone who hides the markers.
 */
export function LesionViewer({ view }: { view: ViewResult }) {
  const { t } = useI18n();
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const heatmapToggleId = useId();
  const markersToggleId = useId();
  const name = t.result.viewName(view.side, view.panel, view.view);

  if (!view.heatmap) {
    const lowResolution = view.heatmapUnavailableReason?.startsWith('low_resolution') ?? false;
    return <p className="note">{t.result.heatmapUnavailable(name, lowResolution)}</p>;
  }
  // An older server draws the red areas into the image itself: then only the boxes can be hidden.
  const overlay = view.heatmapOverlay;
  const redShown = !overlay || showHeatmap;
  return (
    <figure className="viewer">
      <div className="viewer__frame">
        <div className="viewer__canvas" style={{ aspectRatio: `${view.heatmap.width} / ${view.heatmap.height}` }}>
          <img src={view.heatmap.url} width={view.heatmap.width} height={view.heatmap.height} loading="lazy"
            alt={redShown ? t.result.heatmapAlt(name) : t.result.breastAlt(name)} />
          {overlay && showHeatmap && (
            <img className="viewer__overlay" src={overlay.url} width={overlay.width} height={overlay.height} alt="" />
          )}
          {showMarkers && view.regions.map((r, i) => (
            <span key={i} className="marker" aria-hidden="true"
              style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.width * 100}%`, height: `${r.height * 100}%` }}>
              <span className="marker__label">{i + 1}</span>
            </span>
          ))}
        </div>
      </div>
      <figcaption className="viewer__caption">
        <span className="viewer__name">{redShown ? t.result.heatmapCaption(name) : t.result.cleanCaption(name)}</span>
        <fieldset className="viewer__switches">
          <legend className="visually-hidden">{t.result.viewerLayers}</legend>
          {overlay && (
            <label className="switch" htmlFor={heatmapToggleId}>
              <input id={heatmapToggleId} type="checkbox" checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)} />
              <span>{t.result.showHeatmap}</span>
            </label>
          )}
          {view.regions.length > 0 && (
            <label className="switch" htmlFor={markersToggleId}>
              <input id={markersToggleId} type="checkbox" checked={showMarkers}
                onChange={(e) => setShowMarkers(e.target.checked)} />
              <span>{t.result.showMarkers}</span>
            </label>
          )}
        </fieldset>
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
