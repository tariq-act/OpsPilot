import { IsIn } from 'class-validator';

export const ASSIGNMENT_UPDATE_STATUSES = ['RELEASED', 'CANCELLED'] as const;

export class UpdateAssignmentDto {
  @IsIn(ASSIGNMENT_UPDATE_STATUSES, {
    message: 'Status must be RELEASED or CANCELLED',
  })
  status!: (typeof ASSIGNMENT_UPDATE_STATUSES)[number];
}
