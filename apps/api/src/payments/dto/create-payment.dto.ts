import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export const PAYMENT_METHODS = [
  'CASH',
  'CARD',
  'BANK_TRANSFER',
  'UPI',
  'ONLINE',
  'OTHER',
] as const;

/** Manual methods may be recorded as SUCCEEDED without a payment provider. */
export const MANUAL_PAYMENT_METHODS = [
  'CASH',
  'CARD',
  'BANK_TRANSFER',
  'UPI',
  'OTHER',
] as const;

const MONEY_REGEX = /^\d+(\.\d{1,2})?$/;

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function emptyToUndefined({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export class CreatePaymentDto {
  @Transform(trimString)
  @IsString({ message: 'Amount is required' })
  @Matches(MONEY_REGEX, {
    message: 'Amount must be a non-negative decimal with up to 2 places',
  })
  amount!: string;

  @IsIn(PAYMENT_METHODS, {
    message:
      'Method must be CASH, CARD, BANK_TRANSFER, UPI, ONLINE, or OTHER',
  })
  method!: (typeof PAYMENT_METHODS)[number];

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Transaction id must be a string' })
  @MinLength(1, { message: 'Transaction id is required when provided' })
  @MaxLength(128, {
    message: 'Transaction id must be at most 128 characters',
  })
  transactionId?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Customer id must be a string' })
  @MinLength(1, { message: 'Customer id is required when provided' })
  @MaxLength(128, { message: 'Customer id must be at most 128 characters' })
  customerId?: string;
}
