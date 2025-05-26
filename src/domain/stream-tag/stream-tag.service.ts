import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class StreamTagService {
  constructor(private readonly prisma: PrismaService) {}

  async findStreamTagInfoByStreamId(streamId: number) {
    const streamTag = await this.prisma.streamTag.findMany({
      where: {
        streamId,
      },
      select: {
        tagName: true,
      },
    });
    return streamTag.map((tag) => tag.tagName);
  }
}
