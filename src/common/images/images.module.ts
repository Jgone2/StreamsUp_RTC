import { Module } from '@nestjs/common';
import { ImagesService } from './images.service';
import { ImagesController } from './images.controller';
import { ImagesFacade } from './images.facade';
import { UploadFacade } from '../upload/upload.facade';

@Module({
  imports: [UploadFacade],
  controllers: [ImagesController],
  providers: [ImagesService, ImagesFacade],
  exports: [ImagesFacade],
})
export class ImagesModule {}
