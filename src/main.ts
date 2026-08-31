import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { SystemConstants } from './core/constants/index.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global API route prefix
  app.setGlobalPrefix('api');

  // HTTP cookies middleware
  app.use(cookieParser());

  // Global input validation and sanitization
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS origin configuration
  const frontendUrl =
    process.env.FRONTEND_URL || SystemConstants.DEFAULT_FRONTEND_URL;
  app.enableCors({
    origin: [
      frontendUrl,
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
  });

  const port = process.env.PORT ?? SystemConstants.DEFAULT_PORT;
  await app.listen(port);
  logger.log(
    `🚀 AUREA Multi-Tenant Backend running on http://localhost:${port}/api`,
  );
}

bootstrap();
