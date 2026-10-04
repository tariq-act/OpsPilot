import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AUTH_PASSWORD_MAX_LENGTH } from '../auth.constants.js';

export class LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @MaxLength(255, { message: 'Email must be at most 255 characters' })
  email!: string;

  @ApiProperty({ format: 'password' })
  @IsString({ message: 'Password is required' })
  @MinLength(1, { message: 'Password is required' })
  @MaxLength(AUTH_PASSWORD_MAX_LENGTH, {
    message: `Password must be at most ${AUTH_PASSWORD_MAX_LENGTH} characters`,
  })
  password!: string;
}
