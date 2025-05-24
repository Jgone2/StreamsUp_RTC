import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Param,
  HttpCode,
  HttpStatus,
  Get,
  Headers,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StreamService } from './stream.service';
import { CreateStreamRequestDto } from './dto/create-stream-request.dto';
import { JwtAuthGuard } from 'src/common/auth/guard/jwt-auth.guard';
import { LoginUser } from '../../common/auth/decorator/login-user.decorator';
import { ApiConsumes } from '@nestjs/swagger';

@Controller('stream')
export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('thumbnailFile'))
  async createStream(
    @UploadedFile() thumbnailFile: Express.Multer.File,
    @Body() createStreamDto: CreateStreamRequestDto,
    @LoginUser('userId') userId: number,
    @Headers('authorization') authToken: string,
  ) {
    console.log(`userId: ${userId}`);
    return this.streamService.createStream(
      { ...createStreamDto, thumbnailFile },
      userId,
      authToken,
    );
  }

  @Post(':streamId/end')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async endStream(
    @Param('streamId') streamId: string,
    @LoginUser('userId') userId: number,
    @Headers('authorization') authToken: string,
  ) {
    return this.streamService.endStream(+streamId, userId, authToken);
  }

  @Get(':streamId')
  @HttpCode(HttpStatus.OK)
  getStreamStatus(@Param('streamId') streamId: string) {
    return this.streamService.findStreamById(+streamId);
  }

  @Post(':streamId/leave')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async leaveStream(
    @Param('streamId') streamId: string,
    @LoginUser('userId') userId: number,
  ) {
    await this.streamService.leaveStream(+streamId, userId);
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
