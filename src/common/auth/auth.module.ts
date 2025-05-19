import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { WsJwtGuard } from './guard/ws-jwt.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        // JWT 발급용 비밀키(PRIVATE) 대신, Auth 서버 공개키로만 검증
        secret: cfg.get<string>('AUTH_PUBLIC_KEY_PEM'),
        // 검증 시 RS256만 허용
        verifyOptions: { algorithms: ['RS256'] },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [JwtStrategy, JwtAuthGuard, WsJwtGuard],
  exports: [JwtAuthGuard, WsJwtGuard],
})
export class AuthModule {}
