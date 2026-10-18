import type { Metadata } from "next";
import { Suspense } from "react";

import { CustomerList } from "@/components/customers/customer-list";

export const metadata: Metadata = {
  title: "Customers",
};

export default function CustomersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
      }
    >
      <CustomerList />
    </Suspense>
  );
}
