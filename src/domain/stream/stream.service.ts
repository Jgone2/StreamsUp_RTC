import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateStreamRequestDto } from './dto/create-stream-request.dto';
import { StreamStatus } from './dto/stream-status.enum';
import { ImagesFacade } from '../../common/images/images.facade';
import { ImageResponseDto } from '../../common/images/dto/image-response.dto';

@Injectable()
export class StreamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageFacade: ImagesFacade,
  ) {}

  /** 스트림 생성 */
  async createStream(dto: CreateStreamRequestDto, userId: number) {
    // 1) 사용자 존재 확인
    const user = await this.findUserByUserId(userId);
    this.verifyExistUser(user);

    // 2) 동일 유저 LIVE 스트림 중복 검사
    const existsLive = await this.findStreamLiveByUserId(userId);
    this.verifyIsInLive(existsLive);

    // 2) DB에 일단 스트림만 생성
    const created = await this.prisma.stream.create({
      data: {
        userId,
        title: dto.title,
        category: dto.category,
        description: dto.description,
        status: StreamStatus.LIVE,
      },
    });

    // 3) S3에 업로드할 파일 정보
    let imageResponseDto: ImageResponseDto;
    try {
      // 3) S3에 업로드
      imageResponseDto = await this.imageFacade.uploadStreamThumbnail(
        userId,
        dto.thumbnailFile,
      );

      // 4) 업로드 완료되면 DB 레코드 업데이트
      const updated = await this.prisma.stream.update({
        where: { streamId: created.streamId },
        data: {
          thumbnailUrl: imageResponseDto.fileUrl,
          thumbnailImageKey: imageResponseDto.key,
        },
      });

      // 5) 태그 삽입
      if (dto.tags?.length) {
        await this.prisma.streamTag.createMany({
          data: dto.tags.map((t: string) => ({
            streamId: updated.streamId,
            tagName: t,
          })),
        });
      }

      return updated;
    } catch (err) {
      // 6) 어떤 단계에서든 에러가 나면, 업로드된 파일을 지워 줌
      if (imageResponseDto?.key) {
        await this.imageFacade.deleteStreamThumbnail(imageResponseDto?.key);
      }
      // 썸네일 이슈가 발생해도 스트리밍은 가능하므로 스트리밍은 유지
      throw err;
    }
  }

  /**
   * 사용자 존재 여부 확인
   * @param userId
   */
  private findUserByUserId = (userId: number) => {
    return this.prisma.user.findUnique({ where: { userId } });
  };

  /**
   * 동일 유저 LIVE 스트림 중복 검사
   * @param userId
   */
  private findStreamLiveByUserId = (userId: number) => {
    return this.prisma.stream.findFirst({
      where: { userId, status: StreamStatus.LIVE },
    });
  };

  /**
   * 스트림이 LIVE 상태인지 확인
   * @param existsLive
   */
  private verifyIsInLive = (existsLive): boolean => {
    if (existsLive) {
      Logger.warn('🟣 User already has a live stream');
      return true;
    }
    return false;
  };

  /**
   * 사용자 존재 여부 확인
   * @param user
   */
  private verifyExistUser = (user) => {
    Logger.error('🔴 User not found');
    if (!user) throw new NotFoundException('User not found');
  };
}
