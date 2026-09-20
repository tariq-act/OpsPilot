import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';
import { APIError, isAPIError } from 'better-auth/api';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request, Response } from 'express';
import type { auth } from '../lib/auth.js';
import type { LoginDto } from './dto/login.dto.js';
import type { SignUpDto } from './dto/signup.dto.js';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthResult = {
  user: AuthUser;
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

const INVALID_CREDENTIALS_CODES = new Set(['INVALID_EMAIL_OR_PASSWORD']);

type AuthAction = 'signup' | 'login';

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
  ): Promise<AuthResult> {
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
      return { user: this.toAuthUser(response.user) };
    } catch (error) {
      this.rethrowAsHttpException(error, 'signup');
    }
  }

  async login(
    dto: LoginDto,
    req: Request,
    res: Response,
  ): Promise<AuthResult> {
    try {
      const { headers, response } = await this.betterAuth.api.signInEmail({
        body: {
          email: dto.email,
          password: dto.password,
        },
        headers: fromNodeHeaders(req.headers),
        returnHeaders: true,
      });

      this.applyAuthCookies(res, headers);
      return { user: this.toAuthUser(response.user) };
    } catch (error) {
      this.rethrowAsHttpException(error, 'login');
    }
  }

  private toAuthUser(user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): AuthUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
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

  private rethrowAsHttpException(error: unknown, action: AuthAction): never {
    if (isAPIError(error)) {
      const code = this.getErrorCode(error);

      if (action === 'signup' && code && DUPLICATE_EMAIL_CODES.has(code)) {
        throw new ConflictException({
          statusCode: 409,
          message: 'Email already registered',
          error: 'Conflict',
        });
      }

      if (
        action === 'login' &&
        (error.statusCode === 401 ||
          (code && INVALID_CREDENTIALS_CODES.has(code)))
      ) {
        throw new UnauthorizedException({
          statusCode: 401,
          message: 'Invalid email or password',
          error: 'Unauthorized',
        });
      }

      if (
        (code && CLIENT_VALIDATION_CODES.has(code)) ||
        error.statusCode === 400
      ) {
        throw new BadRequestException({
          statusCode: 400,
          message: this.safeClientMessage(code, action),
          error: 'Bad Request',
        });
      }

      this.logger.error(
        `Better Auth ${action} failed (${error.statusCode}${code ? ` ${code}` : ''})`,
      );
      throw new InternalServerErrorException({
        statusCode: 500,
        message:
          action === 'signup'
            ? 'Unable to create account'
            : 'Unable to sign in',
        error: 'Internal Server Error',
      });
    }

    this.logger.error(`Unexpected ${action} failure`);
    throw new InternalServerErrorException({
      statusCode: 500,
      message:
        action === 'signup' ? 'Unable to create account' : 'Unable to sign in',
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

  private safeClientMessage(
    code: string | undefined,
    action: AuthAction,
  ): string {
    switch (code) {
      case 'INVALID_EMAIL':
        return 'Email must be a valid email address';
      case 'INVALID_PASSWORD':
      case 'PASSWORD_TOO_SHORT':
        return action === 'signup'
          ? 'Password does not meet security requirements'
          : 'Invalid email or password';
      case 'PASSWORD_TOO_LONG':
        return action === 'signup'
          ? 'Password is too long'
          : 'Invalid email or password';
      default:
        return action === 'signup'
          ? 'Invalid signup request'
          : 'Invalid login request';
    }
  }
}
