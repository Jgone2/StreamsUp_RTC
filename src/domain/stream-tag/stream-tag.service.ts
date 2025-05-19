import { Injectable } from '@nestjs/common';
import { CreateStreamTagDto } from './dto/create-stream-tag.dto';
import { UpdateStreamTagDto } from './dto/update-stream-tag.dto';

@Injectable()
export class StreamTagService {
  create(createStreamTagDto: CreateStreamTagDto) {
    return 'This action adds a new streamTag';
  }

  findAll() {
    return `This action returns all streamTag`;
  }

  findOne(id: number) {
    return `This action returns a #${id} streamTag`;
  }

  update(id: number, updateStreamTagDto: UpdateStreamTagDto) {
    return `This action updates a #${id} streamTag`;
  }

  remove(id: number) {
    return `This action removes a #${id} streamTag`;
  }
}
