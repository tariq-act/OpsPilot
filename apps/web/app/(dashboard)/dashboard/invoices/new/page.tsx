import type { Metadata } from "next";
import { Suspense } from "react";

import { InvoiceCreateForm } from "@/components/invoices/invoice-form";

export const metadata: Metadata = {
  title: "Create invoice",
};

export default function NewInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
      }
    >
      <InvoiceCreateForm />
    </Suspense>
  );
}
