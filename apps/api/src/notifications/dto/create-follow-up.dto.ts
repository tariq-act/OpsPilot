import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const FOLLOW_UP_TYPES = ['FEEDBACK', 'MAINTENANCE_REMINDER'] as const;

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function emptyToUndefined({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export class CreateFollowUpDto {
  @Transform(trimString)
  @IsString({ message: 'Customer id is required' })
  @MinLength(1, { message: 'Customer id is required' })
  @MaxLength(128, { message: 'Customer id must be at most 128 characters' })
  customerId!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Job id must be a string' })
  @MinLength(1, { message: 'Job id is required when provided' })
  @MaxLength(128, { message: 'Job id must be at most 128 characters' })
  jobId?: string;

  @IsIn(FOLLOW_UP_TYPES, {
    message: 'Type must be FEEDBACK or MAINTENANCE_REMINDER',
  })
  type!: (typeof FOLLOW_UP_TYPES)[number];

  @IsDateString({}, { message: 'dueAt must be a valid ISO date string' })
  dueAt!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(2000, { message: 'Notes must be at most 2000 characters' })
  notes?: string;
}
