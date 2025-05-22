import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwksClient } from 'jwks-rsa';
import { JwtStrategy } from './jwt.strategy';
import type { Algorithm } from 'jsonwebtoken';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => {
        const jwksUri = config.get<string>('JWKS_URI');
        if (jwksUri) {
          const jwks = new JwksClient({
            jwksUri,
            cache: true,
            cacheMaxEntries: 5,
            cacheMaxAge: 600_000,
          });
          return {
            secretOrKeyProvider: async (_req, rawJwtToken: string | Buffer) => {
              const token = rawJwtToken.toString();
              const [encodedHeader] = token.split('.');
              let header: { kid: string };
              try {
                header = JSON.parse(
                  Buffer.from(encodedHeader, 'base64').toString(),
                );
              } catch (err: any) {
                throw new Error(`Invalid JWT header: ${err.message}`);
              }
              const key = await jwks.getSigningKey(header.kid);
              return key.getPublicKey();
            },
            verifyOptions: { algorithms: ['RS256'] },
          };
        } else {
          const secretBase64 = config.get<string>('JWT_SECRET_BASE64');
          const secret = Buffer.from(secretBase64, 'base64').toString('utf8');
          const algorithm = config.get<Algorithm>('JWT_ALGORITHM', 'HS256');
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
  exports: [JwtModule],
})
export class AuthModule {}