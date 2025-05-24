import { NestFactory, Reflector } from '@nestjs/core';
import {
  ClassSerializerInterceptor,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { CorsMiddleware } from './common/middleware/cors.middleware';
import { JwtService } from '@nestjs/jwt';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { wsAuthMiddleware } from './common/middleware/ws-auth.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(new CorsMiddleware().use);
  app.setGlobalPrefix('api');

  // --- WebSocket 핸드셰이크 인증 미들웨어 등록 시작 ---
  // const jwtService = app.get(JwtService);
  // const configService = app.get(ConfigService);
  // app.useWebSocketAdapter(
  //   new (class extends IoAdapter {
  //     createIOServer(port: number, options?: any) {
  //       const server = super.createIOServer(port, options);
  //       server.use(wsAuthMiddleware(jwtService, configService));
  //       return server;
  //     }
  //   })(app),
  // );

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

  await app.listen(Number(portEnv));
  console.log(`start!`);
  Logger.log(
    `🚀 SSAFITV server is running on http://localhost:${portEnv}/api`,
    'Bootstrap',
  );
}
bootstrap();
