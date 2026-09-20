import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';
import { APIError, isAPIError } from 'better-auth/api';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request, Response } from 'express';
import type { auth } from '../lib/auth.js';
import type { SignUpDto } from './dto/signup.dto.js';

export type SignUpUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SignUpResult = {
  user: SignUpUser;
};

const DUPLICATE_EMAIL_CODES = new Set([
  'USER_ALREADY_EXISTS',
  'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
]);

const CLIENT_VALIDATION_CODES = new Set([
  'INVALID_EMAIL',
  'INVALID_PASSWORD',
  'PASSWORD_TOO_SHORT',
  'PASSWORD_TOO_LONG',
]);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly betterAuth: BetterAuthService<typeof auth>,
  ) {}

  async signUp(
    dto: SignUpDto,
    req: Request,
    res: Response,
  ): Promise<SignUpResult> {
    try {
      const { headers, response } = await this.betterAuth.api.signUpEmail({
        body: {
          name: dto.name,
          email: dto.email,
          password: dto.password,
        },
        headers: fromNodeHeaders(req.headers),
        returnHeaders: true,
      });

      this.applyAuthCookies(res, headers);

      return {
        user: {
          id: response.user.id,
          name: response.user.name,
          email: response.user.email,
          emailVerified: response.user.emailVerified,
          image: response.user.image ?? null,
          createdAt: response.user.createdAt,
          updatedAt: response.user.updatedAt,
        },
      };
    } catch (error) {
      this.rethrowAsHttpException(error);
    }
  }

  private applyAuthCookies(res: Response, headers: Headers): void {
    const setCookies =
      typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [];

    if (setCookies.length > 0) {
      for (const cookie of setCookies) {
        res.append('Set-Cookie', cookie);
      }
      return;
    }

    const single = headers.get('set-cookie');
    if (single) {
      res.append('Set-Cookie', single);
    }
  }

  private rethrowAsHttpException(error: unknown): never {
    if (isAPIError(error)) {
      const code = this.getErrorCode(error);

      if (code && DUPLICATE_EMAIL_CODES.has(code)) {
        throw new ConflictException({
          statusCode: 409,
          message: 'Email already registered',
          error: 'Conflict',
        });
      }

      if (
        (code && CLIENT_VALIDATION_CODES.has(code)) ||
        error.statusCode === 400
      ) {
        throw new BadRequestException({
          statusCode: 400,
          message: this.safeClientMessage(error, code),
          error: 'Bad Request',
        });
      }

      this.logger.error(
        `Better Auth signup failed (${error.statusCode}${code ? ` ${code}` : ''})`,
      );
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Unable to create account',
        error: 'Internal Server Error',
      });
    }

    this.logger.error('Unexpected signup failure');
    throw new InternalServerErrorException({
      statusCode: 500,
      message: 'Unable to create account',
      error: 'Internal Server Error',
    });
  }

  private getErrorCode(error: APIError): string | undefined {
    const body = error.body;
    if (body && typeof body === 'object' && 'code' in body) {
      const code = (body as { code?: unknown }).code;
      return typeof code === 'string' ? code : undefined;
    }
    return undefined;
  }

  private safeClientMessage(_error: APIError, code: string | undefined): string {
    switch (code) {
      case 'INVALID_EMAIL':
        return 'Email must be a valid email address';
      case 'INVALID_PASSWORD':
      case 'PASSWORD_TOO_SHORT':
        return 'Password does not meet security requirements';
      case 'PASSWORD_TOO_LONG':
        return 'Password is too long';
      default:
        return 'Invalid signup request';
    }
  }
}
