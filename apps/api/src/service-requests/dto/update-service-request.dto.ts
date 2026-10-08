import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  SERVICE_REQUEST_PRIORITIES,
  SERVICE_REQUEST_SOURCES,
} from './create-service-request.dto.js';

export const SERVICE_REQUEST_STATUSES = [
  'NEW',
  'IN_REVIEW',
  'ACCEPTED',
  'REJECTED',
  'CANCELLED',
] as const;

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function emptyToNull({ value }: { value: unknown }): unknown {
  if (value === null) return null;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export class UpdateServiceRequestDto {
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'Title must be a string' })
  @MinLength(1, { message: 'Title is required' })
  @MaxLength(200, { message: 'Title must be at most 200 characters' })
  title?: string;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString({ message: 'Description must be a string' })
  @MaxLength(5000, { message: 'Description must be at most 5000 characters' })
  description?: string | null;

  @IsOptional()
  @IsIn(SERVICE_REQUEST_PRIORITIES, {
    message: 'Priority must be LOW, MEDIUM, HIGH, or URGENT',
  })
  priority?: (typeof SERVICE_REQUEST_PRIORITIES)[number];

  @IsOptional()
  @IsIn(SERVICE_REQUEST_STATUSES, {
    message:
      'Status must be NEW, IN_REVIEW, ACCEPTED, REJECTED, or CANCELLED',
  })
  status?: (typeof SERVICE_REQUEST_STATUSES)[number];

  @IsOptional()
  @IsIn(SERVICE_REQUEST_SOURCES, {
    message:
      'Source must be PHONE, EMAIL, WEBSITE, WALK_IN, WHATSAPP, or OTHER',
  })
  source?: (typeof SERVICE_REQUEST_SOURCES)[number];

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString(
    {},
    { message: 'Preferred date must be a valid ISO date string' },
  )
  preferredDate?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString({ message: 'Preferred time must be a string' })
  @MaxLength(64, { message: 'Preferred time must be at most 64 characters' })
  preferredTime?: string | null;
}
