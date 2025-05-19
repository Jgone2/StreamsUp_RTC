import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateStreamRequestDto } from './dto/create-stream-request.dto';
import { StreamStatus } from './dto/stream-status.enum';
import { ImagesFacade } from '../../common/images/images.facade';
import { ImageResponseDto } from '../../common/images/dto/image-response.dto';
import { StreamResponseDto } from './dto/stream-response.dto';
import { Category } from './dto/category.enum';

/**
 * TODO: Elastic Search 연동 검색 기능 추가
 */
@Injectable()
export class StreamService {
  private readonly logger = new Logger(StreamService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageFacade: ImagesFacade,
  ) {}

  /**
   * 스트리밍 생성
   * @param dto
   * @param userId
   * @returns
   */
  async createStream(
    dto: CreateStreamRequestDto,
    userId: number,
  ): Promise<StreamResponseDto> {
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
   * 스트리밍 종료
   * @param streamId
   * @param userId
   *
   */
  async endStream(
    streamId: number,
    userId: number,
  ): Promise<StreamResponseDto> {
    const user = await this.findUserByUserId(userId);
    this.verifyExistUser(user);

    // 2) 스트리밍 종료
    let stream;
    try {
      stream = await this.prisma.stream.update({
        where: { streamId },
        data: {
          status: StreamStatus.FINISHED,
          endAt: new Date(),
        },
      });
    } catch (err) {
      if (err.code === 'P2025') {
        this.logger.warn(`Stream ${streamId} not found`);
        throw new NotFoundException(`Stream ${streamId} not found`);
      }
      throw err;
    }

    return stream;
  }

  /**
   * 스트리밍 수정
   */
  async updateStream(streamId: number, dto: CreateStreamRequestDto) {
    // TODO document why this async method 'updateStream' is empty

    // 1) 스트리밍 수정
    const stream = await this.prisma.stream.update({
      where: { streamId },
      data: {
        title: dto.title,
        category: dto.category,
        description: dto.description,
      },
    });

    // 2) 태그 삽입
    if (dto.tags?.length) {
      await this.prisma.streamTag.deleteMany({ where: { streamId } });
      await this.prisma.streamTag.createMany({
        data: dto.tags.map((t: string) => ({
          streamId: stream.streamId,
          tagName: t,
        })),
      });
    }

    return stream;
  }

  /**
   * 카테고리별 스트리밍 조회
   * @category
   */
  async findStreamsByCategory(
    category: Category,
  ): Promise<StreamResponseDto[]> {
    const streams = await this.prisma.stream.findMany({
      where: {
        category,
        status: StreamStatus.LIVE,
      },
      orderBy: { createdAt: 'desc' },
    });

    return streams;
  }

  /**
   * 방송중인 스트리밍 조회(LIVE)
   */
  async findLiveStreams() {
    const streams = await this.prisma.stream.findMany({
      where: { status: StreamStatus.LIVE },
      orderBy: { createdAt: 'desc' },
    });

    return streams;
  }

  /**
   * 방송 종료된 스트리밍 조회(FINISHED)
   */
  async findFinishedStreams() {
    const streams = await this.prisma.stream.findMany({
      where: { status: StreamStatus.FINISHED },
      orderBy: { createdAt: 'desc' },
    });

    return streams;
  }
  /**
   * streamId로 스트리밍 조회
   */
  async findStreamById(streamId: number): Promise<StreamResponseDto> {
    const stream = await this.prisma.stream.findUnique({
      where: { streamId },
    });

    if (!stream) {
      this.logger.warn(`Stream ${streamId} not found`);
      throw new NotFoundException(`Stream ${streamId} not found`);
    }

    return stream;
  }

  /**
   * userId로 스트리밍 조회
   */
  async findStreamsByUserId(userId: number): Promise<StreamResponseDto[]> {
    const streams = await this.prisma.stream.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return streams;
  }

  /**
   * 검색을 통한 스트리밍 조회
   */

  /**
   * 사용자 존재 여부 확인
   * @param userId
   */
  private readonly findUserByUserId = (userId: number) => {
    return this.prisma.user.findUnique({ where: { userId } });
  };

  /**
   * 동일 유저 LIVE 스트림 중복 검사
   * @param userId
   */
  private readonly findStreamLiveByUserId = (userId: number) => {
    return this.prisma.stream.findFirst({
      where: { userId, status: StreamStatus.LIVE },
    });
  };

  /**
   * 스트림이 LIVE 상태인지 확인
   * @param existsLive
   */
  private readonly verifyIsInLive = (existsLive: any): boolean => {
    if (existsLive) {
      this.logger.warn('🟣 User already has a live stream');
      return true;
    }
    return false;
  };

  /**
   * 사용자 존재 여부 확인
   * @param user
   */
  private readonly verifyExistUser = (user) => {
    this.logger.error('🔴 User not found');
    if (!user) throw new NotFoundException('User not found');
  };
}
