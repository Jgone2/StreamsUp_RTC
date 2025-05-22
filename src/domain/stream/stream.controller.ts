import {
  Controller,
  Post,
  Body,
  // UseGuards,
  UseInterceptors,
  UploadedFile,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
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
  createStream(
    @UploadedFile() thumbnailFile: Express.Multer.File,
    @Body() createStreamDto: CreateStreamRequestDto,
    // @LoginUser('id') userId: number,
  ) {
    return this.streamService.createStream(
      { ...createStreamDto, thumbnailFile },
      1,
    );
  }

  @Post(':streamId/:userId')
  @HttpCode(HttpStatus.OK)
  endStream(
    @Param('streamId') streamId: string,
    @Param('userId') userId: string,
  ) {
    return this.streamService.endStream(+streamId, +userId);
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
  }*/
}
