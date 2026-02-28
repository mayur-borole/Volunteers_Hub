import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'card' | 'text' | 'avatar' | 'button';
}

export const LoadingSkeleton = ({ className, variant = 'text' }: LoadingSkeletonProps) => {
  const baseClass = 'animate-pulse bg-muted rounded';
  
  const variants = {
    text: 'h-4 w-full',
    card: 'h-48 w-full rounded-lg',
    avatar: 'h-12 w-12 rounded-full',
    button: 'h-10 w-24 rounded-md',
  };

  return <div className={cn(baseClass, variants[variant], className)} />;
};

export const EventCardSkeleton = () => (
  <div className="bg-card rounded-xl p-4 space-y-4 border border-border">
    <LoadingSkeleton variant="card" className="h-40" />
    <LoadingSkeleton className="h-6 w-3/4" />
    <LoadingSkeleton className="h-4 w-full" />
    <LoadingSkeleton className="h-4 w-2/3" />
    <div className="flex gap-2">
      <LoadingSkeleton variant="button" />
      <LoadingSkeleton variant="button" />
    </div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <LoadingSkeleton key={i} variant="card" className="h-28" />
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[...Array(4)].map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  </div>
);
