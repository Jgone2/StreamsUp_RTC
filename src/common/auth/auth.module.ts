import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwksClient } from 'jwks-rsa';
import { JwtStrategy } from './jwt.strategy';
import type { JwtSecretRequestType } from 'passport-jwt';
import type { Algorithm } from 'jsonwebtoken';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => {
        const jwksUri = config.get<string>('JWKS_URI');
        // 여기서 Algorithm 제네릭을 써서 반환 타입을 Algorithm 으로 고정
        const algorithm = config.get<Algorithm>('JWT_ALGORITHM', 'HS256');

        if (jwksUri) {
          const jwks = new JwksClient({
            jwksUri,
            cache: true,
            cacheMaxEntries: 5,
            cacheMaxAge: 600_000,
          });
          return {
            verifyOptions: { algorithms: [algorithm] },
            secretOrKeyProvider: async (
              _req: JwtSecretRequestType,
              rawJwtToken: string | Buffer,
            ): Promise<string> => {
              const headerSegment = rawJwtToken.toString().split('.')[0];
              let header: { kid: string };
              try {
                header = JSON.parse(
                  Buffer.from(headerSegment, 'base64').toString(),
                );
              } catch (err: any) {
                throw new Error(`잘못된 JWT 헤더: ${err.message}`);
              }
              const key = await jwks.getSigningKey(header.kid);
              return key.getPublicKey();
            },
          };
        } else {
          const secret = config.get<string>('JWT_SECRET_BASE64');
          return {
            secret,
            signOptions: { algorithm },
            verifyOptions: { algorithms: [algorithm] },
          };
        }
      },
    }),
  ],
  providers: [JwtStrategy],
})
export class AuthModule {}