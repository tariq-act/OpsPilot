import type {
  PaymentMethod,
  PaymentStatus,
} from '../../db/schema/payment.js';

export class PaymentDto {
  id!: string;
  organizationId!: string;
  customerId!: string;
  invoiceId!: string;
  amount!: string;
  currency!: string;
  method!: PaymentMethod;
  status!: PaymentStatus;
  transactionId!: string | null;
  paidAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaymentResponseDto {
  payment!: PaymentDto;
}

export class PaymentListResponseDto {
  payments!: PaymentDto[];
}
