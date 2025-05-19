import { PartialType } from '@nestjs/swagger';
import { CreateStreamTagDto } from './create-stream-tag.dto';

export class UpdateStreamTagDto extends PartialType(CreateStreamTagDto) {}
