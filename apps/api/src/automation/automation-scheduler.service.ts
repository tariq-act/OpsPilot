import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { listDueFollowUpsForAutomation } from '../db/queries/index.js';
import { AutomationExecutorService } from './automation-executor.service.js';
import { AutomationIngressService } from './automation-ingress.service.js';

const SCAN_INTERVAL_MS = 60_000;
const SCAN_BATCH = 25;

/**
 * Finds follow-ups that are due and emits FOLLOW_UP_DUE.
 * Idempotency keys stop the same follow-up from running twice.
 */
@Injectable()
export class AutomationSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AutomationSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly ingress: AutomationIngressService,
    private readonly executor: AutomationExecutorService,
  ) {}

  onModuleInit() {
    const starter = setTimeout(() => void this.tick(), 5_000);
    starter.unref();
    this.timer = setInterval(() => void this.tick(), SCAN_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.executor.recoverStale();
      const due = await listDueFollowUpsForAutomation(new Date(), SCAN_BATCH);
      for (const row of due) {
        await this.ingress.accept({
          organizationId: row.organizationId,
          triggerEvent: 'FOLLOW_UP_DUE',
          eventId: row.id,
          context: {
            customerId: row.customerId,
            jobId: row.jobId,
            followUpId: row.id,
            followUpType: row.type,
          },
        });
      }
    } catch {
      this.logger.warn('Automation follow-up scan failed');
    } finally {
      this.running = false;
    }
  }
}
