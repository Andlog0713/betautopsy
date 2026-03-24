'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import type { Profile } from '@/types';

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [betCount, setBetCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [bankroll, setBankroll] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [bankrollSaving, setBankrollSaving] = useState(false);
  const [bankrollSaved, setBankrollSaved] = useState(false);
  const [bankrollExpanded, setBankrollExpanded] = useState(false);

  // Danger zone
  const [showClearBets, setShowClearBets] = useState(false);
  const [clearConfirm, setClearConfirm] = useState('');
  const [clearing, setClearing] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, betsRes, reportsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('bets').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('autopsy_reports').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      if (profileRes.data) {
        const p = profileRes.data as Profile;
        setProfile(p);
        setDisplayName(p.display_name ?? '');
        if (p.bankroll) setBankroll(p.bankroll.toString());
      }
      setBetCount(betsRes.count ?? 0);
      setReportCount(reportsRes.count ?? 0);
      setLoading(false);
    }
    load();
  }, []);

  async function saveProfile() {
    if (!profile) return;
    setProfileSaving(true);
    const supabase = createClient();
    await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', profile.id);
    setProfileSaving(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  }

  async function saveBankroll() {
    if (!profile) return;
    setBankrollSaving(true);
    const supabase = createClient();
    const value = parseFloat(bankroll);
    await supabase
      .from('profiles')
      .update({ bankroll: isNaN(value) ? null : value })
      .eq('id', profile.id);
    setBankrollSaving(false);
    setBankrollSaved(true);
    setTimeout(() => setBankrollSaved(false), 2000);
  }

  async function handleClearBets() {
    if (!profile) return;
    setClearing(true);
    const supabase = createClient();
    await supabase.from('bets').delete().eq('user_id', profile.id);
    await supabase.from('profiles').update({ bet_count: 0 }).eq('id', profile.id);
    setBetCount(0);
    setClearing(false);
    setShowClearBets(false);
    setClearConfirm('');
  }

  async function handlePasswordReset() {
    if (!profile?.email) return;
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(profile.email);
    setPasswordResetSent(true);
    setTimeout(() => setPasswordResetSent(false), 5000);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  async function handleDeleteAccount() {
    if (!profile) return;
    setDeleting(true);
    const supabase = createClient();
    // Delete all user data (cascade handles bets + reports)
    await supabase.from('profiles').delete().eq('id', profile.id);
    await supabase.auth.signOut();
    router.push('/');
  }

  async function handleManageSubscription() {
    const res = await fetch('/api/billing', { method: 'POST' });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-32 bg-ink-800 rounded" />
        <div className="h-40 bg-ink-800 rounded-xl" />
        <div className="h-40 bg-ink-800 rounded-xl" />
      </div>
    );
  }

  const tier = profile?.subscription_tier ?? 'free';
  const isPaid = tier === 'pro' || tier === 'sharp';

  const tierBadge: Record<string, string> = {
    free: 'bg-ink-700/50 text-ink-500',
    pro: 'bg-flame-500/10 text-flame-500',
    sharp: 'bg-mint-500/10 text-mint-500',
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <h1 className="font-serif text-3xl">Settings</h1>

      {/* ── Profile ── */}
      <div className="card p-6 space-y-4">
        <h2 className="font-serif text-xl">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input-field w-full"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={profile?.email ?? ''}
              disabled
              className="input-field w-full opacity-50 cursor-not-allowed"
            />
          </div>
          <button
            onClick={saveProfile}
            disabled={profileSaving}
            className="btn-primary text-sm"
          >
            {profileSaved ? '✓ Saved' : profileSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      {/* ── Bankroll ── */}
      <div className="card p-6 space-y-4">
        <h2 className="font-serif text-xl">Bankroll</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1 max-w-xs">
            <label className="label">Total Bankroll</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-600">$</span>
              <input
                type="number"
                value={bankroll}
                onChange={(e) => setBankroll(e.target.value)}
                className="input-field w-full pl-7 font-mono"
                placeholder="5,000"
                min="0"
                step="100"
              />
            </div>
          </div>
          <button
            onClick={saveBankroll}
            disabled={bankrollSaving}
            className="btn-primary text-sm"
          >
            {bankrollSaved ? '✓ Saved' : bankrollSaving ? '...' : 'Save'}
          </button>
        </div>
        <p className="text-ink-700 text-xs">
          This helps us assess your risk level. We never share this.
        </p>

        <button
          onClick={() => setBankrollExpanded(!bankrollExpanded)}
          className="text-sm text-ink-600 hover:text-[#e7e6e1] transition-colors flex items-center gap-1"
        >
          <span className="text-xs">{bankrollExpanded ? '▾' : '▸'}</span>
          What&apos;s a bankroll?
        </button>
        {bankrollExpanded && (
          <div className="bg-ink-900/50 rounded-lg p-4 text-sm text-ink-600 space-y-3">
            <p>
              Your bankroll is the total amount of money you&apos;ve set aside
              specifically for betting — across all your sportsbooks combined.
              It&apos;s not your savings account or your rent money. It&apos;s the
              dedicated pool you bet from.
            </p>
            <p>It&apos;s okay to estimate — a rough number is better than nothing.</p>
            <p>
              <span className="text-[#e7e6e1]">Why this matters:</span>{' '}
              BetAutopsy uses your bankroll to assess whether your bet sizing
              is sustainable. A $200 bet means something very different if your
              bankroll is $1,000 versus $20,000. Without this number, we have
              to estimate — and we&apos;d rather be accurate.
            </p>
            <p>Make sure to update this once in a while so your analysis stays accurate.</p>
          </div>
        )}
      </div>

      {/* ── Subscription ── */}
      <div className="card p-6 space-y-4">
        <h2 className="font-serif text-xl">Subscription</h2>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium px-3 py-1 rounded-full capitalize ${tierBadge[tier]}`}>
            {tier}
          </span>
          {profile?.subscription_status && profile.subscription_status !== 'inactive' && (
            <span className={`text-xs ${
              profile.subscription_status === 'active' ? 'text-mint-500' :
              profile.subscription_status === 'past_due' ? 'text-amber-400' : 'text-ink-600'
            }`}>
              {profile.subscription_status === 'active' ? 'Active' :
               profile.subscription_status === 'past_due' ? 'Past Due' :
               profile.subscription_status}
            </span>
          )}
        </div>
        {isPaid ? (
          profile?.stripe_customer_id ? (
            <button onClick={handleManageSubscription} className="btn-secondary text-sm">
              Manage Subscription
            </button>
          ) : (
            <p className="text-ink-600 text-sm">
              Your subscription is managed manually. Contact support to make changes.
            </p>
          )
        ) : (
          <div className="space-y-3">
            <p className="text-[#e7e6e1] text-sm">You ran your free autopsy. Here&apos;s what Pro unlocks:</p>
            <ul className="text-ink-600 text-sm space-y-1">
              <li>— Unlimited reports as you add bets weekly</li>
              <li>— Progress tracking that shows whether your habits are actually improving</li>
              <li>— Full analysis across ALL your bets, not just the last 50</li>
              <li>— Weekly check-ins so you don&apos;t have to remember to log in</li>
            </ul>
            <p className="text-ink-600 text-xs">Most users make back the subscription cost from the first leak they plug.</p>
            <a href="/pricing" className="btn-primary inline-block text-sm">Go Pro</a>
          </div>
        )}
      </div>

      {/* ── Data ── */}
      <div className="card p-6 space-y-4">
        <h2 className="font-serif text-xl">Data</h2>
        <div className="flex gap-4 text-sm text-ink-600">
          <span><span className="font-mono text-[#e7e6e1]">{betCount}</span> bets</span>
          <span><span className="font-mono text-[#e7e6e1]">{reportCount}</span> reports</span>
        </div>

        <div className="flex flex-wrap gap-3">
          <a href="/api/export" className="btn-secondary text-sm">
            Export All Bets as CSV
          </a>
        </div>

        {/* Clear all bets */}
        {isPaid && betCount > 0 && (
          <div className="pt-3 border-t border-ink-700/20">
            {!showClearBets ? (
              <button
                onClick={() => setShowClearBets(true)}
                className="text-xs text-ink-700 hover:text-red-400/70 transition-colors"
              >
                Clear all bets...
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-[#e7e6e1]">
                  This will permanently delete all <span className="font-mono">{betCount}</span> bets.
                  Reports will be kept.
                </p>
                <div>
                  <label className="label">
                    Type <span className="font-mono text-red-400">DELETE</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={clearConfirm}
                    onChange={(e) => setClearConfirm(e.target.value)}
                    className="input-field w-full text-sm"
                    placeholder="DELETE"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleClearBets}
                    disabled={clearConfirm !== 'DELETE' || clearing}
                    className="text-sm text-red-400 bg-red-400/10 hover:bg-red-400/20 px-4 py-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {clearing ? 'Clearing...' : 'Clear All Bets'}
                  </button>
                  <button
                    onClick={() => { setShowClearBets(false); setClearConfirm(''); }}
                    className="text-sm text-ink-600 hover:text-[#e7e6e1] px-4 py-2 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Account ── */}
      <div className="card p-6 space-y-4">
        <h2 className="font-serif text-xl">Account</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={handlePasswordReset} className="btn-secondary text-sm">
            {passwordResetSent ? '✓ Reset email sent' : 'Change Password'}
          </button>
          <button onClick={handleSignOut} className="btn-secondary text-sm">
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Danger Zone ── */}
      <div className="card border-red-400/20 p-6 space-y-4">
        <h2 className="font-serif text-xl text-red-400">Danger Zone</h2>
        {!showDeleteAccount ? (
          <button
            onClick={() => setShowDeleteAccount(true)}
            className="text-xs text-ink-700 hover:text-red-400/70 transition-colors"
          >
            Delete my account...
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[#e7e6e1]">
              This will permanently delete your account, all bets, and all reports.
              This action cannot be undone.
            </p>
            <div>
              <label className="label">
                Type <span className="font-mono text-red-400">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="input-field w-full text-sm"
                placeholder="DELETE"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== 'DELETE' || deleting}
                className="text-sm font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 px-4 py-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete My Account'}
              </button>
              <button
                onClick={() => { setShowDeleteAccount(false); setDeleteConfirm(''); }}
                className="text-sm text-ink-600 hover:text-[#e7e6e1] px-4 py-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
