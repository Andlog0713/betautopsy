import { describe, expect, it } from 'vitest';
import { buildReportSummary } from '@/lib/report-summary';

describe('buildReportSummary', () => {
  it('keeps card fields and omits heavy report detail', () => {
    const summary = buildReportSummary({
      summary: { total_bets: 200, roi_percent: -15.82 },
      emotion_score: 42,
      biases_detected: [
        { bias_name: 'Loss chasing', severity: 'high', evidence: 'large detail' },
        { bias_name: 'Parlay concentration', severity: 'medium', evidence: 'large detail' },
      ],
      bet_annotations: Array.from({ length: 200 }, (_, index) => ({ index })),
      session_detection: { sessions: Array.from({ length: 50 }, (_, index) => ({ index })) },
      strategic_leaks: [{ description: 'large detail' }],
    });

    expect(summary).toEqual({
      summary: { total_bets: 200, roi_percent: -15.82 },
      emotion_score: 42,
      card_biases: [
        { bias_name: 'Loss chasing', severity: 'high' },
        { bias_name: 'Parlay concentration', severity: 'medium' },
      ],
    });
    expect(JSON.stringify(summary)).not.toContain('bet_annotations');
    expect(JSON.stringify(summary)).not.toContain('session_detection');
    expect(JSON.stringify(summary)).not.toContain('strategic_leaks');
  });

  it('returns an empty object for invalid report payloads', () => {
    expect(buildReportSummary(null)).toEqual({});
    expect(buildReportSummary('invalid')).toEqual({});
  });
});
