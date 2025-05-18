import { Controller, Post, Body } from '@nestjs/common';
import { StreamService } from './stream.service';
import { CreateStreamRequestDto } from './dto/create-stream-request.dto';
import { UploadFileInterceptor } from '../../common/decorator/upload/upload-file-interceptor.decorator';

@Controller('stream')
export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  @Post()
  @UploadFileInterceptor()
  create(@Body() createStreamDto: CreateStreamRequestDto, userId: string) {
    return this.streamService.createStream(createStreamDto, userId);
  }

  /*@Get()
  findAll() {
    return this.streamService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.streamService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateStreamDto: UpdateStreamRequestDto,
  ) {
    return this.streamService.update(+id, updateStreamDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.streamService.remove(+id);
  }*/
}
