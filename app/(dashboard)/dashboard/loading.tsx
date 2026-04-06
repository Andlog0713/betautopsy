import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <Skeleton className="h-7 w-32 mb-2" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="mb-10">
        <Skeleton className="h-4 w-16 mb-2" />
        <Skeleton className="h-14 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex gap-6 mb-10">
        <div className="flex gap-6">
          <Skeleton className="h-12 w-24" />
          <Skeleton className="h-12 w-24" />
          <Skeleton className="h-12 w-24" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-14 w-20 rounded-xl" />
          <Skeleton className="h-14 w-20 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
