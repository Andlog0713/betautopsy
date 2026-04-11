import { Metadata } from 'next';
import Link from 'next/link';
import { BLOG_POSTS } from '@/lib/blog-posts';
import { Logo } from '@/components/logo';

export const metadata: Metadata = {
  title: 'The Post-Mortem — Sports Betting Psychology & Behavioral Analysis | BetAutopsy',
  description: 'Deep dives into sports betting psychology, cognitive biases, parlay math, loss chasing, and the behavioral patterns that cost bettors money.',
  alternates: {
    canonical: '/blog',
  },
};

export default function BlogIndexPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.betautopsy.com' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://www.betautopsy.com/blog' },
    ],
  };

  return (
    <div className="space-y-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {/* Blog hero banner */}
      <div className="relative overflow-hidden rounded-lg border border-border-subtle grid-paper">
        {/* Glow */}
        <div className="absolute -top-16 -right-16 w-[300px] h-[300px] bg-scalpel/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-[200px] h-[200px] bg-scalpel/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative px-8 py-10 md:py-14 md:px-12">
          <div className="flex items-end justify-between gap-8">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <Logo size="xs" variant="mark" theme="dark" />
                <div className="h-6 w-px bg-border-subtle" />
                <span className="font-mono text-[10px] text-fg-dim tracking-[3px] uppercase">Behavioral Analysis</span>
              </div>
              <h1 className="font-extrabold text-5xl md:text-6xl tracking-tight text-fg-bright leading-none mb-3">
                The Post-Mortem
              </h1>
              <p className="text-fg-muted font-light text-lg max-w-md">
                The behavioral side of sports betting. Patterns, biases, and what they cost you.
              </p>
            </div>
            <a
              href="/blog/feed.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-fg-dim hover:text-scalpel transition-colors shrink-0 hidden md:block"
            >
              RSS
            </a>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {BLOG_POSTS.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="block card p-6 hover:border-border-subtle transition-colors group"
          >
            <div className="flex flex-wrap gap-2 mb-3">
              {post.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[11px] text-fg-muted bg-base rounded-sm px-2.5 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
            <h2 className="font-bold text-2xl text-fg-bright group-hover:text-scalpel transition-colors mb-2">
              {post.title}
            </h2>
            <p className="text-fg-muted text-sm font-light mb-3">{post.description}</p>
            <div className="flex items-center gap-3 text-xs text-fg-dim font-light">
              <span>{new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              <span>·</span>
              <span>{post.readTime}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="finding-card border-l-scalpel p-8 text-center">
        <h3 className="font-semibold text-xl mb-2 text-fg-bright">Curious about your own biases?</h3>
        <p className="text-fg-muted text-sm mb-4">
          Take the free 2-minute Bet DNA quiz — no signup, no data needed.
        </p>
        <Link href="/quiz" className="btn-primary inline-block">
          Take the Quiz
        </Link>
      </div>
    </div>
  );
}
