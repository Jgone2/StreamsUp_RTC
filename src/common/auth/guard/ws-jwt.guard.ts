import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Socket.IO 연결 시도(handshake) 단계에서 실행
   * - auth.token 또는 headers.Authorization 에서 JWT 꺼내고
   * - jwtService.verify() 로 RS256 서명/만료 검증한 뒤
   * - client.data.user 에 페이로드를 저장
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();

    // 1) 토큰 획득
    //  - 우선 client.handshake.auth.token (socket.io auth 필드)
    //  - 없으면 headers.Authorization: "Bearer <token>"
    const token =
      client.handshake.auth?.token ??
      (typeof client.handshake.headers?.authorization === 'string' &&
      client.handshake.headers.authorization.split(' ')[0]?.toLowerCase() ===
        'bearer'
        ? client.handshake.headers.authorization.split(' ')[1]
        : undefined);

    // 토큰 미제공 시 401
    if (!token) {
      this.logger.warn('🔴 WebSocket token not provided');
      throw new UnauthorizedException('WebSocket token not provided');
    }

    // 2) 토큰 검증 (서명 RS256 + 만료 검사)
    try {
      const payload = this.jwtService.verify(token, {
        algorithms: ['RS256'], // RS256 공개키 검증
      });

      // 검증 성공 → 핸드셰이크 후 socket.data.user 에 페이로드 저장
      client.data.user = payload;
      return true;
    } catch (err: any) {
      // 검증 실패 시 로깅 후 예외 던짐
      this.logger.warn(`🟠 Invalid WebSocket token: ${err.message}`);
      throw new UnauthorizedException('Invalid WebSocket token');
    }
  }
}
