import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { sqlClient } from './index.js';

/**
 * Closes the postgres.js pool when Nest shuts down so deploy platforms
 * can drain connections cleanly on SIGTERM/SIGINT.
 */
@Injectable()
export class DatabaseLifecycleService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseLifecycleService.name);

  async onModuleDestroy(): Promise<void> {
    try {
      await sqlClient.end({ timeout: 5 });
      this.logger.log('Database connection pool closed');
    } catch (error) {
      this.logger.warn(
        `Failed to close database pool cleanly: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
