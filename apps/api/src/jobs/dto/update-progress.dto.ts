import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EXECUTION_PROGRESS_STATUSES } from '../job-status.js';

function emptyToUndefined({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export class UpdateProgressDto {
  @IsIn(EXECUTION_PROGRESS_STATUSES, {
    message: 'Status must be EN_ROUTE, ARRIVED, or IN_PROGRESS',
  })
  status!: (typeof EXECUTION_PROGRESS_STATUSES)[number];

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Note must be a string' })
  @MinLength(1, { message: 'Note is required when provided' })
  @MaxLength(5000, { message: 'Note must be at most 5000 characters' })
  note?: string;
}
