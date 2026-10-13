import { Module } from '@nestjs/common';
import { AutomationCoreModule } from '../automation/automation-core.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { InvoicesController } from './invoices.controller.js';
import { InvoicesService } from './invoices.service.js';

@Module({
  imports: [NotificationsModule, AutomationCoreModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
