import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ApiErrorDto } from './api-error.dto.js';

// Swagger docs START
/**
 * Swagger docs only: describes the session cookie and the 401 response.
 * This decorator does not authenticate requests. The Better Auth guard does.
 */
export function ApiSession() {
  return applyDecorators(
    ApiCookieAuth(),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid session cookie',
      type: ApiErrorDto,
    }),
  );
}
// Swagger docs END
