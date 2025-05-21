import { Injectable } from '@nestjs/common';
import { UploadService } from './upload.service';
import { ImageFolderEnum } from '../enum/enums';
import { ImageResponseDto } from '../images/dto/image-response.dto';

@Injectable()
export class UploadFacade {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * 썸네일 이미지를 업로드하고 URL·Key를 반환.
   *
   * @param userId  업로드 사용자 ID (string)
   * @param file    Multer 업로드 파일 객체
   */
  async uploadThumbnail(
    userId: number,
    file: Express.Multer.File,
  ): Promise<ImageResponseDto> {
    return await this.uploadService.uploadToS3(
      userId,
      file,
      ImageFolderEnum.THUMBNAIL,
    );
  }

  /**
   * 썸네일 이미지를 삭제.
   *
   */
  async deleteThumbnail(key: string) {
    return await this.uploadService.deleteFromS3(key);
  }
}
