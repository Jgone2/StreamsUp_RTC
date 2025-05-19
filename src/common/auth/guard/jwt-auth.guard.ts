import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

/**
 * HTTP 요청의 Authorization: Bearer <token> 헤더를
 * Passport의 'jwt' 전략으로 검증합니다.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
