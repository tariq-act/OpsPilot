import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Request, Response } from 'express';
import { ApiErrorDto } from '../swagger/api-error.dto.js';
import { AuthService } from './auth.service.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { SignUpDto } from './dto/signup.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @AllowAnonymous()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create an account',
    description:
      'Creates the user and sets the Better Auth session cookie on the response.',
  })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiConflictResponse({
    description: 'Email already registered',
    type: ApiErrorDto,
  })
  @ApiInternalServerErrorResponse({ type: ApiErrorDto })
  async signUp(
    @Body() body: SignUpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.authService.signUp(body, req, res);
  }

  @Post('login')
  @AllowAnonymous()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Sign in',
    description:
      'Checks email and password and sets the Better Auth session cookie on the response.',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiUnauthorizedResponse({
    description: 'Invalid email or password',
    type: ApiErrorDto,
  })
  @ApiInternalServerErrorResponse({ type: ApiErrorDto })
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.authService.login(body, req, res);
  }
}
