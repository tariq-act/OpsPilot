import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const FOLLOW_UP_STATUSES = [
  'PENDING',
  'SCHEDULED',
  'COMPLETED',
  'CANCELLED',
] as const;

function emptyToUndefined({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export class UpdateFollowUpDto {
  @IsOptional()
  @IsIn(FOLLOW_UP_STATUSES, {
    message: 'Status must be PENDING, SCHEDULED, COMPLETED, or CANCELLED',
  })
  status?: (typeof FOLLOW_UP_STATUSES)[number];

  @IsOptional()
  @IsDateString({}, { message: 'dueAt must be a valid ISO date string' })
  dueAt?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(2000, { message: 'Notes must be at most 2000 characters' })
  notes?: string | null;
}
