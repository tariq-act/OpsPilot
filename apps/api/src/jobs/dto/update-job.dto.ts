import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { JOB_PRIORITIES } from './create-job.dto.js';

export const JOB_STATUSES = [
  'DRAFT',
  'CONFIRMED',
  'EN_ROUTE',
  'ARRIVED',
  'IN_PROGRESS',
  'COMPLETED',
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

export class UpdateJobDto {
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
  @IsIn(JOB_PRIORITIES, {
    message: 'Priority must be LOW, MEDIUM, HIGH, or URGENT',
  })
  priority?: (typeof JOB_PRIORITIES)[number];

  @IsOptional()
  @IsIn(JOB_STATUSES, {
    message:
      'Status must be DRAFT, CONFIRMED, EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETED, or CANCELLED',
  })
  status?: (typeof JOB_STATUSES)[number];

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString({ message: 'Location must be a string' })
  @MaxLength(500, { message: 'Location must be at most 500 characters' })
  location?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt({ message: 'Estimated duration must be an integer (minutes)' })
  @Min(1, { message: 'Estimated duration must be at least 1 minute' })
  @Max(10080, {
    message: 'Estimated duration must be at most 10080 minutes (7 days)',
  })
  estimatedDuration?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString({}, { message: 'actualStart must be a valid ISO date string' })
  actualStart?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString({}, { message: 'actualEnd must be a valid ISO date string' })
  actualEnd?: string | null;
}
