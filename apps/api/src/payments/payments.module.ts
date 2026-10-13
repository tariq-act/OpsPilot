import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { InvoicePaymentsController } from './invoice-payments.controller.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({
  imports: [NotificationsModule],
  controllers: [InvoicePaymentsController, PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
