import { Transform } from 'class-transformer';
import { IsEmail, IsIn, MaxLength } from 'class-validator';
import { INVITABLE_ROLES } from '../../db/queries/members.js';

export class CreateInvitationDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @MaxLength(255, { message: 'Email must be at most 255 characters' })
  email!: string;

  @IsIn(INVITABLE_ROLES, {
    message: 'Role must be ADMIN, DISPATCHER, or TECHNICIAN',
  })
  role!: (typeof INVITABLE_ROLES)[number];
}
