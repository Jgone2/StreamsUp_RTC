import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import {
  TokenExpiredError,
  JsonWebTokenError,
  NotBeforeError,
  Algorithm,
} from 'jsonwebtoken';
import { Logger } from '@nestjs/common';

/**
 * Socket.IO Handshake 인증 미들웨어
 * - socket.handshake.auth.token 에 담긴 JWT를 검증하고
 *   payload를 socket.data.user 에 저장합니다.
 */
export function wsAuthMiddleware(
  jwtService: JwtService,
  configService: ConfigService,
) {
  const logger = new Logger('WsAuthMiddleware');

  return (socket: Socket, next: (err?: any) => void) => {
    logger.debug(`Incoming handshake from socketId=${socket.id}`);
    logger.debug(`Auth payload: ${JSON.stringify(socket.handshake.auth)}`);

    // 1) 토큰 꺼내기
    const token = socket.handshake.auth?.token;
    if (!token) {
      logger.warn('Token not provided in handshake.auth.token');
      return next(new Error('Unauthorized: token not provided'));
    }
    logger.debug(`Token received: ${token}`);

    try {
      // 2) 검증
      const algorithm = configService.get<Algorithm>('JWT_ALGORITHM'); // e.g. "HS256"
      const payload = jwtService.verify(token, { algorithms: [algorithm] });

      // 3) payload.userId 방어
      if (!payload || typeof (payload as any).userId !== 'number') {
        logger.error(`Invalid payload structure: ${JSON.stringify(payload)}`);
        return next(
          new Error(
            `Unauthorized: invalid token payload (userId missing): ${(payload as any)?.userId}`,
          ),
        );
      }

      // 4) 성공 시 socket.data.user 에 보관
      socket.data.user = payload;
      logger.log(`Socket authenticated: userId=${(payload as any).userId}`);
      return next();
    } catch (err: any) {
      // 5) 에러 종류별 세분화 처리
      if (err instanceof TokenExpiredError) {
        logger.warn(`TokenExpiredError: token expired at ${err.expiredAt}`);
        return next(new Error('Unauthorized: token expired'));
      }
      if (err instanceof NotBeforeError) {
        logger.warn(`NotBeforeError: token not active until ${err.date}`);
        return next(
          new Error(`Unauthorized: token not active until ${err.date}`),
        );
      }
      if (err instanceof JsonWebTokenError) {
        logger.warn(`JsonWebTokenError: ${err.message}`);
        return next(new Error(`Unauthorized: JWT error (${err.message})`));
      }
      // 그 외 예기치 않은 오류
      logger.error(`Token verification failed: ${err.message}`, err.stack);
      return next(new Error('Unauthorized: token verification failed'));
    }
  };
}
