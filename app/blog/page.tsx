import { Metadata } from 'next';
import Link from 'next/link';
import { BLOG_POSTS } from '@/lib/blog-posts';

export const metadata: Metadata = {
  title: 'The Post-Mortem — Sports Betting Psychology & Behavioral Analysis | BetAutopsy',
  description: 'Deep dives into sports betting psychology, cognitive biases, parlay math, loss chasing, and the behavioral patterns that cost bettors money.',
};

export default function BlogIndexPage() {
  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-bold text-4xl mb-3">The Post-Mortem</h1>
        <p className="text-ink-600">
          The behavioral side of sports betting. Patterns, biases, and what they cost you.
        </p>
      </div>

      <div className="space-y-8">
        {BLOG_POSTS.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="block card p-6 hover:border-white/[0.15] transition-colors group"
          >
            <div className="flex flex-wrap gap-2 mb-3">
              {post.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[11px] text-ink-600 bg-ink-900 rounded-full px-2.5 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
            <h2 className="font-bold text-xl group-hover:text-flame-500 transition-colors mb-2">
              {post.title}
            </h2>
            <p className="text-ink-600 text-sm mb-3">{post.description}</p>
            <div className="flex items-center gap-3 text-xs text-ink-700">
              <span>{new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              <span>·</span>
              <span>{post.readTime}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="card p-8 text-center border-flame-500/20 bg-gradient-to-r from-flame-500/5 to-transparent">
        <span className="text-3xl mb-3 block">🧬</span>
        <h3 className="font-bold text-xl mb-2">Curious about your own biases?</h3>
        <p className="text-ink-600 text-sm mb-4">
          Take the free 2-minute Bet DNA quiz — no signup, no data needed.
        </p>
        <Link href="/quiz" className="btn-primary inline-block">
          Take the Quiz
        </Link>
      </div>
    </div>
  );
}
