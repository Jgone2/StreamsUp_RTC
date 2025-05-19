import { ApiProperty } from '@nestjs/swagger';

export class StreamTag {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 101 })
  streamId: number;

  @ApiProperty({ example: '하체' })
  tagName: string;
}
