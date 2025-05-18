import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { Category } from './category.enum';
import { StreamStatus } from './stream-status.enum';

@ApiTags('StreamCreateRequestDto')
export class StreamCreateRequestDto {
  @ApiProperty({
    description: '스트리밍 제목',
    example: '3대 500kg 도전!!',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiProperty({
    description: '카테고리',
    enum: Category,
    example: Category.FITNESS,
  })
  @IsEnum(Category)
  category: Category;

  @ApiProperty({
    description: '스트리밍 설명',
    example: '3대 500kg 달성하는 그 날까지!',
    maxLength: 500,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: '썸네일 URL',
    example: 'https://example.com/thumbnail.jpg',
    required: false,
  })
  @IsOptional()
  @Matches(/^https?:\/\/.+/i, { message: '유효한 URL 형식이어야 합니다.' })
  thumbnailUrl?: string;

  @ApiProperty({
    description: '태그 목록(최대 5개)',
    example: ['서울_캠퍼스', '3대500', '헬스'],
    maxItems: 5,
    required: false,
    type: [String],
  })
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  @IsOptional()
  tags?: string[];

  /** 생성 시 상태는 고정(LIVE)이므로 Swagger‧DB 양쪽에 명시해 둡니다 */
  readonly status: StreamStatus = StreamStatus.LIVE;
}
