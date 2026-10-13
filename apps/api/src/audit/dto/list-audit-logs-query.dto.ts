import { Type } from 'class-transformer';
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
  Validate,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit.actions.js';

@ValidatorConstraint({ name: 'auditDateRangeOrder', async: false })
export class AuditDateRangeOrderConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as { fromDate?: string; toDate?: string };
    if (!dto.fromDate || !dto.toDate) return true;
    return new Date(dto.fromDate).getTime() <= new Date(dto.toDate).getTime();
  }

  defaultMessage(): string {
    return 'fromDate must be before or equal to toDate';
  }
}

export class ListAuditLogsQueryDto {
  @Validate(AuditDateRangeOrderConstraint)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  actorUserId?: string;

  @IsOptional()
  @IsIn(AUDIT_ACTIONS, { message: 'Invalid audit action' })
  action?: (typeof AUDIT_ACTIONS)[number];

  @IsOptional()
  @IsIn(AUDIT_ENTITY_TYPES, { message: 'Invalid entity type' })
  entityType?: (typeof AUDIT_ENTITY_TYPES)[number];

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  entityId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'fromDate must be a valid ISO date string' })
  fromDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'toDate must be a valid ISO date string' })
  toDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be a whole number' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit must be at most 100' })
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'offset must be a whole number' })
  @Min(0, { message: 'offset must be at least 0' })
  @Max(10000, { message: 'offset must be at most 10000' })
  offset?: number;
}
