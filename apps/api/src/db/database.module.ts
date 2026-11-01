import { Global, Module } from '@nestjs/common';
import { DatabaseLifecycleService } from './database-lifecycle.service.js';

@Global()
@Module({
  providers: [DatabaseLifecycleService],
  exports: [DatabaseLifecycleService],
})
export class DatabaseModule {}
