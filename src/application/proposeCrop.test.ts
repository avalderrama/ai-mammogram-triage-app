import { describe, expect, it } from 'vitest';
import { FULL_IMAGE } from '../domain/crop';
import { TriageError } from './errors';
import { createProposeCrop } from './proposeCrop';

const file = new Blob(['x'], { type: 'image/jpeg' });

describe('proposeCrop', () => {
  it('returns the detector proposal', async () => {
    const proposal = { box: { x: 0.1, y: 0, width: 0.8, height: 0.9 }, source: 'detected' as const };
    expect(await createProposeCrop({ propose: async () => proposal })(file)).toEqual(proposal);
  });

  it('proposes the whole image as uncertain when detection fails', async () => {
    const failing = createProposeCrop({ propose: async () => { throw new Error('decode failed'); } });
    expect(await failing(file)).toEqual({ box: FULL_IMAGE, source: 'uncertain' });
  });

  it('lets a cancellation through', async () => {
    const controller = new AbortController();
    controller.abort();
    const failing = createProposeCrop({ propose: async () => { throw new DOMException('aborted', 'AbortError'); } });
    await expect(failing(file, controller.signal)).rejects.toThrow('aborted');
  });
});

describe('proposeCrop with a broken detector', () => {
  it('keeps the proposed box inside the image', async () => {
    const broken = createProposeCrop({ propose: async () => ({ box: { x: -0.5, y: 0.2, width: 2, height: 0.5 }, source: 'detected' }) });
    expect((await broken(file)).box).toEqual({ x: 0, y: 0.2, width: 1, height: 0.5 });
  });
});

describe('proposeCrop with an image too large to open', () => {
  it('reports it instead of proposing the whole image', async () => {
    const huge = createProposeCrop({ propose: async () => { throw new TriageError('too_many_pixels'); } });
    await expect(huge(file)).rejects.toMatchObject({ kind: 'too_many_pixels' });
  });
});
