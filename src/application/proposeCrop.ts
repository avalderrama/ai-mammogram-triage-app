import { clampCrop, FULL_IMAGE } from '../domain/crop';
import { TriageError } from './errors';
import type { CropDetector, CropProposal } from './ports';

const WHOLE_IMAGE_TO_ADJUST: CropProposal = { box: FULL_IMAGE, source: 'uncertain' };

/**
 * Use case: propose the crop shown on the review screen. A detection failure never blocks the user: the whole image
 * is proposed and marked as uncertain, so the review screen asks to adjust it. An image too large to open on the
 * device (`too_many_pixels`) is the exception: it is reported, because no crop can fix it.
 */
export function createProposeCrop(detector: CropDetector) {
  return async function proposeCrop(file: Blob, signal?: AbortSignal): Promise<CropProposal> {
    try {
      const proposal = await detector.propose(file, signal);
      return { ...proposal, box: clampCrop(proposal.box) }; // a broken detector can never hand out a bad box
    } catch (error) {
      if (signal?.aborted || (error instanceof TriageError && error.kind === 'too_many_pixels')) throw error;
      return WHOLE_IMAGE_TO_ADJUST;
    }
  };
}

export type ProposeCrop = ReturnType<typeof createProposeCrop>;
