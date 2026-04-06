import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className="space-y-8 animate-fade-in">
      <Skeleton className="h-8 w-32" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
