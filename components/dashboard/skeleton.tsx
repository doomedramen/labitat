import { Skeleton } from "@/components/ui/skeleton"

export function ItemCardSkeleton() {
  return (
    <div className="min-h-[3.25rem] rounded-xl border border-border bg-card px-3 py-2">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 flex-none rounded-md" />
        <Skeleton className="h-4 w-24 rounded-md" />
      </div>
    </div>
  )
}

function GroupSkeleton({ itemCount }: { itemCount: number }) {
  return (
    <div>
      <div className="mb-3">
        <Skeleton className="h-3 w-20 rounded-md" />
      </div>
      <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
        {Array.from({ length: itemCount }).map((_, i) => (
          <ItemCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-svh p-6">
      <header className="mb-8 flex items-center justify-between gap-4">
        <Skeleton className="h-6 w-32 rounded-md" />
        <Skeleton className="size-8 rounded-md" />
      </header>
      <div className="flex flex-col gap-8">
        <GroupSkeleton itemCount={4} />
        <GroupSkeleton itemCount={3} />
        <GroupSkeleton itemCount={4} />
      </div>
    </div>
  )
}
