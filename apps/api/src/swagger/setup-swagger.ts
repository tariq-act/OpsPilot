import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'docs';

export function isSwaggerEnabled(): boolean {
  if (process.env.SWAGGER_ENABLED === 'true') return true;
  if (process.env.SWAGGER_ENABLED === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

export function setupSwagger(app: INestApplication): void {
  if (!isSwaggerEnabled()) return;

  const port = process.env.PORT ?? '3000';
  const config = new DocumentBuilder()
    .setTitle('OpsPilot')
    .setDescription(
      'Operations tracker HTTP API. Authenticated routes require the Better Auth session cookie `better-auth.session_token`. When the API is served over HTTPS, the cookie name is `__Secure-better-auth.session_token`. Better Auth routes under `/api/auth` are not part of this document.',
    )
    .setVersion('0.0.1')
    .addServer(`http://localhost:${port}`, 'Local API')
    .addCookieAuth('better-auth.session_token', {
      type: 'apiKey',
      in: 'cookie',
      description:
        'Better Auth session cookie. Over HTTPS the name is `__Secure-better-auth.session_token`.',
    })
    .addTag('App', 'Process greeting')
    .addTag('Health', 'Process and database readiness')
    .addTag('Auth', 'Email and password signup and login')
    .addTag('Organizations', 'Business organizations and team membership')
    .addTag('Invitations', 'Accept a team invitation')
    .addTag('Customers', 'Organization customer records')
    .addTag('Service Requests', 'Customer service request intake')
    .addTag('Jobs', 'Operational jobs from accepted service requests')
    .addTag('Technicians', 'Organization technician profiles')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    customSiteTitle: 'OpsPilot API',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
