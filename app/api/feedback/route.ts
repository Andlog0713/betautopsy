import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, rating, message, report_id, page } = await request.json();

    if (!type || !['report_reaction', 'bug', 'feature_request', 'general'].includes(type)) {
      return NextResponse.json({ error: 'Invalid feedback type' }, { status: 400 });
    }

    // Get profile metadata
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, bet_count')
      .eq('id', user.id)
      .single();

    await supabase.from('feedback').insert({
      user_id: user.id,
      type,
      rating: rating || null,
      message: message?.slice(0, 2000) || null,
      report_id: report_id || null,
      page: page || null,
      metadata: {
        tier: profile?.subscription_tier,
        bet_count: profile?.bet_count,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}
