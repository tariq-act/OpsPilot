import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

/**
 * Application auth surface (signup now; login/logout/session later).
 * Better Auth itself is registered via `@thallesp/nestjs-better-auth` in AppModule.
 */
@Module({
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
