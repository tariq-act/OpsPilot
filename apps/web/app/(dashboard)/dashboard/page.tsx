import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome to OpsPilot. Your operational overview will appear here.
        </p>
      </div>

      {/* Placeholder stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          "Open Jobs",
          "Service Requests",
          "Active Technicians",
          "Pending Invoices",
        ].map((label) => (
          <div
            key={label}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
              —
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Activity feed and quick-action panels will be added in the next slice.
      </div>
    </div>
  );
}
