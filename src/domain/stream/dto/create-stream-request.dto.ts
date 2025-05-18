import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { Express } from 'express';
import { Category } from './category.enum';
import { StreamStatus } from './stream-status.enum';

@ApiTags('StreamCreateRequestDto')
export class CreateStreamRequestDto {
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
    description: '썸네일 이미지 파일',
    example: 'https://example.com/thumbnail.jpg',
    required: false,
  })
  @IsOptional()
  thumbnailFile?: Express.Multer.File;

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

  readonly status: StreamStatus = StreamStatus.LIVE;
}
