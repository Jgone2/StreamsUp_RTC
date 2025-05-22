import { Injectable } from '@nestjs/common';
import { StreamService } from './stream.service';

@Injectable()
export class StreamFacade {
  constructor(private readonly streamService: StreamService) {}

  /**
   * 조회 - streamId로 스트림 조회
   * @param streamId
   */
  async findStreamById(streamId: number) {
    return await this.streamService.findStreamById(streamId);
  }
}