import type { Metadata } from "next";
import { Suspense } from "react";

import { TechnicianList } from "@/components/technicians/technician-list";

export const metadata: Metadata = {
  title: "Technicians",
};

export default function TechniciansPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
      }
    >
      <TechnicianList />
    </Suspense>
  );
}
