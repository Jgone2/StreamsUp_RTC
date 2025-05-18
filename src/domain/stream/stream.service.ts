import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  async createStream(dto: CreateStreamRequestDto, userId: string) {
    // 1) 사용자 존재 확인
    const user = await this.prisma.user.findUnique({ where: { userId } });
    this.verifyExistUser(user);

    // 2) 동일 유저 LIVE 스트림 중복 검사
    const existsLive = await this.prisma.stream.findFirst({
      where: { userId, status: StreamStatus.LIVE },
    });
    this.verifyIsInLive(existsLive);

    const imageResponseDto: ImageResponseDto =
      await this.imageFacade.uploadStreamThumbnail(userId, dto.thumbnailFile);

    // 3) 트랜잭션: 스트림 + 태그
    const stream = await this.prisma.$transaction(async (tx) => {
      const created = await tx.stream.create({
        data: {
          userId,
          title: dto.title,
          category: dto.category,
          description: dto.description,
          thumbnailUrl: imageResponseDto.fileUrl,
          status: StreamStatus.LIVE,
        },
      });

      if (dto.tags?.length) {
        await tx.streamTag.createMany({
          data: dto.tags.map((t) => ({
            streamId: created.streamId,
            tagName: t,
          })),
        });
      }
      return created;
    });

    return stream;
  }

  private verifyIsInLive = (existsLive) => {
    if (existsLive) {
      throw new BadRequestException('🟣 User already has a live stream');
    }
  };
  private verifyExistUser = (user) => {
    if (!user) throw new NotFoundException('🔴 User not found');
  };
}
