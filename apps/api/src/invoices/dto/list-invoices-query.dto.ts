import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const INVOICE_STATUSES = [
  'DRAFT',
  'SENT',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'VOID',
] as const;

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class ListInvoicesQueryDto {
  @IsOptional()
  @IsIn(INVOICE_STATUSES, {
    message:
      'Status must be DRAFT, SENT, PARTIALLY_PAID, PAID, OVERDUE, or VOID',
  })
  status?: (typeof INVOICE_STATUSES)[number];

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'Customer id must be a string' })
  @MinLength(1, { message: 'Customer id is required when provided' })
  @MaxLength(128, { message: 'Customer id must be at most 128 characters' })
  customerId?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'Job id must be a string' })
  @MinLength(1, { message: 'Job id is required when provided' })
  @MaxLength(128, { message: 'Job id must be at most 128 characters' })
  jobId?: string;
}
