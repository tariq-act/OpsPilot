import { Injectable, OnModuleInit } from '@nestjs/common';
import { AutomationExecutorService } from './automation-executor.service.js';
import { AutomationQueueService } from './automation-queue.service.js';

@Injectable()
export class AutomationWorkerService implements OnModuleInit {
  constructor(
    private readonly queue: AutomationQueueService,
    private readonly executor: AutomationExecutorService,
  ) {}

  onModuleInit() {
    this.queue.registerHandler((executionId) => this.executor.run(executionId));
    void this.executor.recoverStale();
  }
}
