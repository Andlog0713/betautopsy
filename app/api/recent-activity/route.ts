import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { logErrorServer } from '@/lib/log-error-server';

// Recent-activity ticker for /go. Queries the last hour of autopsy
// reports, returns anonymized activity strings for the landing-page
// social proof indicator. No user_id, email, or any PII leaves this
// endpoint. Bet counts are rounded to reduce fingerprinting.
//
// Cached at the edge for 15s so a feed of 1000 concurrent /go viewers
// only hits Supabase once every 15 seconds.
export const dynamic = 'force-dynamic';
export const revalidate = 15;

type Activity = {
  kind: 'archetype' | 'grade' | 'bias' | 'report';
  text: string;
  minutes_ago: number;
};

function roundBetCount(n: number): number {
  if (n <= 100) return n;
  if (n <= 500) return Math.round(n / 10) * 10;
  if (n <= 1000) return Math.round(n / 25) * 25;
  return Math.round(n / 50) * 50;
}

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const sixtyMinAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: reports, error } = await supabase
      .from('autopsy_reports')
      .select('created_at, bet_count_analyzed, report_json')
      .gte('created_at', sixtyMinAgo)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error || !reports || reports.length === 0) {
      return NextResponse.json(
        { activities: [] },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
          },
        }
      );
    }

    const now = Date.now();
    const activities: Activity[] = [];

    for (const r of reports) {
      const minutesAgo = Math.max(
        0,
        Math.floor((now - new Date(r.created_at).getTime()) / 60000)
      );
      const json = (r.report_json ?? {}) as {
        summary?: { overall_grade?: string };
        betting_archetype?: { name?: string };
        biases_detected?: Array<{ name?: string; severity?: string }>;
      };
      const grade = json.summary?.overall_grade;
      const archetype = json.betting_archetype?.name;
      const topBias = json.biases_detected?.find((b) => b.name)?.name;
      const betCount = roundBetCount(r.bet_count_analyzed ?? 0);

      // Pick the most interesting fact for this report (in priority order).
      // Rotating kinds across reports gives ticker variety without
      // inventing data we don't have.
      if (archetype && betCount > 0) {
        activities.push({
          kind: 'archetype',
          text: `${archetype} detected in a ${betCount}-bet report`,
          minutes_ago: minutesAgo,
        });
      } else if (topBias && betCount > 0) {
        activities.push({
          kind: 'bias',
          text: `Top bias: ${topBias} in ${betCount} bets`,
          minutes_ago: minutesAgo,
        });
      } else if (grade) {
        activities.push({
          kind: 'grade',
          text: `Someone just got Grade ${grade}`,
          minutes_ago: minutesAgo,
        });
      } else if (betCount > 0) {
        activities.push({
          kind: 'report',
          text: `Someone just analyzed ${betCount} bets`,
          minutes_ago: minutesAgo,
        });
      }
    }

    return NextResponse.json(
      { activities },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    logErrorServer(error, { path: '/api/recent-activity' });
    return NextResponse.json({ activities: [] });
  }
}
