import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class AssignTechniciansDto {
  @IsArray({ message: 'technicianIds must be an array' })
  @ArrayMinSize(1, { message: 'At least one technician id is required' })
  @ArrayMaxSize(50, { message: 'At most 50 technicians can be assigned at once' })
  @ArrayUnique({ message: 'technicianIds must be unique' })
  @IsString({ each: true, message: 'Each technician id must be a string' })
  @MinLength(1, {
    each: true,
    message: 'Each technician id is required',
  })
  @MaxLength(128, {
    each: true,
    message: 'Each technician id must be at most 128 characters',
  })
  @Transform(({ value }: { value: unknown }) => {
    if (!Array.isArray(value)) return value;
    return value.map((item) =>
      typeof item === 'string' ? item.trim() : item,
    );
  })
  technicianIds!: string[];

  /**
   * When true, skip overlap conflict checks for these assignments.
   * Default false: overlapping active assignments for a technician are rejected.
   */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'allowOverlap must be a boolean' })
  allowOverlap?: boolean;
}

export class ReassignTechnicianDto {
  @Transform(trimString)
  @IsString({ message: 'technicianId is required' })
  @MinLength(1, { message: 'technicianId is required' })
  @MaxLength(128, { message: 'technicianId must be at most 128 characters' })
  technicianId!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'allowOverlap must be a boolean' })
  allowOverlap?: boolean;
}
