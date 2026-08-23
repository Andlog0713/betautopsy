import { headers } from 'next/headers';
import { CSP_NONCE_HEADER } from '@/lib/content-security-policy';
import { isMobileBuild } from '@/lib/platform';

interface JsonLdProps {
  data: unknown;
}

export default function JsonLd({ data }: JsonLdProps) {
  const nonce = isMobileBuild()
    ? undefined
    : headers().get(CSP_NONCE_HEADER) ?? undefined;

  return (
    <script
      nonce={nonce}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
