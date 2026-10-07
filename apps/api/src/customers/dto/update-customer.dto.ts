import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function emptyToNull({ value }: { value: unknown }): unknown {
  if (value === null) return null;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export class UpdateCustomerDto {
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'Name must be a string' })
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(200, { message: 'Name must be at most 200 characters' })
  name?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'Phone must be a string' })
  @MinLength(1, { message: 'Phone is required' })
  @MaxLength(32, { message: 'Phone must be at most 32 characters' })
  phone?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === null) return null;
    if (typeof value !== 'string') return value;
    const trimmed = value.trim().toLowerCase();
    return trimmed.length === 0 ? null : trimmed;
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @MaxLength(255, { message: 'Email must be at most 255 characters' })
  email?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString({ message: 'Address must be a string' })
  @MaxLength(500, { message: 'Address must be at most 500 characters' })
  address?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString({ message: 'City must be a string' })
  @MaxLength(100, { message: 'City must be at most 100 characters' })
  city?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString({ message: 'State must be a string' })
  @MaxLength(100, { message: 'State must be at most 100 characters' })
  state?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString({ message: 'Postal code must be a string' })
  @MaxLength(32, { message: 'Postal code must be at most 32 characters' })
  postalCode?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(2000, { message: 'Notes must be at most 2000 characters' })
  notes?: string | null;
}
