import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { Profile } from '@/types';
import FeedbackStream from './FeedbackStream';

export default async function AdminFeedbackPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile || !(profile as Profile).is_admin) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg-bright">Feedback Stream</h1>
        <p className="text-fg-muted text-sm mt-1">All user feedback, sorted by recency</p>
      </div>
      <FeedbackStream />
    </div>
  );
}
