import {
  Controller,
  Post,
  Body,
  // UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StreamService } from './stream.service';
import { CreateStreamRequestDto } from './dto/create-stream-request.dto';
// import { JwtAuthGuard } from 'src/common/auth/guard/jwt-auth.guard';
import { LoginUser } from '../../common/auth/decorator/login-user.decorator';
import { ApiConsumes } from '@nestjs/swagger';
// import { TmpJwtGuard } from '../../common/rtc/streams/guard/tmp-jwt.guard';

@Controller('stream')
export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  @Post()
  // @UseGuards(TmpJwtGuard)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('thumbnailFile'))
  create(
    @UploadedFile() thumbnailFile: Express.Multer.File,
    @Body() createStreamDto: CreateStreamRequestDto,
    // @LoginUser('id') userId: number,
  ) {
    return this.streamService.createStream(
      { ...createStreamDto, thumbnailFile },
      1,
    );
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
