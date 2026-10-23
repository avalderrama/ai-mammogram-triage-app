import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { FULL_IMAGE, moveCorner, moveEdge, type CropBox, type CropCorner, type CropEdge } from '../../domain/crop';
import { useI18n } from '../i18n/I18nProvider';

const CORNERS: readonly CropCorner[] = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
const EDGES: readonly CropEdge[] = ['top', 'right', 'bottom', 'left'];
const KEY_STEP = 0.01;
const KEY_STEP_LARGE = 0.05;
const BUTTON_STEP = 0.02;
// A press that moves less than this is a tap (it selects the corner), not a drag: fingers wobble a little.
const DRAG_THRESHOLD_PX = 8;
// The loupe shows the image under the finger, which covers the very corner being placed.
const LOUPE_PX = 96;
const LOUPE_ZOOM = 2.5;
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
};
/** Direction that moves each edge toward the center of the box (inward). */
const INWARD: Record<CropEdge, number> = { top: 1, right: -1, bottom: -1, left: 1 };

/** Position of a corner, normalized to the image. */
function cornerPoint(box: CropBox, corner: CropCorner): [number, number] {
  const x = corner.endsWith('left') ? box.x : box.x + box.width;
  const y = corner.startsWith('top') ? box.y : box.y + box.height;
  return [x, y];
}

interface Drag {
  pointerId: number; corner: CropCorner; startX: number; startY: number; startBox: CropBox; moved: boolean;
  /** Latest pointer position, applied once per animation frame. */
  lastX: number; lastY: number;
}

/** Where the loupe sits (away from the corner being dragged) and what part of the image it shows. */
function loupeStyle(imageUrl: string, point: [number, number], width: number, height: number) {
  const [x, y] = point;
  const radius = LOUPE_PX / 2;
  return {
    width: LOUPE_PX, height: LOUPE_PX,
    left: x < 0.5 ? width - LOUPE_PX - 8 : 8,
    top: y < 0.35 ? height - LOUPE_PX - 8 : 8,
    backgroundImage: `url("${imageUrl}")`,
    backgroundSize: `${width * LOUPE_ZOOM}px ${height * LOUPE_ZOOM}px`,
    backgroundPosition: `${radius - x * width * LOUPE_ZOOM}px ${radius - y * height * LOUPE_ZOOM}px`,
  };
}

interface Props {
  readonly imageUrl: string;
  readonly alt: string;
  readonly box: CropBox;
  readonly onChange: (box: CropBox) => void;
  /** Id of the help text that explains how to move the corners. */
  readonly helpId: string;
}

/**
 * The picked image with the crop box over it: what is outside is dimmed. Each corner can be dragged, moved with the
 * arrow keys, or tapped and then placed with a tap on the image (single-pointer alternative to dragging,
 * UX-ACC-016). Buttons that move each edge serve screen readers on phones. The box is kept normalized, so it does
 * not depend on the size the image is drawn at.
 */
