import { NestFactory, Reflector } from '@nestjs/core';
import {
  ClassSerializerInterceptor,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    logger: ['debug', 'error', 'warn', 'log'],
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  // ConfigService로 PORT 가져오기 (없으면 3000)
  const config = app.get(ConfigService);
  const port = Number(config.get('PORT', 3000));

  await app.listen(port, '0.0.0.0');

  Logger.log(
    `🚀 SSAFITV server is running on http://localhost:${port}/api`,
    'Bootstrap',
  );
}

bootstrap();
