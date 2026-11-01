import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { loadApiEnv } from './lib/env.js';
import { setupSwagger } from './swagger/setup-swagger.js';

const envFile = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

async function bootstrap() {
  const env = loadApiEnv();
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    // Required so Better Auth can read the raw request body.
    // @thallesp/nestjs-better-auth re-adds parsers for non-auth routes.
    bodyParser: false,
    logger: env.isProduction
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.enableCors({
    origin: env.webOrigin,
    credentials: true,
  });

  // Close DB pool and in-flight work on SIGTERM/SIGINT (deploy platforms).
  app.enableShutdownHooks();

  setupSwagger(app);

  await app.listen(env.port);
  logger.log(
    `API listening on port ${env.port} (NODE_ENV=${env.nodeEnv}, webOrigin=${env.webOrigin})`,
  );
}
await bootstrap();
