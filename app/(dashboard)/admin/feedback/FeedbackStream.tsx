'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet } from '@/lib/api-client';
import type { FeedbackCounts, FeedbackType, FeedbackWithUser } from '@/types';

const PAGE_SIZE = 50;

type FilterKey = 'all' | FeedbackType;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'report_reaction', label: 'Reactions' },
  { key: 'bug', label: 'Bugs' },
  { key: 'feature_request', label: 'Feature Requests' },
  { key: 'general', label: 'General' },
];

const TYPE_BADGE: Record<FeedbackType, string> = {
  report_reaction: 'bg-scalpel/10 text-scalpel border border-scalpel/20',
  bug: 'bg-bleed/10 text-bleed border border-bleed/20',
  feature_request: 'bg-amber-400/10 text-amber-400 border border-amber-400/20',
  general: 'bg-ink-700/30 text-fg-muted border border-border-subtle',
};

const TYPE_LABEL: Record<FeedbackType, string> = {
  report_reaction: 'Reaction',
  bug: 'Bug',
  feature_request: 'Feature',
  general: 'General',
};

const RATING_LABEL: Record<string, string> = {
  positive: '+',
  neutral: '~',
  negative: '-',
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.floor((Date.now() - then) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 2592000) return `${Math.floor(secs / 86400)}d ago`;
  if (secs < 31536000) return `${Math.floor(secs / 2592000)}mo ago`;
  return `${Math.floor(secs / 31536000)}y ago`;
}

function Separator() {
  return <span className="text-fg-dim mx-1.5">{'//'}</span>;
}

export default function FeedbackStream() {
  const router = useRouter();
  const [items, setItems] = useState<FeedbackWithUser[]>([]);
  const [counts, setCounts] = useState<FeedbackCounts>({
    total: 0,
    report_reaction: 0,
    bug: 0,
    feature_request: 0,
    general: 0,
  });
  const [filter, setFilter] = useState<FilterKey>('all');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const fetchPage = useCallback(
    async (nextOffset: number, reset: boolean, forFilter: FilterKey) => {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError('');
      try {
        const params = new URLSearchParams({
          offset: nextOffset.toString(),
          limit: PAGE_SIZE.toString(),
        });
        if (forFilter !== 'all') params.set('type', forFilter);

        const res = await apiGet(`/api/admin/feedback?${params}`);
        if (res.status === 403) {
          router.push('/dashboard');
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Failed to load feedback' }));
          setError(data.error || 'Failed to load feedback');
          return;
        }
        const data = (await res.json()) as {
          feedback: FeedbackWithUser[];
          counts: FeedbackCounts;
          offset: number;
          limit: number;
        };

        setCounts(data.counts);
        setItems((prev) => (reset ? data.feedback : [...prev, ...data.feedback]));
        setOffset(nextOffset + data.feedback.length);
      } catch {
        setError('Failed to load feedback');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [router]
  );

  useEffect(() => {
    fetchPage(0, true, filter);
  }, [fetchPage, filter]);

  const currentFilterTotal = filter === 'all' ? counts.total : counts[filter];
  const hasMore = items.length < currentFilterTotal;

  function handleFilterClick(next: FilterKey) {
    if (next === filter) return;
    setFilter(next);
    setOffset(0);
    setItems([]);
  }

  function handleLoadMore() {
    fetchPage(offset, false, filter);
  }

  return (
    <div className="space-y-6">
      {/* Counts summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: 'Total', value: counts.total },
          { label: 'Reactions', value: counts.report_reaction },
          { label: 'Bugs', value: counts.bug },
          { label: 'Features', value: counts.feature_request },
          { label: 'General', value: counts.general },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border border-border-subtle rounded-sm p-3"
          >
            <div className="data-label text-[10px]">{stat.label}</div>
            <div className="font-mono text-2xl font-bold tabular-nums text-fg-bright mt-1">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.key === filter;
          return (
            <button
              key={f.key}
              onClick={() => handleFilterClick(f.key)}
              className={`rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-scalpel-muted text-scalpel border border-scalpel/20'
                  : 'border border-border-subtle text-fg-muted hover:text-fg hover:bg-white/[0.02]'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="border border-bleed/30 bg-bleed/5 text-bleed text-sm rounded-sm p-4">
          {error}
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="border border-border-subtle rounded-sm h-24 animate-pulse bg-white/[0.02]"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="border border-border-subtle rounded-sm p-10 text-center text-fg-muted text-sm">
          {counts.total === 0
            ? 'No feedback yet.'
            : `No ${filter === 'all' ? '' : FILTERS.find((f) => f.key === filter)?.label.toLowerCase() + ' '}feedback found.`}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const tier = item.metadata?.tier ?? item.user?.subscription_tier;
            const betCount = item.metadata?.bet_count;
            return (
              <div
                key={item.id}
                className="border border-border-subtle rounded-sm p-4 space-y-2"
              >
                {/* Header row */}
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-sm ${TYPE_BADGE[item.type]}`}
                  >
                    {TYPE_LABEL[item.type]}
                  </span>
                  {item.rating && (
                    <span className="text-base leading-none font-mono" title={item.rating}>
                      {RATING_LABEL[item.rating]}
                    </span>
                  )}
                  <span className="ml-auto font-mono text-xs text-fg-dim">
                    {relativeTime(item.created_at)}
                  </span>
                </div>

                {/* Message */}
                <div className="font-sans text-sm text-fg">
                  {item.message ? (
                    <p className="whitespace-pre-wrap break-words">{item.message}</p>
                  ) : (
                    <p className="text-fg-dim italic">No message</p>
                  )}
                </div>

                {/* Metadata row */}
                <div className="font-mono text-[11px] text-fg-muted flex flex-wrap items-center">
                  {tier && <span className="uppercase tracking-wider">{tier}</span>}
                  {tier && typeof betCount === 'number' && <Separator />}
                  {typeof betCount === 'number' && (
                    <span className="tabular-nums">{betCount} bets</span>
                  )}
                  {item.page && (
                    <>
                      {(tier || typeof betCount === 'number') && <Separator />}
                      <span className="truncate max-w-[40ch]">{item.page}</span>
                    </>
                  )}
                  {item.report_id && (
                    <>
                      {(tier || typeof betCount === 'number' || item.page) && <Separator />}
                      <Link
                        href={`/reports/${item.report_id}`}
                        className="text-scalpel hover:underline"
                      >
                        view report
                      </Link>
                    </>
                  )}
                  {item.user?.email && (
                    <>
                      {(tier || typeof betCount === 'number' || item.page || item.report_id) && (
                        <Separator />
                      )}
                      <span className="truncate max-w-[30ch]">{item.user.email}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full border border-border-subtle rounded-sm py-3 text-sm font-medium text-fg-muted hover:text-fg hover:bg-white/[0.02] transition-colors disabled:opacity-50"
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
