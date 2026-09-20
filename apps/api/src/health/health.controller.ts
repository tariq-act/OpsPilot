import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';

@Controller('health')
export class HealthController {
  @Get()
  @AllowAnonymous()
  getLiveness() {
    return { status: 'ok' };
  }

  @Get('ready')
  @AllowAnonymous()
  async getReadiness() {
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
