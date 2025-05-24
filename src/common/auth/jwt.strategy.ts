import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import {
  JwksClient,
  // SigningKey
} from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';

/**
 * JWKS 클라이언트 설정
 * - Auth 서버의 JWKS URI에서 공개키를 가져와 메모리 캐시
 * - cache: true 로 한 번 가져온 키를 cacheMaxAge 동안 재사용
 */
/*const jwks = new JwksClient({
  jwksUri: process.env.JWKS_URI, // ex) https://auth.example.com/.well-known/jwks.json
  cache: true,
  cacheMaxEntries: 5, // 최대 5개의 키 캐시
  cacheMaxAge: 600_000, // 10분(밀리초 단위) 캐시 유지
});*/

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const jwksUri = config.get<string>('JWKS_URI');
    const baseExtractor = ExtractJwt.fromAuthHeaderAsBearerToken();
    const jwtFromRequest = (req: Request) => {
      const token = baseExtractor(req);
      return !token || token === 'null' || token === 'undefined' ? null : token;
    };
    if (jwksUri) {
      const jwks = new JwksClient({
        jwksUri,
        cache: true,
        cacheMaxEntries: 5,
        cacheMaxAge: 600_000,
      });
      super({
        jwtFromRequest,
        secretOrKeyProvider: async (_req, token, done) => {
          const header = JSON.parse(
            Buffer.from(token.split('.')[0], 'base64').toString(),
          );
          const key = await jwks.getSigningKey(header.kid);
          done(null, key.getPublicKey());
        },
        algorithms: ['RS256'],
      });
    } else {
      const secretBase64 = config.get<string>('JWT_SECRET_BASE64');
      const secret = Buffer.from(secretBase64, 'base64').toString('utf8');
      super({
        jwtFromRequest,
        secretOrKey: secret,
        algorithms: ['HS256'],
      });
    }
  }

  /**
   * 토큰 페이로드 검증 후 실행
   * @param payload JWT 페이로드 (userId, email 등)
   * @returns validated user info (req.user에 할당)
   */
  async validate(payload: any) {
    console.log('[JwtStrategy] validate payload:', payload);
    // payload.sub가 문자열이면 Number()로 변환
    return { userId: Number(payload.userId) };
  }
}
