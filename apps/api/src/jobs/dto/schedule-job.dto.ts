import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

function emptyToUndefined({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export class ScheduleJobDto {
  @IsDateString(
    {},
    { message: 'scheduledStart must be a valid ISO date string' },
  )
  scheduledStart!: string;

  @IsDateString({}, { message: 'scheduledEnd must be a valid ISO date string' })
  scheduledEnd!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Location must be a string' })
  @MinLength(1, { message: 'Location is required when provided' })
  @MaxLength(500, { message: 'Location must be at most 500 characters' })
  location?: string;

  /**
   * When true, skip overlap checks against other jobs for currently assigned
   * technicians (used on reschedule). Default false.
   */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'allowOverlap must be a boolean' })
  allowOverlap?: boolean;
}
