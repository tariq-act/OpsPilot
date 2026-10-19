import type { InvoiceItemType } from "@/lib/types";

export const INVOICE_ITEM_TYPE_LABEL: Record<InvoiceItemType, string> = {
  LABOR: "Labor",
  PARTS: "Parts",
  OTHER: "Other",
  FEE: "Fee",
};

export const INVOICE_ITEM_TYPES: InvoiceItemType[] = [
  "LABOR",
  "PARTS",
  "OTHER",
  "FEE",
];
