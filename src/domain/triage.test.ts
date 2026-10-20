import { describe, expect, it } from 'vitest';
import { analysis, breast } from '../test/fixtures';
import { breastsByUrgency, isPartial, severity, studyQualityIssues } from './triage';

describe('triage rules', () => {
  it('orders levels by severity', () => {
    expect(severity('high_priority')).toBeGreaterThan(severity('review'));
    expect(severity('review')).toBeGreaterThan(severity('no_suspicious_findings'));
  });

  it('lists the most urgent breast first, right before left on ties', () => {
    const a = analysis({ breasts: [
      breast({ label: 'L', side: 'L', level: 'review' }),
      breast({ label: 'R', side: 'R', level: 'no_suspicious_findings' }),
      breast({ label: 'L2', side: 'L', level: 'high_priority' }),
      breast({ label: 'R2', side: 'R', level: 'high_priority' }),
    ] });
    expect(breastsByUrgency(a).map((b) => b.label)).toEqual(['R2', 'L2', 'L', 'R']);
  });

  it('is partial when panels were rejected or only the global model ran', () => {
    expect(isPartial(analysis())).toBe(false);
    expect(isPartial(analysis({ rejectedPanels: [{ panel: 2, mammogramConfidence: 0.1 }] }))).toBe(true);
    expect(isPartial(analysis({ breasts: [breast({ scoringMode: 'global_only' })] }))).toBe(true);
  });

  it('collects distinct quality issues in a stable order', () => {
    const a = analysis({ breasts: [breast({ qualityIssues: ['glare', 'blurry'] }), breast({ qualityIssues: ['blurry'] })] });
    expect(studyQualityIssues(a)).toEqual(['blurry', 'glare']);
  });
});
