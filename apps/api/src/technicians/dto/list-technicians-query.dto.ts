import { IsIn, IsOptional } from 'class-validator';
import { TECHNICIAN_STATUSES } from './update-technician.dto.js';

export class ListTechniciansQueryDto {
  @IsOptional()
  @IsIn(TECHNICIAN_STATUSES, {
    message: 'Status must be ACTIVE, INACTIVE, or SUSPENDED',
  })
  status?: (typeof TECHNICIAN_STATUSES)[number];
}
