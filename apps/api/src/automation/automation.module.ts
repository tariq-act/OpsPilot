import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AutomationCoreModule } from './automation-core.module.js';
import { AutomationExecutorService } from './automation-executor.service.js';
import { AutomationSchedulerService } from './automation-scheduler.service.js';
import { AutomationWorkerService } from './automation-worker.service.js';

@Module({
  imports: [AutomationCoreModule, InvoicesModule, NotificationsModule],
  providers: [
    AutomationExecutorService,
    AutomationWorkerService,
    AutomationSchedulerService,
  ],
})
export class AutomationModule {}
