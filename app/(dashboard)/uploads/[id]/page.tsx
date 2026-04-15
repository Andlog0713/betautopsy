import UploadDetailClient from './UploadDetailClient';

// ──────────────────────────────────────────────────────────────────
// `output: 'export'` refuses to build a dynamic route that has no
// `generateStaticParams()`. For the web build we return an empty
// array and rely on Next's on-demand dynamic rendering; for the
// mobile build we emit a single `__placeholder__` entry so the
// route exists at all. The actual upload id is read client-side
// from `useParams()` in `UploadDetailClient`, which then fetches
// the data against the hosted API — so in-app navigation to
// `/uploads/<real-id>` works via Next's client router, not via
// disk-prerendered HTML.
// ──────────────────────────────────────────────────────────────────

const IS_MOBILE_BUILD = process.env.NEXT_PUBLIC_BUILD_TARGET === 'mobile';

export function generateStaticParams() {
  return IS_MOBILE_BUILD ? [{ id: '__placeholder__' }] : [];
}

export const dynamicParams = !IS_MOBILE_BUILD;

export default function UploadDetailPage() {
  return <UploadDetailClient />;
}
