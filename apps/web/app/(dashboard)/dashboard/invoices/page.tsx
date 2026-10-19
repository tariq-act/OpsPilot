import type { Metadata } from "next";
import { Suspense } from "react";

import { InvoiceList } from "@/components/invoices/invoice-list";

export const metadata: Metadata = {
  title: "Invoices",
};

export default function InvoicesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
      }
    >
      <InvoiceList />
    </Suspense>
  );
}
