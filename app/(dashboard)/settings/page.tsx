'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Snowflake } from 'lucide-react';
import { toast } from 'sonner';
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
  const [bankrollSaving, setBankrollSaving] = useState(false);
  const [bankrollExpanded, setBankrollExpanded] = useState(false);

  // Email preferences
  const [digestEnabled, setDigestEnabled] = useState(true);

  // Danger zone
  const [showClearBets, setShowClearBets] = useState(false);
  const [clearConfirm, setClearConfirm] = useState('');
  const [clearing, setClearing] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

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
        setDigestEnabled(p.email_digest_enabled !== false);
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
    toast.success('Profile saved');
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
    toast.success('Bankroll saved');
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
    await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    toast.success('Reset email sent');
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
        <div className="h-8 w-32 bg-surface-1 rounded" />
        <div className="h-40 bg-surface-1 rounded-sm" />
        <div className="h-40 bg-surface-1 rounded-sm" />
      </div>
    );
  }

  const tier = profile?.subscription_tier ?? 'free';
  const isPaid = tier === 'pro';

  const tierBadge: Record<string, string> = {
    free: 'bg-surface-1 text-fg-muted border border-border-subtle',
    pro: 'bg-scalpel-muted text-scalpel border border-scalpel/20',
    sharp: 'bg-win/10 text-win border border-win/20',
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg-bright">Settings</h1>
        <p className="text-sm text-fg-muted mt-1">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
        {/* Sidebar nav - hidden on mobile */}
        <nav className="hidden md:block space-y-1 sticky top-24 self-start">
          {['Profile', 'Bankroll', 'Subscription', 'Email', 'Data', 'Account', 'Danger Zone'].map((section) => (
            <a
              key={section}
              href={`#settings-${section.toLowerCase().replace(/\s+/g, '-')}`}
              className="block text-sm text-fg-dim hover:text-fg-bright px-3 py-1.5 rounded-lg hover:bg-surface-1 transition-colors"
            >
              {section}
            </a>
          ))}
        </nav>

        {/* Main content */}
        <div className="space-y-10 max-w-2xl">

      {/* ── Profile ── */}
      <div id="settings-profile" className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-fg-bright">Profile</h2>
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
            {profileSaving ? 'Saving...' : 'Save Profile'}
          </button>

          {/* Streak info */}
          <div className="pt-4 border-t border-border-subtle space-y-2">
            <p className="text-fg-muted text-xs uppercase tracking-wider font-medium">Streak</p>
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-fg-muted">Current: </span>
                <span className="text-fg-bright font-mono">{profile?.streak_count ?? 0} weeks</span>
              </div>
              <div>
                <span className="text-fg-muted">Best: </span>
                <span className="text-fg-bright font-mono">{profile?.streak_best ?? 0} weeks</span>
              </div>
              <div>
                <span className="text-fg-muted">Freezes: </span>
                <span className="text-fg-bright font-mono flex items-center gap-1"><Snowflake size={14} className="text-cyan-400" /> {profile?.streak_freezes ?? 1}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bankroll ── */}
      <div id="settings-bankroll" className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-fg-bright">Bankroll</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1 max-w-xs">
            <label className="label">Total Bankroll</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted">$</span>
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
            {bankrollSaving ? '...' : 'Save'}
          </button>
        </div>
        <p className="text-fg-muted text-xs">
          This helps us assess your risk level. We never share this.
        </p>

        <button
          onClick={() => setBankrollExpanded(!bankrollExpanded)}
          className="text-sm text-fg-muted hover:text-fg transition-colors flex items-center gap-1"
        >
          <span className="text-xs">{bankrollExpanded ? '▾' : '▸'}</span>
          What&apos;s a bankroll?
        </button>
        {bankrollExpanded && (
          <div className="bg-surface-2 rounded-sm p-4 text-sm text-fg-muted space-y-3">
            <p>
              Your bankroll is the total amount of money you&apos;ve set aside
              specifically for betting, across all your sportsbooks combined.
              It&apos;s not your savings account or your rent money. It&apos;s the
              dedicated pool you bet from.
            </p>
            <p>It&apos;s okay to estimate. A rough number is better than nothing.</p>
            <p>
              <span className="text-fg-bright">Why this matters:</span>{' '}
              BetAutopsy uses your bankroll to assess whether your bet sizing
              is sustainable. A $200 bet means something very different if your
              bankroll is $1,000 versus $20,000. Without this number, we have
              to estimate, and we&apos;d rather be accurate.
            </p>
            <p>Make sure to update this once in a while so your analysis stays accurate.</p>
          </div>
        )}
      </div>

      {/* ── Subscription ── */}
      <div id="settings-subscription" className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-fg-bright">Subscription</h2>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium px-3 py-1 rounded-sm capitalize ${tierBadge[tier]}`}>
            {tier}
          </span>
          {profile?.subscription_status && profile.subscription_status !== 'inactive' && (
            <span className={`text-xs ${
              profile.subscription_status === 'active' ? 'text-win' :
              profile.subscription_status === 'past_due' ? 'text-caution' : 'text-fg-muted'
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
            <p className="text-fg-muted text-sm">
              Your subscription is managed manually. Contact support to make changes.
            </p>
          )
        ) : (
          <div className="space-y-3">
            <p className="text-fg-bright text-sm">You ran your free autopsy. Here&apos;s what Pro unlocks:</p>
            <ul className="text-fg-muted text-sm space-y-1">
              <li>Unlimited reports as you add bets weekly</li>
              <li>Progress tracking that shows whether your habits are actually improving</li>
              <li>Full 5-chapter analysis with dollar costs and action plan</li>
              <li>Weekly check-ins so you don&apos;t have to remember to log in</li>
            </ul>
            <p className="text-fg-muted text-xs">Most users make back the subscription cost from the first leak they plug.</p>
            <a href="/pricing" className="btn-primary inline-block text-sm">Upgrade to Pro</a>
          </div>
        )}
      </div>

      {/* ── Email Preferences ── */}
      <div id="settings-email" className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-fg-bright">Email Preferences</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-fg-bright text-sm font-medium">Weekly Digest</p>
            <p className="text-fg-muted text-xs">Get your personalized &quot;Week in Bets&quot; email every Tuesday.</p>
          </div>
          <button
            onClick={async () => {
              const newVal = !digestEnabled;
              setDigestEnabled(newVal);
              const supabase = createClient();
              const { error } = await supabase
                .from('profiles')
                .update({ email_digest_enabled: newVal })
                .eq('id', profile!.id);
              if (error) setDigestEnabled(!newVal); // revert on error
            }}
            className={`relative w-11 h-6 rounded-full transition-colors ${digestEnabled ? 'bg-scalpel' : 'bg-surface-1'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${digestEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      {/* ── Data ── */}
      <div id="settings-data" className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-fg-bright">Data</h2>
        <div className="flex gap-4 text-sm text-fg-muted">
          <span><span className="font-mono text-fg-bright">{betCount}</span> bets</span>
          <span><span className="font-mono text-fg-bright">{reportCount}</span> reports</span>
        </div>

        <div className="flex flex-wrap gap-3">
          <a href="/api/export" className="btn-secondary text-sm">
            Export All Bets as CSV
          </a>
        </div>

        {/* Clear all bets */}
        {isPaid && betCount > 0 && (
          <div className="pt-3 border-t border-border-subtle">
            {!showClearBets ? (
              <button
                onClick={() => setShowClearBets(true)}
                className="text-xs text-fg-dim hover:text-loss/70 transition-colors"
              >
                Clear all bets...
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-fg-bright">
                  This will permanently delete all <span className="font-mono">{betCount}</span> bets.
                  Reports will be kept.
                </p>
                <div>
                  <label className="label">
                    Type <span className="font-mono text-loss">DELETE</span> to confirm
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
                    className="btn-danger text-sm !px-4 !py-2"
                  >
                    {clearing ? 'Clearing...' : 'Clear All Bets'}
                  </button>
                  <button
                    onClick={() => { setShowClearBets(false); setClearConfirm(''); }}
                    className="btn-ghost text-sm"
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
      <div id="settings-account" className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-fg-bright">Account</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={handlePasswordReset} className="btn-secondary text-sm">
            Change Password
          </button>
          <button onClick={handleSignOut} className="btn-secondary text-sm">
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Danger Zone ── */}
      <div id="settings-danger-zone" className="card border-loss/20 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-fg-bright text-loss">Danger Zone</h2>
        {!showDeleteAccount ? (
          <button
            onClick={() => setShowDeleteAccount(true)}
            className="text-xs text-fg-dim hover:text-loss/70 transition-colors"
          >
            Delete my account...
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-fg-bright">
              This will permanently delete your account, all bets, and all reports.
              This action cannot be undone.
            </p>
            <div>
              <label className="label">
                Type <span className="font-mono text-loss">DELETE</span> to confirm
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
                className="btn-danger text-sm !px-4 !py-2"
              >
                {deleting ? 'Deleting...' : 'Delete My Account'}
              </button>
              <button
                onClick={() => { setShowDeleteAccount(false); setDeleteConfirm(''); }}
                className="btn-ghost text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

        </div>{/* end main content */}
      </div>{/* end grid */}
    </div>
  );
}
