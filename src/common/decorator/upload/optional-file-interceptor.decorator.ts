import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  mixin,
  NestInterceptor,
  Optional,
  Type,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { Observable } from 'rxjs';

export function OptionalFileInterceptor(
  fieldName: string,
  localOptions?: MulterOptions,
): Type<NestInterceptor> {
  @Injectable()
  class Interceptor implements NestInterceptor {
    fileInterceptor: NestInterceptor;
    constructor(@Optional() options: MulterOptions = {}) {
      this.fileInterceptor = new (FileInterceptor(fieldName, {
        ...options,
        ...localOptions,
      }))();
    }

    async intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<Observable<any>> {
      const request = context.switchToHttp().getRequest();

      // 파일 개수 검증 (최대 3개)
      if (request.files && request.files.length > 3) {
        throw new BadRequestException(
          '최대 3개의 파일만 업로드할 수 있습니다.',
        );
      }

      // 파일이 없는 경우, files 배열을 빈 배열로 설정
      if (!request.files) {
        request.files = [];
      }

      // FileInterceptor를 사용하여 파일 처리
      return this.fileInterceptor.intercept(context, next);
    }
  }
  return mixin(Interceptor);
}
