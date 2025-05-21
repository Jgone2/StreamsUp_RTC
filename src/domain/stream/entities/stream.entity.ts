import { ApiProperty } from '@nestjs/swagger';
import { Category, StreamStatus } from '../../../common/enum/enums';

export class Stream {
  @ApiProperty({ example: 101 })
  id: number;

  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({ example: '알고리즘 실전 풀이' })
  title: string;

  @ApiProperty({ enum: Category, example: Category.FITNESS })
  category: Category;

  @ApiProperty({ example: '다익스트라 풀이를 라이브로 설명합니다' })
  description: string;

  @ApiProperty({ example: 'https://example.com/thumbnail.jpg' })
  thumbnailUrl: string;

  @ApiProperty({ example: 'thumbnail/thumbnail.jpg' })
  thumbnailUrlImageKey: string;

  @ApiProperty({ enum: StreamStatus, example: StreamStatus.LIVE })
  status: StreamStatus;

  @ApiProperty({ example: '2025-05-16T12:00:00Z' })
  startedAt: Date;

  @ApiProperty({ example: null })
  endedAt: Date | null;
}
