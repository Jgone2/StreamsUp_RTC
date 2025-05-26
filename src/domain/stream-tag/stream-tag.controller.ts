import { Controller, Get, Param } from '@nestjs/common';
import { StreamTagService } from './stream-tag.service';

@Controller('stream-tag')
export class StreamTagController {
  constructor(private readonly streamTagService: StreamTagService) {}

  @Get(':streamId')
  async findStreamTagInfoByStreamId(@Param('streamId') streamId: string) {
    return this.streamTagService.findStreamTagInfoByStreamId(+streamId);
  }
}
