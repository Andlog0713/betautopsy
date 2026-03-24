import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { Bet } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: bets } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', user.id)
      .order('placed_at', { ascending: true });

    const rows = (bets ?? []) as Bet[];

    const header = 'date,sport,league,bet_type,description,odds,stake,result,profit,sportsbook,is_bonus_bet';
    const csvRows = rows.map((b) => {
      const date = new Date(b.placed_at).toISOString().split('T')[0];
      const desc = `"${(b.description || '').replace(/"/g, '""')}"`;
      return [
        date,
        b.sport,
        b.league ?? '',
        b.bet_type,
        desc,
        b.odds > 0 ? `+${b.odds}` : b.odds,
        Number(b.stake).toFixed(2),
        b.result,
        Number(b.profit).toFixed(2),
        b.sportsbook ?? '',
        b.is_bonus_bet ? 'true' : 'false',
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
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
