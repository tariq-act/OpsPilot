import {
  BadRequestException,
  createParamDecorator,
  type ExecutionContext,
} from '@nestjs/common';

/**
 * Reads the required `x-organization-id` header.
 * Org is never taken from the request body; the service still checks membership.
 */
export const OrganizationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();

    const header = request.headers['x-organization-id'];
    const organizationId = Array.isArray(header) ? header[0] : header;

    if (!organizationId?.trim()) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'x-organization-id header is required',
        error: 'Bad Request',
      });
    }

    return organizationId.trim();
  },
);
