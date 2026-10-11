import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CreateInvoiceItemDto } from './create-invoice.dto.js';

const MONEY_REGEX = /^\d+(\.\d{1,2})?$/;

function emptyToUndefined({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export class UpdateInvoiceDto {
  @IsOptional()
  @IsArray({ message: 'Items must be an array' })
  @ArrayMinSize(1, { message: 'At least one line item is required' })
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items?: CreateInvoiceItemDto[];

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Discount must be a string' })
  @Matches(MONEY_REGEX, {
    message: 'Discount must be a non-negative decimal with up to 2 places',
  })
  discount?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Tax must be a string' })
  @Matches(MONEY_REGEX, {
    message: 'Tax must be a non-negative decimal with up to 2 places',
  })
  tax?: string;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsDateString({}, { message: 'dueAt must be a valid ISO date string' })
  dueAt?: string | null;
}
