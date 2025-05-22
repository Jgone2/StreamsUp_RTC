import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { StreamModule } from './domain/stream/stream.module';
import { StreamTagModule } from './domain/stream-tag/stream-tag.module';
import { AuthModule } from './common/auth/auth.module';
import { HttpModule } from './common/http/http.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: `.${process.env.NODE_ENV}.env`,
    }),
    PrismaModule,
    HttpModule,
    AuthModule,
    StreamModule,
    StreamTagModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
