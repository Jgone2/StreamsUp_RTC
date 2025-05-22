import {
  BadRequestException, HttpException,
  Injectable, InternalServerErrorException,
  Logger,
  NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateStreamRequestDto } from './dto/create-stream-request.dto';
import { Category, StreamStatus } from '../../common/enum/enums';
import { ImagesFacade } from '../../common/images/images.facade';
import { ImageResponseDto } from '../../common/images/dto/image-response.dto';
import { StreamResponseDto } from './dto/stream-response.dto';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { isAxiosError } from 'axios';

/**
 * TODO: Elastic Search 연동 검색 기능 추가
 */
@Injectable()
export class StreamService {
  private readonly logger = new Logger(StreamService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly imageFacade: ImagesFacade,
    private readonly http: HttpService,
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
    // let imageResponseDto: ImageResponseDto;
    try {
      /*// 3) S3에 업로드
      imageResponseDto = await this.imageFacade.uploadStreamThumbnail(
        userId,
        dto.thumbnailFile,
      );

      // 4) 업로드 완료되면 DB 레코드 업데이트
      const updated = await this.prisma.stream.update({
        where: { id: created.id },
        data: {
          thumbnailUrl: imageResponseDto.fileUrl,
          thumbnailImageKey: imageResponseDto.key,
        },
      });*/

      // 5) 태그 삽입
      if (dto.tags?.length) {
        await this.prisma.streamTag.createMany({
          data: dto.tags.map((t: string) => ({
            streamId: created.id,
            tagName: t,
          })),
        });
      }

      return created;
    } catch (err) {
      // 6) 어떤 단계에서든 에러가 나면, 업로드된 파일을 지워 줌
      // if (imageResponseDto?.key) {
      //   await this.imageFacade.deleteStreamThumbnail(imageResponseDto?.key);
      // }
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
        where: { id: streamId },
        data: {
          status: StreamStatus.FINISHED,
          endedAt: new Date(),
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
      where: { id: streamId },
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
          streamId: stream.id,
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
      where: { id: streamId },
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
  private async findUserByUserId(id: number) {
    try {
      const resp$ = this.http.get(`/user/${id}`);
      const { data } = await firstValueFrom(resp$);
      return data;
    } catch (err) {
      if (isAxiosError(err)) {
        const status = err.response?.status;
        // -------------------------------
        // 401 Unauthorized
        if (status === 401) {
          throw new UnauthorizedException('Auth 서버 인증 실패 (401)');
        }
        // 404 Not Found
        if (status === 404) {
          throw new NotFoundException(`User ${id} not found`);
        }
        // 그 외 (500, 403 등)
        throw new HttpException(`Auth 서버 에러 (${status})`, status);
      }
      // Axios 가 아닌 예기치 못한 에러
      this.logger.error(err);
      throw new InternalServerErrorException('내부 서버 오류');
    }
  }

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
      throw new BadRequestException('User already has a live stream');
    }
    return false;
  };

  /**
   * 사용자 존재 여부 확인
   * @param user
   */
  private readonly verifyExistUser = (user) => {
    if (!user) {
      this.logger.error('🔴 User not found');
      throw new NotFoundException('User not found');
    }
  };
}
