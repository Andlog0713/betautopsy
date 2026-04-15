import AdminReportDetailClient from './AdminReportDetailClient';

// Same pattern as `app/(dashboard)/uploads/[id]/page.tsx`: the mobile
// static export can't know user-generated report ids at build time,
// so we emit a placeholder and rely on the client component's
// `useParams()` + API fetch at runtime.

const IS_MOBILE_BUILD = process.env.NEXT_PUBLIC_BUILD_TARGET === 'mobile';

export function generateStaticParams() {
  return IS_MOBILE_BUILD ? [{ id: '__placeholder__' }] : [];
}

export const dynamicParams = !IS_MOBILE_BUILD;

export default function AdminReportDetailPage() {
  return <AdminReportDetailClient />;
}
