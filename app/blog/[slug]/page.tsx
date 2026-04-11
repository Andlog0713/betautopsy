import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BLOG_POSTS } from '@/lib/blog-posts';

import WhyAmILosing from '../_posts/why-am-i-losing-at-sports-betting';
import ParlayAddiction from '../_posts/parlay-addiction-the-real-math';
import CognitiveBiases from '../_posts/cognitive-biases-destroying-your-bankroll';
import LossChasing from '../_posts/psychology-of-loss-chasing';
import AmIBad from '../_posts/am-i-a-bad-sports-bettor';
import HowToAnalyze from '../_posts/how-to-analyze-your-betting-history';
import BehavioralAnalysis from '../_posts/what-is-behavioral-betting-analysis';
import LosingOnPrizePicks from '../_posts/why-am-i-losing-on-prizepicks';
import SunkCostFallacy from '../_posts/sunk-cost-fallacy-sports-betting';
import BettingArchetypes from '../_posts/betting-archetypes-behavioral-profiles';
import CompleteGuidePsychology from '../_posts/complete-guide-betting-psychology';

const POST_COMPONENTS: Record<string, React.ComponentType> = {
  'why-am-i-losing-at-sports-betting': WhyAmILosing,
  'parlay-addiction-the-real-math': ParlayAddiction,
  'cognitive-biases-destroying-your-bankroll': CognitiveBiases,
  'psychology-of-loss-chasing': LossChasing,
  'am-i-a-bad-sports-bettor': AmIBad,
  'how-to-analyze-your-betting-history': HowToAnalyze,
  'what-is-behavioral-betting-analysis': BehavioralAnalysis,
  'why-am-i-losing-on-prizepicks': LosingOnPrizePicks,
  'sunk-cost-fallacy-sports-betting': SunkCostFallacy,
  'betting-archetypes-behavioral-profiles': BettingArchetypes,
  'complete-guide-betting-psychology': CompleteGuidePsychology,
};

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return {};

  return {
    title: `${post.title} | BetAutopsy Blog`,
    description: post.description,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.publishedAt,
      url: `https://www.betautopsy.com/blog/${post.slug}`,
      images: [{ url: `/api/og?title=${encodeURIComponent(post.title)}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [`/api/og?title=${encodeURIComponent(post.title)}`],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  const PostContent = POST_COMPONENTS[slug];

  if (!post || !PostContent) notFound();

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.betautopsy.com' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://www.betautopsy.com/blog' },
      { '@type': 'ListItem', position: 3, name: post.title, item: `https://www.betautopsy.com/blog/${post.slug}` },
    ],
  };

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: { '@type': 'Organization', name: 'BetAutopsy' },
    publisher: { '@type': 'Organization', name: 'BetAutopsy', url: 'https://www.betautopsy.com' },
    mainEntityOfPage: `https://www.betautopsy.com/blog/${post.slug}`,
  };

  return (
    <article className="space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <Link href="/blog" className="text-sm text-fg-muted hover:text-scalpel transition-colors">
        ← All posts
      </Link>

      <header>
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.map((tag) => (
            <span key={tag} className="text-[11px] text-fg-muted bg-base rounded-sm px-2.5 py-0.5">
              {tag}
            </span>
          ))}
        </div>
        <h1 className="font-bold text-3xl md:text-4xl tracking-tight mb-3 text-fg-bright">{post.title}</h1>
        <div className="flex items-center gap-3 text-sm text-fg-dim">
          <span>{new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          <span>·</span>
          <span>{post.readTime}</span>
        </div>
      </header>

      <div className="prose-betautopsy">
        <PostContent />
      </div>

      <div className="space-y-6 pt-8 border-t border-border-subtle">
        <div className="finding-card border-l-scalpel p-6 text-center">
          <h3 className="font-bold text-lg mb-2 text-fg-bright">What&apos;s your Bet DNA?</h3>
          <p className="text-fg-muted text-sm mb-4">
            Take the free 2-minute quiz to discover your betting personality and hidden biases.
          </p>
          <Link href="/quiz" className="btn-primary inline-block text-sm">
            Take the Quiz
          </Link>
        </div>

        <div className="card p-6 text-center">
          <h3 className="font-bold text-lg mb-2 text-fg-bright">Want the data, not just the theory?</h3>
          <p className="text-fg-muted text-sm mb-4">
            Upload your bet history and get a full behavioral analysis, free.
          </p>
          <Link href="/signup" className="btn-secondary inline-block text-sm">
            Get Your Free Autopsy
          </Link>
        </div>

        <div>
          <h3 className="font-bold text-lg mb-4 text-fg-bright">Keep reading</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {BLOG_POSTS.filter((p) => p.slug !== slug).slice(0, 2).map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="card p-4 hover:border-border-subtle transition-colors"
              >
                <h4 className="font-medium text-sm mb-1">{p.title}</h4>
                <p className="text-fg-dim text-xs">{p.readTime}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
