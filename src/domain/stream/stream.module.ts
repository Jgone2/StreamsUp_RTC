import { Module } from '@nestjs/common';
import { StreamService } from './stream.service';
import { StreamController } from './stream.controller';
import { ImagesModule } from '../../common/images/images.module';

@Module({
  imports: [ImagesModule],
  controllers: [StreamController],
  providers: [StreamService],
})
export class StreamModule {}
