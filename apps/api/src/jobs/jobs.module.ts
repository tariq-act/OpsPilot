import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { JobsController } from './jobs.controller.js';
import { JobsService } from './jobs.service.js';

@Module({
  imports: [StorageModule, NotificationsModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
