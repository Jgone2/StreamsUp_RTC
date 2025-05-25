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

  /**
   * 조회 - 스트림 생성자 ID로 스트림 조회
   * @param userId
   */
  async findStreamsByUserId(userId: number) {
    return this.streamService.findStreamsByUserId(userId);
  }
}
