export function DashboardSkeleton() {
  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="h-6 w-32 animate-pulse rounded-md bg-muted" />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="space-y-6">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[0, 1, 2, 3].map((j) => (
                  <div key={j} className="h-24 animate-pulse rounded-xl bg-card" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
