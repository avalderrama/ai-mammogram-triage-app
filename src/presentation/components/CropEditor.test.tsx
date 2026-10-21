import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CropBox } from '../../domain/crop';
import { I18nProvider } from '../i18n/I18nProvider';
import { CropEditor } from './CropEditor';

const BOX: CropBox = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
const FRAME = { left: 0, top: 0, width: 200, height: 400, right: 200, bottom: 400, x: 0, y: 0, toJSON: () => ({}) };

function renderEditor(onChange = vi.fn()) {
  render(
    <I18nProvider initialLocale="en">
      <p id="help">help</p>
      <CropEditor imageUrl="blob:photo" alt="Photo" box={BOX} onChange={onChange} helpId="help" />
    </I18nProvider>,
  );
  return onChange;
}

const corner = (name: string) => screen.getByRole('button', { name: `${name} corner of the area to analyze` });
const last = (onChange: ReturnType<typeof vi.fn>) => onChange.mock.calls.at(-1)![0] as CropBox;
const pointer = (pointerId: number, clientX: number, clientY: number, extra = {}) =>
  ({ pointerId, clientX, clientY, isPrimary: true, button: 0, ...extra });

describe('CropEditor', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(FRAME as DOMRect);
  });
  afterEach(() => vi.restoreAllMocks());

  it('drags a corner by the pointer movement, relative to the image size, without selecting it', () => {
    const onChange = renderEditor();
    const handle = corner('Bottom right');
    fireEvent.pointerDown(handle, pointer(1, 180, 360));
    fireEvent.pointerMove(handle, pointer(1, 160, 320));
    expect(last(onChange).width).toBeCloseTo(0.7, 6);
    expect(last(onChange).height).toBeCloseTo(0.7, 6);
    fireEvent.pointerUp(handle, pointer(1, 160, 320));
    fireEvent.click(handle, { detail: 1 }); // the click a mouse sends after the drag
    expect(handle).toHaveAttribute('aria-pressed', 'false');
  });

  it('places a tapped corner with a tap on the image (no dragging needed)', () => {
    const onChange = renderEditor();
    const handle = corner('Top left');
    fireEvent.pointerDown(handle, pointer(1, 20, 40));
    fireEvent.pointerUp(handle, pointer(1, 20, 40));
    fireEvent.click(handle, { detail: 1 });
    expect(handle).toHaveAttribute('aria-pressed', 'true');
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByAltText('Photo'), { clientX: 40, clientY: 80 });
    expect(last(onChange).x).toBeCloseTo(0.2, 6);
    expect(last(onChange).y).toBeCloseTo(0.2, 6);
    expect(last(onChange).x + last(onChange).width).toBeCloseTo(0.9, 6);
    expect(handle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText(/Area to analyze: from 20% to 90% of the width/)).toBeInTheDocument();
  });

  it('ignores a second finger and a secondary button, and stops on pointercancel', () => {
    const onChange = renderEditor();
    const first = corner('Top left');
    const second = corner('Bottom right');
    fireEvent.pointerDown(second, pointer(2, 0, 0, { button: 2 }));
    fireEvent.pointerDown(first, pointer(1, 20, 40));
    fireEvent.pointerDown(second, pointer(3, 180, 360, { isPrimary: false }));
    fireEvent.pointerMove(second, pointer(3, 100, 100));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.pointerCancel(first, pointer(1, 20, 40));
    fireEvent.pointerMove(first, pointer(1, 60, 60));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('moves the focused corner with the arrow keys, in larger steps with Shift', () => {
    const onChange = renderEditor();
    fireEvent.keyDown(corner('Top right'), { key: 'ArrowUp' });
    expect(last(onChange).y).toBeCloseTo(0.09, 6);
    fireEvent.keyDown(corner('Top right'), { key: 'ArrowRight', shiftKey: true });
    expect(last(onChange).width).toBeCloseTo(0.85, 6);
    fireEvent.keyDown(corner('Top right'), { key: 'Tab' });
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('moves each edge in or out with buttons, for screen readers on phones', () => {
    const onChange = renderEditor();
    const left = screen.getByRole('group', { name: 'Left edge' });
    fireEvent.click(left.querySelector('button')!); // Move in
    expect(last(onChange).x).toBeCloseTo(0.12, 6);
    const bottom = screen.getByRole('group', { name: 'Bottom edge' });
    fireEvent.click(bottom.querySelectorAll('button')[1]!); // Move out
    expect(last(onChange).height).toBeCloseTo(0.82, 6);
  });
});

describe('CropEditor after a touch drag', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(FRAME as DOMRect);
  });
  afterEach(() => vi.restoreAllMocks());

  it('still selects a corner with Enter (a keyboard click) right after a touch drag that sent no click', () => {
    renderEditor();
    const handle = corner('Top left');
    fireEvent.pointerDown(handle, pointer(1, 20, 40));
    fireEvent.pointerMove(handle, pointer(1, 60, 80));
    fireEvent.pointerUp(handle, pointer(1, 60, 80)); // touch: no click follows
    fireEvent.click(handle, { detail: 0 }); // Enter or Space
    expect(handle).toHaveAttribute('aria-pressed', 'true');
  });
});
