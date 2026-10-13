import { Module } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { AutomationModule } from './automation/automation.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HealthModule } from './health/health.module.js';
import { auth } from './lib/auth.js';
import { CustomersModule } from './customers/customers.module.js';
import { InvoicesModule } from './invoices/invoices.module.js';
import { OrganizationsModule } from './organizations/organizations.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { ServiceRequestsModule } from './service-requests/service-requests.module.js';
import { StorageModule } from './storage/storage.module.js';
import { TechniciansModule } from './technicians/technicians.module.js';

@Module({
  imports: [
    BetterAuthModule.forRoot({
      auth,
    }),
    AuthModule,
    StorageModule,
    OrganizationsModule,
    CustomersModule,
    ServiceRequestsModule,
    JobsModule,
    TechniciansModule,
    InvoicesModule,
    PaymentsModule,
    NotificationsModule,
    AutomationModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
