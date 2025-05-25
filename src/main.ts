import { NestFactory, Reflector } from '@nestjs/core';
import {
  ClassSerializerInterceptor,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { CorsMiddleware } from './common/middleware/cors.middleware';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(new CorsMiddleware().use);
  app.setGlobalPrefix('api');

  // Redis 연결 설정
  const redisHost = process.env.REDIS_HOST || 'redis';
  const redisPort = Number(process.env.REDIS_PORT || '6379');
  const redisPass = process.env.REDIS_PASSWORD;
  const pubClient = createClient({
    socket: { host: redisHost, port: redisPort },
    password: redisPass,
  });
  const subClient = pubClient.duplicate();
  await pubClient.connect();
  await subClient.connect();
  const redisAdapter = createAdapter(pubClient, subClient);

  app.useWebSocketAdapter(
    new (class extends IoAdapter {
      createIOServer(port: number, options?: any) {
        const server = super.createIOServer(port, options);
        server.adapter(redisAdapter);
        return server;
      }
    })(app),
  );

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
