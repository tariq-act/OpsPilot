import { Module } from '@nestjs/common';
import { AutomationController } from './automation.controller.js';
import { AutomationIngressService } from './automation-ingress.service.js';
import { AutomationQueueService } from './automation-queue.service.js';
import { AutomationRulesService } from './automation-rules.service.js';

/**
 * Rule storage and event intake. Domain modules import this module.
 * It does not import invoices or notifications, so those modules can call in
 * without a circular dependency.
 */
@Module({
  controllers: [AutomationController],
  providers: [
    AutomationQueueService,
    AutomationIngressService,
    AutomationRulesService,
  ],
  exports: [AutomationIngressService, AutomationQueueService],
})
export class AutomationCoreModule {}
