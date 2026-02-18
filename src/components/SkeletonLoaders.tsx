import { Skeleton } from "@/components/ui/skeleton";

export const TableSkeleton = ({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) => (
  <div className="rounded-lg border border-border overflow-hidden">
    <div className="px-4 py-3 border-b border-border bg-card">
      <Skeleton className="h-4 w-40 shimmer" />
    </div>
    <div className="divide-y divide-border/50">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex gap-4" style={{ animationDelay: `${i * 80}ms` }}>
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className={`h-4 shimmer ${j === 0 ? "w-32" : "w-20"}`} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const MetricsSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className={`grid grid-cols-2 md:grid-cols-${count} gap-4`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2 shimmer" style={{ animationDelay: `${i * 100}ms` }}>
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    ))}
  </div>
);

export const CardSkeleton = () => (
  <div className="rounded-lg border border-border bg-card p-4 space-y-3 shimmer">
    <div className="flex items-center gap-2">
      <Skeleton className="h-6 w-6 rounded" />
      <Skeleton className="h-4 w-32" />
    </div>
    <Skeleton className="h-3 w-full" />
    <Skeleton className="h-3 w-2/3" />
  </div>
);

export const KanbanSkeleton = () => (
  <div className="flex gap-4 overflow-x-auto pb-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="min-w-[260px] w-[260px] shrink-0 rounded-lg border border-border bg-card">
        <div className="px-3 py-2.5 border-b border-border">
          <Skeleton className="h-3 w-20 shimmer" />
        </div>
        <div className="p-2 space-y-2">
          {Array.from({ length: 3 - i % 2 }).map((_, j) => (
            <div key={j} className="rounded-md border border-border bg-background p-3 space-y-2 shimmer" style={{ animationDelay: `${(i * 3 + j) * 60}ms` }}>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

/** Skeleton for DealRoom page — header + tabs + content area */
export const DealRoomSkeleton = () => (
  <div className="flex flex-col h-full animate-pulse">
    {/* Header skeleton */}
    <div className="px-6 pt-4 pb-3 border-b border-border bg-card/50">
      <div className="flex items-center gap-1.5 mb-3">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-3" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      {/* Tab bar skeleton */}
      <div className="flex items-center gap-4 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-16" />
        ))}
      </div>
    </div>
    {/* Content skeleton */}
    <div className="p-6 space-y-4">
      <MetricsSkeleton count={4} />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  </div>
);
