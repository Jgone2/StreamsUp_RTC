import { ImagesService } from './images.service';

export class ImagesFacade {
  constructor(private readonly imagesService: ImagesService) {}

  /**
   * 썸네일 이미지 업로드 함수
   * @param id, file
   */
  async uploadStreamThumbnail(id: string, file: Express.Multer.File) {
    return await this.imagesService.uploadStreamThumbnailImage(id, file);
  }
}