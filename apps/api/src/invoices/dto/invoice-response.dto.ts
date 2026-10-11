import type {
  InvoiceItemType,
  InvoiceStatus,
} from '../../db/schema/invoice.js';

export class InvoiceItemDto {
  id!: string;
  invoiceId!: string;
  type!: InvoiceItemType;
  description!: string;
  quantity!: string;
  unitPrice!: string;
  amount!: string;
}

export class InvoiceDto {
  id!: string;
  organizationId!: string;
  customerId!: string;
  jobId!: string;
  invoiceNumber!: string;
  status!: InvoiceStatus;
  subtotal!: string;
  discount!: string;
  tax!: string;
  total!: string;
  amountPaid!: string;
  amountDue!: string;
  currency!: string;
  issuedAt!: Date | null;
  dueAt!: Date | null;
  paidAt!: Date | null;
  createdBy!: string;
  createdAt!: Date;
  updatedAt!: Date;
  items!: InvoiceItemDto[];
}

export class InvoiceResponseDto {
  invoice!: InvoiceDto;
}

export class InvoiceListResponseDto {
  invoices!: InvoiceDto[];
}
