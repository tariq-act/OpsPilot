import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import {
  AUTH_NAME_MAX_LENGTH,
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
} from '../auth.constants.js';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class SignUpDto {
  @Transform(trimString)
  @IsString({ message: 'Name is required' })
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(AUTH_NAME_MAX_LENGTH, {
    message: `Name must be at most ${AUTH_NAME_MAX_LENGTH} characters`,
  })
  name!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @MaxLength(255, { message: 'Email must be at most 255 characters' })
  email!: string;

  @ApiProperty({ format: 'password' })
  @IsString({ message: 'Password is required' })
  @MinLength(AUTH_PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${AUTH_PASSWORD_MIN_LENGTH} characters`,
  })
  @MaxLength(AUTH_PASSWORD_MAX_LENGTH, {
    message: `Password must be at most ${AUTH_PASSWORD_MAX_LENGTH} characters`,
  })
  password!: string;
}
