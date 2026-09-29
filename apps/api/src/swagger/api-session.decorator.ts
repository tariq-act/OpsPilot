import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ApiErrorDto } from './api-error.dto.js';

/** Session cookie security plus the unauthenticated response. */
export function ApiSession() {
  return applyDecorators(
    ApiCookieAuth(),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid session cookie',
      type: ApiErrorDto,
    }),
  );
}
