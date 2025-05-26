import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateStreamRequestDto } from './dto/create-stream-request.dto';
import { Category, StreamStatus } from '../../common/enum/enums';
import { ImagesFacade } from '../../common/images/images.facade';
import { StreamResponseDto } from './dto/stream-response.dto';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { isAxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';

/**
 * TODO: Elastic Search 연동 검색 기능 추가
 */
@Injectable()
export class StreamService {
  private readonly logger = new Logger(StreamService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
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
    authToken: string,
  ): Promise<StreamResponseDto> {
    // 1) 사용자 존재 확인
    const user = await this.findUserByUserId(userId, authToken);
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
    authToken: string,
  ): Promise<StreamResponseDto> {
    const user = await this.findUserByUserId(userId, authToken);
    this.verifyExistUser(user);

    // 2) 스트리밍 종료
    let stream;
    try {
      stream = await this.prisma.stream.update({
        where: { id: streamId, userId: userId, status: StreamStatus.LIVE },
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
  // private async findUserByUserId(id: number, authToken: string) {
  //   const authBaseUrl = this.config.get<string>('AUTH_SERVER_URL');
  //   const authUrl = `${authBaseUrl}/user/${id}`;
  //   this.logger.log(`🟣 Auth 서버에 사용자 정보 요청: ${authUrl}`);
  //   this.logger.log(`🟣 사용자 ID: ${id}, 인증 토큰: ${authToken}`);
  //   const headers = { Authorization: authToken };
  //   try {
  //     // const resp$ = this.http.get(`/user/${id}`);
  //     const { data } = await firstValueFrom(
  //       this.http.get(authUrl, { headers }),
  //     );
  //     this.logger.log(`🟣 Auth 서버에서 사용자 정보 응답: ${data}`);
  //     return data;
  //   } catch (err) {
  //     if (isAxiosError(err)) {
  //       const status = err.response?.status;
  //       // -------------------------------
  //       // 401 Unauthorized
  //       if (status === 401) {
  //         throw new UnauthorizedException('Auth 서버 인증 실패 (401)');
  //       }
  //       // 404 Not Found
  //       if (status === 404) {
  //         throw new NotFoundException(`User ${id} not found`);
  //       }
  //       // 그 외 (500, 403 등)
  //       const code = status ?? 500;
  //       throw new HttpException(
  //         `Auth 서버 에러 (${code}), (${err.message})`,
  //         code,
  //       );
  //     }
  //     // Axios 가 아닌 예기치 못한 에러
  //     this.logger.error(`🟣 ${err}`);
  //     throw new InternalServerErrorException('내부 서버 오류');
  //   }
  // }

  private async findUserByUserId(id: number, authToken: string) {
  const authBaseUrl = this.config.get<string>('AUTH_SERVER_URL');
  const authUrl = `${authBaseUrl}/user/${id}`;
  this.logger.log(`🟣 Auth 서버에 사용자 정보 요청: ${authUrl}`);
  this.logger.log(`🟣 사용자 ID: ${id}, 인증 토큰: ${authToken}`);

  try {
    // 전체 응답 객체를 받고
    const response = await firstValueFrom(
      this.http.get(authUrl, {
        headers: { Authorization: authToken },
      }),
    );

    // data를 JSON 문자열로 로깅
    this.logger.log(
      `🟣 Auth 서버에서 받은 원시 응답: ${JSON.stringify(response.data)}`,
    );

    // 혹시 response.data 구조가 { data: {...} }라면 아래처럼 꺼내고
    // const user = response.data.data ?? response.data;
    const user = response.data;

    if (!user) {
      this.logger.error(`❌ 사용자 정보가 비어있습니다: ${JSON.stringify(response.data)}`);
      throw new NotFoundException(`User ${id} returned empty from Auth server`);
    }

    return user;
  } catch (err) {
    if (isAxiosError(err)) {
      const status = err.response?.status;
      // 401 Unauthorized
      if (status === 401) {
        throw new UnauthorizedException('Auth 서버 인증 실패 (401)');
      }
      // 404 Not Found
      if (status === 404) {
        throw new NotFoundException(`User ${id} not found`);
      }
      // 그 외(500,403 등)
      const code = status ?? 500;
      this.logger.error(
        `❌ Auth 서버 에러 (${code}): ${JSON.stringify(err.response?.data) || err.message}`,
      );
      throw new HttpException(
        `Auth 서버 에러 (${code}): ${err.message}`,
        code,
      );
    }
    // Axios 외 예기치 못한 에러
    this.logger.error(`❌ 알 수 없는 에러: ${err}`, err.stack);
    throw new InternalServerErrorException('내부 서버 오류');
  }
}

  /**
   * 시청자(또는 스트리머)가 스트림에서 퇴장할 때 호출됩니다.
   *
   * 현재는 별도 viewer 테이블이 없으므로
   * 1) 스트림 존재 여부만 검증하고
   * 2) 로그를 남기는 수준으로 처리합니다.
   *    └ 추후 viewer count 감소 · 로그 적재가 필요하면 이 메서드에서 확장하세요.
   *
   * @param streamId 스트림 ID
   * @param userId   사용자 ID
   */
  async leaveStream(streamId: number, userId: number): Promise<void> {
    // 1) 스트림 + 스트리머 ID 확인
    const stream = await this.prisma.stream.findUnique({
      where: { id: streamId },
      select: { id: true, userId: true, status: true },
    });

    if (!stream) {
      this.logger.warn(`Stream ${streamId} not found`);
      throw new NotFoundException(`Stream ${streamId} not found`);
    }

    // 2) **스트리머가 직접 퇴장** → 방송 종료 처리
    if (stream.userId === userId) {
      if (stream.status !== StreamStatus.FINISHED) {
        await this.prisma.stream.update({
          where: { id: streamId },
          data: {
            status: StreamStatus.FINISHED,
            endedAt: new Date(),
          },
        });
        this.logger.log(
          `Streamer ${userId} finished stream ${streamId} (set FINISHED)`,
        );
      } else {
        this.logger.debug(
          `Stream ${streamId} already finished by streamer ${userId}`,
        );
      }
      return;
    }

    this.logger.log(`Viewer ${userId} left stream ${streamId}`);
  }

  // --- 기존 TODO 자리 ---
  private async liveStream() {
    /* 구현 예정 */
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
