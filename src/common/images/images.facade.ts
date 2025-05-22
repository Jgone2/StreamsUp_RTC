import { ImagesService } from './images.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ImagesFacade {
  constructor(private readonly imagesService: ImagesService) {}

  /**
   * 썸네일 이미지 업로드 함수
   * @param id
   * @param file
   */
  async uploadStreamThumbnail(id: number, file: Express.Multer.File) {
    return await this.imagesService.uploadStreamThumbnailImage(id, file);
  }

  async deleteStreamThumbnail(key: string) {
    return await this.imagesService.deleteStreamThumbnail(key);
  }
}
