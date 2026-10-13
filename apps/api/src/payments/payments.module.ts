import { Module } from '@nestjs/common';
import { AutomationCoreModule } from '../automation/automation-core.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { InvoicePaymentsController } from './invoice-payments.controller.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({
  imports: [NotificationsModule, AutomationCoreModule],
  controllers: [InvoicePaymentsController, PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
