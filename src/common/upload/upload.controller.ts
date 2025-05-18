import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  // @Post()
  // @UseInterceptors(
  //   FileInterceptor('file', {
  //     limits: { fileSize: 1024 * 1024 * 5 },
  //   }),
  // )
  // async uploadFile(@UploadedFile() file: Express.Multer.File) {
  //   return await this.uploadService.uploadToS3(file);
  // }
}
