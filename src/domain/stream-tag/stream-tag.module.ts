import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { StreamTagService } from './stream-tag.service';
import { StreamTagController } from './stream-tag.controller';

@Module({
  imports: [PrismaModule],
  controllers: [StreamTagController],
  providers: [StreamTagService],
})
export class StreamTagModule {}
