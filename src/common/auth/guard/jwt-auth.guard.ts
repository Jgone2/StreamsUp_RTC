import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext, Injectable } from '@nestjs/common';

/**
 * HTTP 요청의 Authorization: Bearer <token> 헤더를
 * Passport의 'jwt' 전략으로 검증합니다.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user, info, context: ExecutionContext) {
    console.log('🔴 [JwtAuthGuard] err:', err, 'info:', info, 'user:', user);
    return super.handleRequest(err, user, info, context);
  }
}
