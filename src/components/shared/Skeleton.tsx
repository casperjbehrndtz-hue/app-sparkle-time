/**
 * Reusable skeleton loading primitives for NemtBudget.
 *
 * `Skeleton`          – a single pulsing rectangle; compose freely.
 * `DashboardSkeleton` – mimics the CockpitSection layout so the page
 *                        feels stable while data loads.
 */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-muted ${className ?? ""}`} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Health score ring + summary bars */}
      <div className="flex items-center gap-5">
        <Skeleton className="w-24 h-24 rounded-full shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-2 w-2/3" />
        </div>
      </div>

      {/* Metric cards grid */}
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>

      {/* Alert / smart-step placeholders */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-5/6 rounded-md" />
        <Skeleton className="h-4 w-2/3 rounded-md" />
      </div>
    </div>
  );
}
