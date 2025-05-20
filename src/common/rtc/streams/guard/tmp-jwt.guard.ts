import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
export class TmpJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient<Socket>();
    // 테스트용 JWT Info
    client.data.user = {
      userId: '123',
      roomId: '1',
      type: 'tmp',
    };
    return true;
  }
}
