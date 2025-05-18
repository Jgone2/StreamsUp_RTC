import { Injectable } from '@nestjs/common';
import { UploadFacade } from '../upload/upload.facade';

@Injectable()
export class ImagesService {
  constructor(private readonly uploadFacade: UploadFacade) {}

  /**
   * 썸네일 이미지 업로드 함수
   * @param file
   */
  async uploadStreamThumbnailImage(id: string, file: Express.Multer.File) {
    return await this.uploadFacade.uploadThumbnail(id, file);
  }
}
