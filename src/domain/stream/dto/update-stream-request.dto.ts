import { PartialType } from '@nestjs/mapped-types';
import { CreateStreamRequestDto } from './create-stream-request.dto';

export class UpdateStreamRequestDto extends PartialType(
  CreateStreamRequestDto,
) {}
