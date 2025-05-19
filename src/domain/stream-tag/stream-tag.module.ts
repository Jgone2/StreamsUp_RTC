import { Module } from '@nestjs/common';
import { StreamTagService } from './stream-tag.service';
import { StreamTagController } from './stream-tag.controller';

@Module({
  controllers: [StreamTagController],
  providers: [StreamTagService],
})
export class StreamTagModule {}
