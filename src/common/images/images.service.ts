import { Injectable } from '@nestjs/common';
import { UploadFacade } from '../upload/upload.facade';

@Injectable()
export class ImagesService {
  constructor(private readonly uploadFacade: UploadFacade) {}

  /**
   * 썸네일 이미지 업로드 함수
   * @param file
   */
  async uploadStreamThumbnailImage(id: number, file: Express.Multer.File) {
    return await this.uploadFacade.uploadThumbnail(id, file);
  }

  /**
   * 썸네일 이미지 삭제 함수
   */
  async deleteStreamThumbnail(key: string) {
    return await this.uploadFacade.deleteThumbnail(key);
  }
}
