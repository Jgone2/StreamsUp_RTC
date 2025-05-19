import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { StreamService } from './stream.service';
import { CreateStreamRequestDto } from './dto/create-stream-request.dto';
import { UploadFileInterceptor } from '../../common/upload/decorator/upload-file-interceptor.decorator';
import { JwtAuthGuard } from 'src/common/auth/guard/jwt-auth.guard';
import { LoginUser } from '../../common/auth/decorator/login-user.decorator';

@Controller('stream')
export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UploadFileInterceptor()
  create(
    @Body() createStreamDto: CreateStreamRequestDto,
    @LoginUser('id') userId: number,
  ) {
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
