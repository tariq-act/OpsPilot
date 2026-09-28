import { IsIn, IsOptional } from 'class-validator';
import { INVITABLE_ROLES } from '../../db/queries/members.js';

const MEMBER_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;

export class UpdateMemberDto {
  @IsOptional()
  @IsIn(INVITABLE_ROLES, {
    message: 'Role must be ADMIN, DISPATCHER, or TECHNICIAN',
  })
  role?: (typeof INVITABLE_ROLES)[number];

  @IsOptional()
  @IsIn(MEMBER_STATUSES, {
    message: 'Status must be ACTIVE or SUSPENDED',
  })
  status?: (typeof MEMBER_STATUSES)[number];
}
