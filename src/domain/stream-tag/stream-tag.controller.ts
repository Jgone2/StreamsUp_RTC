import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { StreamTagService } from './stream-tag.service';
import { CreateStreamTagDto } from './dto/create-stream-tag.dto';
import { UpdateStreamTagDto } from './dto/update-stream-tag.dto';

@Controller('stream-tag')
export class StreamTagController {
  constructor(private readonly streamTagService: StreamTagService) {}

  @Post()
  create(@Body() createStreamTagDto: CreateStreamTagDto) {
    return this.streamTagService.create(createStreamTagDto);
  }

  @Get()
  findAll() {
    return this.streamTagService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.streamTagService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStreamTagDto: UpdateStreamTagDto) {
    return this.streamTagService.update(+id, updateStreamTagDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.streamTagService.remove(+id);
  }
}
