import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const LoginUser = createParamDecorator(
  (data: keyof any, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return data ? req.user[data] : req.user;
  },
);
