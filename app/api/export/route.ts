import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/supabase-from-request';
import type { Bet } from '@/types';
import { logErrorServer } from '@/lib/log-error-server';

export const dynamic = 'force-dynamic';

// Neutralize CSV formula injection: a cell whose value begins with = + - @
// (or a leading tab / CR, which spreadsheets strip before parsing) can execute
// as a formula when the export is opened in Excel/Sheets. Prefix those with a
// single quote, then always wrap + escape quotes so the value round-trips.
function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  const guarded = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedClient(request);

    if (authError || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Paginate to defeat the PostgREST default row cap (mirrors the analyze
    // route). A single select('*') silently truncated exports at 1,000 bets.
    const rows: Bet[] = [];
    const FETCH_PAGE = 1000;
    let fetchStart = 0;
    while (true) {
      const { data: page, error } = await supabase
        .from('bets')
        .select('*')
        .eq('user_id', user.id)
        .order('placed_at', { ascending: true })
        .range(fetchStart, fetchStart + FETCH_PAGE - 1);
      if (error) {
        await logErrorServer(error, { path: '/api/export', userId: user.id });
        return NextResponse.json({ error: 'Export failed' }, { status: 500 });
      }
      if (!page || page.length === 0) break;
      rows.push(...(page as Bet[]));
      if (page.length < FETCH_PAGE) break;
      fetchStart += FETCH_PAGE;
    }

    const header = 'date,sport,league,bet_type,description,odds,stake,result,profit,sportsbook,is_bonus_bet';
    const csvRows = rows.map((b) => {
      const date = new Date(b.placed_at).toISOString().split('T')[0];
      return [
        csvCell(date),
        csvCell(b.sport),
        csvCell(b.league ?? ''),
        csvCell(b.bet_type),
        csvCell(b.description || ''),
        csvCell(b.odds > 0 ? `+${b.odds}` : b.odds),
        csvCell(Number(b.stake).toFixed(2)),
        csvCell(b.result),
        csvCell(Number(b.profit).toFixed(2)),
        csvCell(b.sportsbook ?? ''),
        csvCell(b.is_bonus_bet ? 'true' : 'false'),
      ].join(',');
    });

    const csv = [header, ...csvRows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="betautopsy-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    logErrorServer(error, { path: '/api/export' });
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
