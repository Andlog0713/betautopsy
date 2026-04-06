import { Skeleton } from '@/components/ui/skeleton';

export default function UploadLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
