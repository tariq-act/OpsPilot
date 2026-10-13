import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

type ExecutionHandler = (executionId: string) => Promise<void>;

/**
 * In-process FIFO queue for automation executions.
 * BullMQ is not configured in this API. This matches NotificationQueueService
 * so a later queue swap does not change rule or action call sites.
 */
@Injectable()
export class AutomationQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(AutomationQueueService.name);
  private readonly queue: string[] = [];
  private readonly queued = new Set<string>();
  private readonly timers = new Set<NodeJS.Timeout>();
  private handler: ExecutionHandler | null = null;
  private draining = false;
  private stopped = false;

  onModuleDestroy() {
    this.stop();
  }

  stop(): void {
    this.stopped = true;
    this.queue.length = 0;
    this.queued.clear();
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
  }

  registerHandler(handler: ExecutionHandler): void {
    this.handler = handler;
    void this.drain();
  }

  enqueue(executionId: string, delayMs = 0): void {
    if (this.stopped) return;
    if (this.queued.has(executionId)) return;
    this.queued.add(executionId);

    if (delayMs > 0) {
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        if (this.stopped) return;
        this.queue.push(executionId);
        void this.drain();
      }, delayMs);
      timer.unref();
      this.timers.add(timer);
      return;
    }

    this.queue.push(executionId);
    void this.drain();
  }

  private async drain(): Promise<void> {
    if (this.draining || this.stopped || this.handler === null) return;
    this.draining = true;
    const handler = this.handler;

    try {
      while (this.queue.length > 0 && !this.stopped) {
        const executionId = this.queue.shift();
        if (!executionId) continue;
        this.queued.delete(executionId);
        try {
          await handler(executionId);
        } catch {
          this.logger.warn(
            `Automation queue handler failed execution=${executionId}`,
          );
        }
      }
    } finally {
      this.draining = false;
      if (this.queue.length > 0 && !this.stopped && this.handler !== null) {
        void this.drain();
      }
    }
  }
}
