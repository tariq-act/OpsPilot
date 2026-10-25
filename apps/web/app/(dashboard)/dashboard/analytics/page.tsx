import type { Metadata } from "next";
import { Suspense } from "react";

import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

export const metadata: Metadata = {
  title: "Analytics",
};

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
          <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
      }
    >
      <AnalyticsDashboard />
    </Suspense>
  );
}
