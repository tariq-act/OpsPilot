import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function emptyToUndefined({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export class CompleteJobDto {
  @Transform(trimString)
  @IsString({ message: 'Completion summary is required' })
  @MinLength(1, { message: 'Completion summary is required' })
  @MaxLength(5000, {
    message: 'Completion summary must be at most 5000 characters',
  })
  completionSummary!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Note must be a string' })
  @MinLength(1, { message: 'Note is required when provided' })
  @MaxLength(5000, { message: 'Note must be at most 5000 characters' })
  note?: string;
}
