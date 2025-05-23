import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import {
  TokenExpiredError,
  JsonWebTokenError,
  NotBeforeError,
  Algorithm,
} from 'jsonwebtoken';

/**
 * Socket.IO Handshake 인증 미들웨어
 * - socket.handshake.auth.token 에 담긴 JWT를 검증하고
 *   payload를 socket.data.user 에 저장합니다.
 */
export function wsAuthMiddleware(
  jwtService: JwtService,
  configService: ConfigService,
) {
  return (socket: Socket, next: (err?: any) => void) => {
    // 1) 토큰 꺼내기
    const token = socket.handshake.auth?.token;
    if (!token) {
      // 토큰 자체가 없을 때
      return next(new Error('Unauthorized: token not provided'));
    }

    try {
      // 2) 검증
      const algorithm = configService.get<Algorithm>('JWT_ALGORITHM'); // e.g. "HS256"
      const payload = jwtService.verify(token, { algorithms: [algorithm] });

      // 3) payload.userId 방어
      if (!payload || typeof (payload as any).userId !== 'number') {
        // 페이로드 내부 userId 가 없거나 이상할 때
        return next(
          new Error(
            `Unauthorized: invalid token payload (userId missing): ${payload.userId}`,
          ),
        );
      }

      // 4) 성공 시 socket.data.user 에 보관
      socket.data.user = payload;
      return next();
    } catch (err: any) {
      // 5) 에러 종류별 세분화 처리
      if (err instanceof TokenExpiredError) {
        // 토큰 만료
        return next(new Error('Unauthorized: token expired'));
      }
      if (err instanceof NotBeforeError) {
        // 유효 시작 시간 이전
        return next(
          new Error(`Unauthorized: token not active until ${err.date}`),
        );
      }
      if (err instanceof JsonWebTokenError) {
        // 서명 불일치, 잘못된 형식 등
        return next(new Error(`Unauthorized: JWT error (${err.message})`));
      }
      // 그 외 예기치 않은 오류
      return next(new Error('Unauthorized: token verification failed'));
    }
  };
}
