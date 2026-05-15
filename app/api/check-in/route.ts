import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/supabase-from-request';
import { scoreCheckIn, validateCheckInRequest } from '@/lib/check-in-scorer';

// Pure compute. Sub-second response. Reads from Supabase, no writes Phase 1.
// Wire format is locked by iOS PreBetCheckInModels.swift — do not rename
// fields. Phase 2 of the iOS prebet feature swaps its MockedPreBetScorer
// for this endpoint.

export async function POST(request: Request) {
  let authResult;
  try {
    authResult = await getAuthenticatedClient(request);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
  const { supabase, user, error: authError } = authResult;
  if (authError || !user || !supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validated = validateCheckInRequest(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const response = await scoreCheckIn(validated.value, user.id, supabase);
    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
