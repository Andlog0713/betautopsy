import { Skeleton } from '@/components/ui/skeleton';

export default function BetsLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <Skeleton className="h-8 w-40" />
      <div className="flex gap-3">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="space-y-0">
        <Skeleton className="h-10 rounded-t-lg" />
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-none" />
        ))}
      </div>
    </div>
  );
}
