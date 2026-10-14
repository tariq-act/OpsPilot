/**
 * Full-page loading skeleton shown while auth or org data is being fetched.
 * Mirrors the dashboard shell shape so the layout does not shift on load.
 */
export function PageSkeleton() {
  return (
    <div className="flex min-h-screen animate-pulse bg-background">
      {/* Sidebar skeleton */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-background-subtle lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-border px-4">
          <div className="size-8 rounded-full bg-muted" />
          <div className="h-4 w-24 rounded-md bg-muted" />
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-9 rounded-lg bg-muted"
              style={{ opacity: 1 - i * 0.1 }}
            />
          ))}
        </nav>
      </aside>

      {/* Main content skeleton */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-border px-6">
          <div className="h-4 w-32 rounded-md bg-muted" />
          <div className="size-8 rounded-full bg-muted" />
        </header>
        {/* Page body */}
        <main className="flex-1 p-6">
          <div className="mb-6 h-8 w-48 rounded-md bg-muted" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-muted" />
            ))}
          </div>
          <div className="mt-6 h-64 rounded-2xl bg-muted" />
        </main>
      </div>
    </div>
  );
}
