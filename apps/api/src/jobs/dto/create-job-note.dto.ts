import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateJobNoteDto {
  @Transform(trimString)
  @IsString({ message: 'Note body is required' })
  @MinLength(1, { message: 'Note body is required' })
  @MaxLength(5000, { message: 'Note body must be at most 5000 characters' })
  body!: string;
}
