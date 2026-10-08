import { Module } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { AuthModule } from './auth/auth.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HealthModule } from './health/health.module.js';
import { auth } from './lib/auth.js';
import { CustomersModule } from './customers/customers.module.js';
import { OrganizationsModule } from './organizations/organizations.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { ServiceRequestsModule } from './service-requests/service-requests.module.js';

@Module({
  imports: [
    BetterAuthModule.forRoot({
      auth,
    }),
    AuthModule,
    OrganizationsModule,
    CustomersModule,
    ServiceRequestsModule,
    JobsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
