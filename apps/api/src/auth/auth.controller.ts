import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { SignUpDto } from './dto/signup.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @AllowAnonymous()
  @HttpCode(201)
  async signUp(
    @Body() body: SignUpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.signUp(body, req, res);
  }
}
