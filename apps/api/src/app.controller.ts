import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { AppService } from './app.service.js';

// Swagger docs START
@ApiTags('App')
// Swagger docs END
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @AllowAnonymous()
  // Swagger docs START
  @ApiOperation({ summary: 'Process greeting' })
  @ApiOkResponse({
    description: 'Process is running',
    schema: { type: 'string', example: 'Hello World!' },
  })
  // Swagger docs END
  getHello(): string {
    return this.appService.getHello();
  }
}
