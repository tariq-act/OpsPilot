import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const JOB_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function emptyToUndefined({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export class CreateJobDto {
  @Transform(trimString)
  @IsString({ message: 'Customer id is required' })
  @MinLength(1, { message: 'Customer id is required' })
  @MaxLength(128, { message: 'Customer id must be at most 128 characters' })
  customerId!: string;

  @Transform(trimString)
  @IsString({ message: 'Request id is required' })
  @MinLength(1, { message: 'Request id is required' })
  @MaxLength(128, { message: 'Request id must be at most 128 characters' })
  requestId!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Title must be a string' })
  @MinLength(1, { message: 'Title is required' })
  @MaxLength(200, { message: 'Title must be at most 200 characters' })
  title?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Description must be a string' })
  @MaxLength(5000, { message: 'Description must be at most 5000 characters' })
  description?: string;

  @IsOptional()
  @IsIn(JOB_PRIORITIES, {
    message: 'Priority must be LOW, MEDIUM, HIGH, or URGENT',
  })
  priority?: (typeof JOB_PRIORITIES)[number];

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Location must be a string' })
  @MaxLength(500, { message: 'Location must be at most 500 characters' })
  location?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Estimated duration must be an integer (minutes)' })
  @Min(1, { message: 'Estimated duration must be at least 1 minute' })
  @Max(10080, {
    message: 'Estimated duration must be at most 10080 minutes (7 days)',
  })
  estimatedDuration?: number;
}
