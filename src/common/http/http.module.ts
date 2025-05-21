import { Module } from '@nestjs/common';
import { HttpModule as NestHttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    NestHttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        baseURL: config.get<string>('AUTH_SERVER_URL'), // .env에 설정
        timeout: 5000,
      }),
    }),
  ],
  exports: [NestHttpModule],
})
export class HttpModule {}
