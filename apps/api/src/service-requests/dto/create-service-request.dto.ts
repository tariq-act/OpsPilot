import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const SERVICE_REQUEST_PRIORITIES = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
] as const;

export const SERVICE_REQUEST_SOURCES = [
  'PHONE',
  'EMAIL',
  'WEBSITE',
  'WALK_IN',
  'WHATSAPP',
  'OTHER',
] as const;

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function emptyToUndefined({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export class CreateServiceRequestDto {
  @Transform(trimString)
  @IsString({ message: 'Customer id is required' })
  @MinLength(1, { message: 'Customer id is required' })
  @MaxLength(128, { message: 'Customer id must be at most 128 characters' })
  customerId!: string;

  @Transform(trimString)
  @IsString({ message: 'Title is required' })
  @MinLength(1, { message: 'Title is required' })
  @MaxLength(200, { message: 'Title must be at most 200 characters' })
  title!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Description must be a string' })
  @MaxLength(5000, { message: 'Description must be at most 5000 characters' })
  description?: string;

  @IsOptional()
  @IsIn(SERVICE_REQUEST_PRIORITIES, {
    message: 'Priority must be LOW, MEDIUM, HIGH, or URGENT',
  })
  priority?: (typeof SERVICE_REQUEST_PRIORITIES)[number];

  @IsOptional()
  @IsIn(SERVICE_REQUEST_SOURCES, {
    message:
      'Source must be PHONE, EMAIL, WEBSITE, WALK_IN, WHATSAPP, or OTHER',
  })
  source?: (typeof SERVICE_REQUEST_SOURCES)[number];

  @IsOptional()
  @IsDateString(
    {},
    { message: 'Preferred date must be a valid ISO date string' },
  )
  preferredDate?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Preferred time must be a string' })
  @MaxLength(64, { message: 'Preferred time must be at most 64 characters' })
  preferredTime?: string;
}
