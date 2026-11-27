import { IsIn, ValidateIf } from 'class-validator';
import { INVITABLE_ROLES } from '../../db/queries/members.js';

const MEMBER_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;

export class UpdateMemberDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(INVITABLE_ROLES, {
    message: 'Role must be ADMIN, DISPATCHER, or TECHNICIAN',
  })
  role?: (typeof INVITABLE_ROLES)[number];

  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(MEMBER_STATUSES, {
    message: 'Status must be ACTIVE or SUSPENDED',
  })
  status?: (typeof MEMBER_STATUSES)[number];
}
