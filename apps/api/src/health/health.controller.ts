import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  HealthLivenessDto,
  HealthReadinessDto,
} from './dto/health-response.dto.js';

// Swagger docs START
@ApiTags('Health')
// Swagger docs END
@Controller('health')
export class HealthController {
  @Get()
  @AllowAnonymous()
  // Swagger docs START
  @ApiOperation({ summary: 'Process liveness' })
  @ApiOkResponse({ type: HealthLivenessDto })
  // Swagger docs END
  getLiveness(): HealthLivenessDto {
    return { status: 'ok' };
  }

  @Get('ready')
  @AllowAnonymous()
  // Swagger docs START
  @ApiOperation({ summary: 'Database readiness' })
  @ApiOkResponse({ type: HealthReadinessDto })
  @ApiServiceUnavailableResponse({ type: HealthReadinessDto })
  // Swagger docs END
  async getReadiness(): Promise<HealthReadinessDto> {
    try {
      await db.execute(sql`SELECT 1`);
      return { status: 'ready', database: 'connected' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        database: 'unavailable',
      });
    }
  }
}
