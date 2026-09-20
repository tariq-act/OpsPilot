import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { resolveWebOrigin } from './lib/web-origin.js';

const envFile = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Required so Better Auth can read the raw request body.
    // @thallesp/nestjs-better-auth re-adds parsers for non-auth routes.
    bodyParser: false,
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
    origin: resolveWebOrigin(),
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
