import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { StreamModule } from './domain/stream/stream.module';
import { StreamTagModule } from './domain/stream-tag/stream-tag.module';
import { AuthModule } from './common/auth/auth.module';
import { StreamsGateway } from './common/rtc/streams/streams.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: `.${process.env.NODE_ENV}.env`,
    }),
    PrismaModule,
    StreamModule,
    StreamTagModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, StreamsGateway],
})
export class AppModule {}
