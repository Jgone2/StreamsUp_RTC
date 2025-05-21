import { Module } from '@nestjs/common';
import { StreamService } from './stream.service';
import { StreamController } from './stream.controller';
import { ImagesModule } from '../../common/images/images.module';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { HttpModule } from '../../common/http/http.module';

@Module({
  imports: [PrismaModule, ImagesModule, HttpModule],
  controllers: [StreamController],
  providers: [StreamService],
})
export class StreamModule {}
