import Link from 'next/link';
import { Logo } from '@/components/logo';
import ResponsibleGambling from '@/components/ResponsibleGambling';
import { PRICING_ENABLED } from '@/lib/feature-flags';

export default function Footer() {
  return (
    <footer className="border-t border-border-subtle bg-surface-1 py-10">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
          <Logo size="xs" variant="horizontal" theme="dark" />
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {[
              ...(PRICING_ENABLED ? [{ label: 'Pricing', href: '/#pricing' }] : []),
              { label: 'Blog', href: '/blog' },
              { label: 'FAQ', href: '/faq' },
              { label: 'Privacy', href: '/privacy' },
              { label: 'Terms', href: '/terms' },
              { label: 'Log in', href: '/login' },
              { label: 'Sign up', href: '/signup' },
            ].map(link => (
              <Link key={link.href} href={link.href} className="font-mono text-xs text-fg-muted hover:text-fg transition-colors tracking-wider">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <p className="font-mono text-[10px] text-fg-muted tracking-wider mt-4">
          © {new Date().getFullYear()} Diagnostic Sports, LLC. All rights reserved.
        </p>
      </div>
      <ResponsibleGambling />
    </footer>
  );
}
