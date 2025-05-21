import { Module } from '@nestjs/common';
import { ImagesService } from './images.service';
import { ImagesController } from './images.controller';
import { ImagesFacade } from './images.facade';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UploadModule],
  controllers: [ImagesController],
  providers: [ImagesService, ImagesFacade],
  exports: [ImagesFacade],
})
export class ImagesModule {}
