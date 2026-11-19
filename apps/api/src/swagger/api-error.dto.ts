import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorDto {
  // Swagger docs START
  @ApiProperty({ example: 400 })
  // Swagger docs END
  statusCode!: number;

  // Swagger docs START
  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Invalid request',
  })
  // Swagger docs END
  message!: string | string[];

  // Swagger docs START
  @ApiProperty({ example: 'Bad Request' })
  // Swagger docs END
  error!: string;
}
