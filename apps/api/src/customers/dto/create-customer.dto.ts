import { Transform } from 'class-transformer';
import {
  IsEmail,
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

export class CreateCustomerDto {
  @Transform(trimString)
  @IsString({ message: 'Name is required' })
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(200, { message: 'Name must be at most 200 characters' })
  name!: string;

  @Transform(trimString)
  @IsString({ message: 'Phone is required' })
  @MinLength(1, { message: 'Phone is required' })
  @MaxLength(32, { message: 'Phone must be at most 32 characters' })
  phone!: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value !== 'string') return value;
    const trimmed = value.trim().toLowerCase();
    return trimmed.length === 0 ? undefined : trimmed;
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @MaxLength(255, { message: 'Email must be at most 255 characters' })
  email?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Address must be a string' })
  @MaxLength(500, { message: 'Address must be at most 500 characters' })
  address?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'City must be a string' })
  @MaxLength(100, { message: 'City must be at most 100 characters' })
  city?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'State must be a string' })
  @MaxLength(100, { message: 'State must be at most 100 characters' })
  state?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Postal code must be a string' })
  @MaxLength(32, { message: 'Postal code must be at most 32 characters' })
  postalCode?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(2000, { message: 'Notes must be at most 2000 characters' })
  notes?: string;
}
