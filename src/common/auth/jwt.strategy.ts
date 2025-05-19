import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwksClient, SigningKey } from 'jwks-rsa';

/**
 * JWKS 클라이언트 설정
 * - Auth 서버의 JWKS URI에서 공개키를 가져와 메모리 캐시
 * - cache: true 로 한 번 가져온 키를 cacheMaxAge 동안 재사용
 */
const jwks = new JwksClient({
  jwksUri: process.env.JWKS_URI, // ex) https://auth.example.com/.well-known/jwks.json
  cache: true,
  cacheMaxEntries: 5, // 최대 5개의 키 캐시
  cacheMaxAge: 600_000, // 10분(밀리초 단위) 캐시 유지
});

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // 1) HTTP 헤더에서 Bearer 토큰 추출
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // 2) secretOrKeyProvider:
      //    - 토큰 헤더의 `kid` 값 사용해 올바른 공개키(SigningKey) 가져옴
      //    - jwks.getSigningKey() 내부에서 cache 처리
      /**
       * 2. secretOrKeyProvider
       * - JWT 헤더에서 kid 추출 → JWKS 클라이언트에 kid 전달
       * - JWKS 클라이언트에서 SigningKey 반환
       * - SigningKey.getPublicKey()로 공개키 추출
       * - JWT 검증 시 공개키 사용
       * - jwks.getSigningKey() 내부에서 cache 처리
       * @param _req
       * @param rawJwtToken
       * @param done
       */
      secretOrKeyProvider: async (
        _req,
        rawJwtToken: string,
        done: (err: Error | null, publicKey?: string) => void,
      ) => {
        try {
          // 토큰 헤더(Base64) 디코딩 → kid 추출
          const decodedHeader = JSON.parse(
            Buffer.from(rawJwtToken.split('.')[0], 'base64').toString(),
          );
          // JWKS 클라이언트에 kid 전달 → SigningKey 반환
          const key: SigningKey = await jwks.getSigningKey(decodedHeader.kid);
          const pubKey = key.getPublicKey();
          done(null, pubKey);
        } catch (err) {
          done(err as Error);
        }
      },

      // 3) 알고리즘 명시 (RS256만 허용)
      algorithms: ['RS256'],
    });
  }

  /**
   * 토큰 페이로드 검증 후 실행
   * @param payload JWT 페이로드 (userId, email 등)
   * @returns validated user info (req.user에 할당)
   */
  async validate(payload: any) {
    // payload.userId가 문자열이면 Number()로 변환
    return { userId: Number(payload.userId), email: payload.email };
  }
}
