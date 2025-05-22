import { Module } from '@nestjs/common';
import { StreamService } from './stream.service';
import { StreamController } from './stream.controller';
import { ImagesModule } from '../../common/images/images.module';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { HttpModule } from '../../common/http/http.module';
import { StreamFacade } from './stream.facade';
import { StreamsGateway } from '../../common/rtc/streams/streams.gateway';

@Module({
  imports: [PrismaModule, ImagesModule, HttpModule],
  controllers: [StreamController],
  providers: [StreamService, StreamFacade, StreamsGateway],
})
export class StreamModule {}
