import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { Algorithm } from 'jsonwebtoken';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * WebSocket 연결 시 실행되는 Guard
   * - Socket.IO handshake 단계에서 토큰을 꺼내고 검증합니다.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1) 클라이언트 소켓 객체 추출
    const client: Socket = context.switchToWs().getClient<Socket>();

    // 2) 토큰 추출
    const token =
      client.handshake.auth?.accessToken ??
      client.handshake.auth?.token ??
      (() => {
        const authHeader = client.handshake.headers.authorization;
        if (
          typeof authHeader === 'string' &&
          authHeader.toLowerCase().startsWith('bearer ')
        ) {
          return authHeader.slice(7);
        }
        return undefined;
      })();

    // 3) 토큰 미제공 시 거부
    if (!token || token === 'null' || token === 'undefined') {
      this.logger.warn('🔴 WebSocket token not provided');
      throw new UnauthorizedException('WebSocket token not provided');
    }

    // 4) 토큰 검증
    try {
      // 검증 전 로깅
      this.logger.log(`🔍 Verifying WS token: ${token}`);

      const algorithm = this.config.get<Algorithm>('JWT_ALGORITHM');
      const payload = this.jwtService.verify(token, {
        algorithms: [algorithm],
      });

      // 검증 후 로깅
      this.logger.log(
        `✅ WS token verified, payload: ${JSON.stringify(payload)}`,
      );

      // 방어 코드: userId 존재 여부 확인
      if (payload == null || typeof (payload as any).userId !== 'number') {
        this.logger.error('🔴 WS token payload missing userId');
        throw new UnauthorizedException('Invalid WebSocket token payload');
      }

      // 5) 성공 시 페이로드 저장
      client.data.user = payload;
      return true;
    } catch (err: any) {
      // 실패 로깅
      this.logger.warn(`🟠 Invalid WebSocket token: ${err.message}`);
      this.logger.error(`❌ WS token verify failed`, err.stack);
      throw new UnauthorizedException('Invalid WebSocket token');
    }
  }
}
