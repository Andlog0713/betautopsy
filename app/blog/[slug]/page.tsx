import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BLOG_POSTS } from '@/lib/blog-posts';

import WhyAmILosing from '../_posts/why-am-i-losing-at-sports-betting';
import ParlayAddiction from '../_posts/parlay-addiction-the-real-math';
import CognitiveBiases from '../_posts/cognitive-biases-destroying-your-bankroll';
import LossChasing from '../_posts/psychology-of-loss-chasing';
import AmIBad from '../_posts/am-i-a-bad-sports-bettor';

const POST_COMPONENTS: Record<string, React.ComponentType> = {
  'why-am-i-losing-at-sports-betting': WhyAmILosing,
  'parlay-addiction-the-real-math': ParlayAddiction,
  'cognitive-biases-destroying-your-bankroll': CognitiveBiases,
  'psychology-of-loss-chasing': LossChasing,
  'am-i-a-bad-sports-bettor': AmIBad,
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
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.publishedAt,
      url: `https://betautopsy.com/blog/${post.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  const PostContent = POST_COMPONENTS[slug];

  if (!post || !PostContent) notFound();

  return (
    <article className="space-y-8">
      <Link href="/blog" className="text-sm text-ink-600 hover:text-flame-500 transition-colors">
        ← All posts
      </Link>

      <header>
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.map((tag) => (
            <span key={tag} className="text-[11px] text-ink-600 bg-ink-900 rounded-full px-2.5 py-0.5">
              {tag}
            </span>
          ))}
        </div>
        <h1 className="font-bold text-3xl md:text-4xl mb-3">{post.title}</h1>
        <div className="flex items-center gap-3 text-sm text-ink-700">
          <span>{new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          <span>·</span>
          <span>{post.readTime}</span>
        </div>
      </header>

      <div className="prose-betautopsy">
        <PostContent />
      </div>

      <div className="space-y-6 pt-8 border-t border-white/[0.06]">
        <div className="card p-6 text-center border-flame-500/20 bg-gradient-to-r from-flame-500/5 to-transparent">
          <span className="text-2xl mb-2 block">🧬</span>
          <h3 className="font-bold text-lg mb-2">What&apos;s your Bet DNA?</h3>
          <p className="text-ink-600 text-sm mb-4">
            Take the free 2-minute quiz to discover your betting personality and hidden biases.
          </p>
          <Link href="/quiz" className="btn-primary inline-block text-sm">
            Take the Quiz
          </Link>
        </div>

        <div className="card p-6 text-center">
          <h3 className="font-bold text-lg mb-2">Want the data, not just the theory?</h3>
          <p className="text-ink-600 text-sm mb-4">
            Upload your bet history and get an AI-powered behavioral analysis — free.
          </p>
          <Link href="/signup" className="btn-secondary inline-block text-sm">
            Get Your Free Autopsy
          </Link>
        </div>

        <div>
          <h3 className="font-bold text-lg mb-4">Keep reading</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {BLOG_POSTS.filter((p) => p.slug !== slug).slice(0, 2).map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="card p-4 hover:border-white/[0.15] transition-colors"
              >
                <h4 className="font-medium text-sm mb-1">{p.title}</h4>
                <p className="text-ink-700 text-xs">{p.readTime}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
