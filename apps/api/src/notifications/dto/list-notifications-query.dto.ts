import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const NOTIFICATION_EVENT_TYPES = [
  'JOB_SCHEDULED',
  'JOB_RESCHEDULED',
  'TECHNICIAN_ASSIGNED',
  'JOB_COMPLETED',
  'INVOICE_SENT',
  'PAYMENT_CONFIRMED',
] as const;

export const NOTIFICATION_CHANNELS = ['EMAIL', 'SMS', 'WHATSAPP'] as const;

export const NOTIFICATION_STATUSES = [
  'PENDING',
  'PROCESSING',
  'SENT',
  'FAILED',
] as const;

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class ListNotificationsQueryDto {
  @IsOptional()
  @IsIn(NOTIFICATION_STATUSES, {
    message: 'Status must be PENDING, PROCESSING, SENT, or FAILED',
  })
  status?: (typeof NOTIFICATION_STATUSES)[number];

  @IsOptional()
  @IsIn(NOTIFICATION_EVENT_TYPES, {
    message: 'Invalid event type',
  })
  eventType?: (typeof NOTIFICATION_EVENT_TYPES)[number];

  @IsOptional()
  @IsIn(NOTIFICATION_CHANNELS, {
    message: 'Channel must be EMAIL, SMS, or WHATSAPP',
  })
  channel?: (typeof NOTIFICATION_CHANNELS)[number];

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'Customer id must be a string' })
  @MinLength(1, { message: 'Customer id is required when provided' })
  @MaxLength(128, { message: 'Customer id must be at most 128 characters' })
  customerId?: string;
}
