import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { UsersEntity } from '../../../users/entities/users.entity';

export const User = createParamDecorator(
  (data: keyof UsersEntity | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const user = request.user as UsersEntity;

    if (!user) {
      throw new InternalServerErrorException(
        'User 데코레이터는 AccessTokenGuard와 함께 사용해야합니다. 일치하는 사용자를 찾을 수 없습니다.',
      );
    }

    if (data) {
      return user[data];
    }

    return user;
  },
);
