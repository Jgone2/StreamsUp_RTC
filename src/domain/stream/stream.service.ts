import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StreamCreateRequestDto } from './dto/create-stream.dto';
import { StreamStatus } from './dto/stream-status.enum';
import { Category } from './dto/category.enum';

@Injectable()
export class StreamsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 스트림 생성 */
  async create(dto: StreamCreateRequestDto, userId: number) {
    // 1) 사용자 존재 확인
    const user = await this.prisma.user.findUnique({ where: { userId } });
    this.verifyExistUser(user);

    // 2) 동일 유저 LIVE 스트림 중복 검사
    const existsLive = await this.prisma.stream.findFirst({
      where: { userId, status: StreamStatus.LIVE },
    });
    this.verifyIsInLive(existsLive);

    // 3) 트랜잭션: 스트림 + 태그
    const stream = await this.prisma.$transaction(async (tx) => {
      const created = await tx.stream.create({
        data: {
          userId,
          title: dto.title,
          category: dto.category,
          description: dto.description,
          thumbnailUrl: dto.thumbnailUrl,
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
      throw new BadRequestException('User already has a live stream');
    }
  };
  private verifyExistUser = (user) => {
    if (!user) throw new NotFoundException('User not found');
  };
  // ▸ findAll / findOne / end / update 메서드는 이전 코드 그대로
}
