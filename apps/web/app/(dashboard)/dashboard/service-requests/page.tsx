import type { Metadata } from "next";
import { Suspense } from "react";

import { ServiceRequestList } from "@/components/service-requests/service-request-list";

export const metadata: Metadata = {
  title: "Service Requests",
};

export default function ServiceRequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
      }
    >
      <ServiceRequestList />
    </Suspense>
  );
}
