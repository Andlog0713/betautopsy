import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/supabase-from-request';
import type { JournalEntryInput } from '@/types';

export async function POST(request: Request) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedClient(request);
    if (authError || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: JournalEntryInput = await request.json();

    if (!body.confidence || body.confidence < 1 || body.confidence > 5) {
      return NextResponse.json({ error: 'Confidence must be 1-5' }, { status: 400 });
    }
    const validStates = ['calm', 'excited', 'frustrated', 'anxious', 'bored', 'confident'];
    if (!validStates.includes(body.emotional_state)) {
      return NextResponse.json({ error: 'Invalid emotional state' }, { status: 400 });
    }
    const validTimes = ['none', 'under_5', '5_to_15', '15_to_30', 'over_30'];
    if (!validTimes.includes(body.research_time)) {
      return NextResponse.json({ error: 'Invalid research time' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('bet_journal_entries')
      .insert({
        user_id: user.id,
        confidence: body.confidence,
        emotional_state: body.emotional_state,
        research_time: body.research_time,
        had_alcohol: body.had_alcohol ?? false,
        time_pressure: body.time_pressure ?? false,
        chasing_losses: body.chasing_losses ?? false,
        notes: body.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Journal save error:', error);
      return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 });
    }

    return NextResponse.json({ entry: data });
  } catch (err) {
    console.error('Journal API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { supabase, user, error: authError } = await getAuthenticatedClient(request);
    if (authError || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
    const countOnly = url.searchParams.get('count') === 'true';

    if (countOnly) {
      const { count } = await supabase
        .from('bet_journal_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      return NextResponse.json({ count: count ?? 0 });
    }

    const { data, error } = await supabase
      .from('bet_journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
    }

    return NextResponse.json({ entries: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
