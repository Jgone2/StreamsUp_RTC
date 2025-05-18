import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

export function UploadFileInterceptor() {
  const maxFileSize = Number(process.env.MAX_FILE_SIZE ?? 5 * 1024 * 1024); // default 5MB
  return applyDecorators(
    UseInterceptors(
      FileInterceptor('file', {
        limits: { fileSize: maxFileSize },
      }),
    ),
  );
}
