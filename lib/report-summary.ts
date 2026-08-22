import type { AutopsyAnalysis, ReportCardBias, SeverityTier } from '@/types';

// Keep report-index payloads deliberately small. Detail readers fetch the
// complete report_json from /api/reports/:id only when a report is opened.
export const REPORT_SUMMARY_KEYS = [
  'betting_archetype',
  'betiq',
  'summary',
  'summaryCounts',
  'discipline_score',
  'emotion_score',
  'emotion_percentile',
  'tilt_score',
  'bankroll_health',
  'schema_version',
  '_snapshot_counts',
  '_snapshot_teaser',
] as const satisfies readonly (keyof AutopsyAnalysis)[];

export type ReportSummaryJson = Partial<
  Pick<AutopsyAnalysis, (typeof REPORT_SUMMARY_KEYS)[number]>
> & { card_biases?: ReportCardBias[] };

export function buildReportSummary(report: unknown): ReportSummaryJson {
  if (!report || typeof report !== 'object') return {};

  const source = report as Record<string, unknown>;
  const summary: Record<string, unknown> = {};
  for (const key of REPORT_SUMMARY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      summary[key] = source[key];
    }
  }

  if (Array.isArray(source.biases_detected)) {
    const cardBiases = source.biases_detected
      .filter((bias): bias is Record<string, unknown> => !!bias && typeof bias === 'object')
      .filter((bias) => typeof bias.bias_name === 'string' && typeof bias.severity === 'string')
      .slice(0, 3)
      .map((bias) => ({
        bias_name: bias.bias_name as string,
        severity: bias.severity as SeverityTier,
      }));
    if (cardBiases.length > 0) summary.card_biases = cardBiases;
  }

  return summary as ReportSummaryJson;
}
