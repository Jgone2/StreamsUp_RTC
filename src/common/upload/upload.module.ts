import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { S3Client } from '@aws-sdk/client-s3';
import { UploadFacade } from './upload.facade';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [UploadController],
  providers: [
    {
      provide: S3Client,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return new S3Client({
          region: config.get<string>('AWS_REGION'),
          credentials: {
            accessKeyId: config.get<string>('AWS_ACCESS_KEY'),
            secretAccessKey: config.get<string>('AWS_SECRET_KEY'),
          },
        });
      },
    },
    UploadService,
    UploadFacade,
  ],
  exports: [UploadFacade],
})
export class UploadModule {}
