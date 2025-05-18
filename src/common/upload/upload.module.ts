import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { S3Client } from '@aws-sdk/client-s3';
import { UploadFacade } from './upload.facade';

@Module({
  controllers: [UploadController],
  providers: [
    {
      provide: S3Client,
      useFactory: () => {
        return new S3Client({
          region: process.env.AWS_REGION,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY,
            secretAccessKey: process.env.AWS_SECRET_KEY,
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
