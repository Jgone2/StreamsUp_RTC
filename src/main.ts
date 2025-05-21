import { NestFactory, Reflector } from '@nestjs/core';
import {
  ClassSerializerInterceptor,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // ConfigService로 PORT 가져오기 (없으면 3000)
  const config = app.get(ConfigService);
  const portEnv = config.get<string>('PORT');

  const port =
    portEnv && !Number.isNaN(Number(portEnv)) ? Number(portEnv) : 3000;
  console.log(port + ' is Possible PORT');
  await app.listen(port);
  console.log(`start!`);
  Logger.log(
    `🚀 SSAFITV server is running on http://localhost:${port}/api`,
    'Bootstrap',
  );
}

bootstrap().then(() =>
  console.log(`NestJS SSAFTIV Server Start PORT : ${process.env.PORT}`),
);