export function CropEditor({ imageUrl, alt, box, onChange, helpId }: Props) {
  const { t } = useI18n();
  const r = t.review;
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const draggedLast = useRef(false);
  const [selected, setSelected] = useState<CropCorner | null>(null);
  const [announcement, setAnnouncement] = useState('');
  // The corner under the finger: highlighted from the very first touch, with the loupe while it is held.
  const [held, setHeld] = useState<{ corner: CropCorner; width: number; height: number } | null>(null);
  const frameRequest = useRef<number | null>(null);
  useEffect(() => () => { if (frameRequest.current !== null) cancelAnimationFrame(frameRequest.current); }, []);

  const size = () => {
    const rect = frame.current!.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width || 1, height: rect.height || 1 };
  };
  const change = (next: CropBox, announce: boolean) => {
    onChange(next);
    if (announce) setAnnouncement(r.cropArea(next));
  };

  const startDrag = (corner: CropCorner) => (event: PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0 || drag.current) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    draggedLast.current = false;
    drag.current = { pointerId: event.pointerId, corner, startX: event.clientX, startY: event.clientY, startBox: box,
      moved: false, lastX: event.clientX, lastY: event.clientY };
    const { width, height } = size();
    setHeld({ corner, width, height });
  };
  // The box follows the finger 1:1 from where it was grabbed; pointer events can outpace the screen, so the latest
  // position is applied once per frame instead of re-rendering on every event.
  const applyDrag = () => {
    frameRequest.current = null;
    const current = drag.current;
    if (!current?.moved) return;
    const { width, height } = size();
    change(moveCorner(current.startBox, current.corner, (current.lastX - current.startX) / width,
      (current.lastY - current.startY) / height), false);
  };
  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    current.lastX = event.clientX;
    current.lastY = event.clientY;
    if (Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > DRAG_THRESHOLD_PX) current.moved = true;
    if (current.moved && frameRequest.current === null) frameRequest.current = requestAnimationFrame(applyDrag);
  };
  const endDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    if (frameRequest.current !== null) {
      cancelAnimationFrame(frameRequest.current);
      applyDrag(); // the last movement is never dropped
    }
    draggedLast.current = drag.current.moved;
    drag.current = null;
    setHeld(null);
  };

  // A click (tap, Enter or Space) on a corner selects it, to place it with a tap on the image. A mouse drag also ends
  // with a click: that one is ignored. Keyboard clicks (detail 0) always count, even right after a touch drag, which
  // sends no click at all.
  const toggleCorner = (corner: CropCorner) => (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0 && draggedLast.current) {
      draggedLast.current = false;
      return;
    }
    setSelected((s) => (s === corner ? null : corner));
  };
  const placeSelected = (event: MouseEvent<HTMLDivElement>) => {
    if (!selected || (event.target as HTMLElement).closest('button')) return;
    const { left, top, width, height } = size();
    const [cx, cy] = cornerPoint(box, selected);
    change(moveCorner(box, selected, (event.clientX - left) / width - cx, (event.clientY - top) / height - cy), true);
    setSelected(null);
  };

  const nudge = (corner: CropCorner) => (event: KeyboardEvent<HTMLButtonElement>) => {
    const arrow = ARROWS[event.key];
    if (!arrow) return;
    event.preventDefault();
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    change(moveCorner(box, corner, arrow[0] * step, arrow[1] * step), true);
  };
  const moveEdgeBy = (edge: CropEdge, inward: boolean) => () => {
    change(moveEdge(box, edge, INWARD[edge] * (inward ? BUTTON_STEP : -BUTTON_STEP)), true);
  };

  const percent = (value: number) => `${(value * 100).toFixed(2)}%`;
  return (
    <div className="stack stack--tight">
      <div className="cropper">
        {/* The click ends a tap on the image (the tap-then-tap alternative to dragging); the corners and the edge
            buttons are the keyboard-operable controls. */}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div ref={frame} className={`cropper__frame${selected ? ' cropper__frame--placing' : ''}`} onClick={placeSelected}>
          <img src={imageUrl} alt={alt} draggable={false} />
          <div className="cropper__clip" aria-hidden="true">
            <div className="cropper__box"
              style={{ left: percent(box.x), top: percent(box.y), width: percent(box.width), height: percent(box.height) }} />
          </div>
          {held && (
            <div className="cropper__loupe" aria-hidden="true"
              style={loupeStyle(imageUrl, cornerPoint(box, held.corner), held.width, held.height)} />
          )}
          {CORNERS.map((corner) => {
            const [x, y] = cornerPoint(box, corner);
            return (
              <button key={corner} type="button"
                className={`cropper__handle${held?.corner === corner ? ' cropper__handle--held' : ''}`}
                style={{ left: percent(x), top: percent(y) }}
                aria-label={r.cropCorner(corner)} aria-pressed={selected === corner} aria-describedby={helpId}
                onPointerDown={startDrag(corner)} onPointerMove={moveDrag} onPointerUp={endDrag}
                onPointerCancel={endDrag} onLostPointerCapture={endDrag} onClick={toggleCorner(corner)}
                onKeyDown={nudge(corner)} />
            );
          })}
        </div>
      </div>
      <p className="visually-hidden" aria-live="polite">{announcement}</p>
      <details className="details">
        <summary>{r.cropEdgesSummary}</summary>
        <div className="crop-edges">
          {EDGES.map((edge) => (
            <fieldset key={edge} className="fieldset fieldset--inline">
              <legend>{r.cropEdge(edge)}</legend>
              <button type="button" className="button button--secondary" onClick={moveEdgeBy(edge, true)}>
                {r.cropInward}
              </button>
              <button type="button" className="button button--secondary" onClick={moveEdgeBy(edge, false)}>
                {r.cropOutward}
              </button>
            </fieldset>
          ))}
        </div>
      </details>
    </div>
  );
}

/** Help text the corners refer to, with the reset and whole-image actions. */
export function CropActions({ onReset, onChange, helpId }:
  { onReset: () => void; onChange: (box: CropBox) => void; helpId: string }) {
  const { t } = useI18n();
  const r = t.review;
  return (
    <div className="stack stack--tight">
      <p id={helpId} className="field__hint">{r.cropHelp}</p>
      <div className="actions">
        <button type="button" className="button button--secondary" onClick={onReset}>{r.cropReset}</button>
        <button type="button" className="button button--secondary" onClick={() => onChange(FULL_IMAGE)}>
          {r.cropFull}
        </button>
      </div>
    </div>
  );
}
