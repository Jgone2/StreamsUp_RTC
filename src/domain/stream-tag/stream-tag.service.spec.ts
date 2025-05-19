import { Test, TestingModule } from '@nestjs/testing';
import { StreamTagService } from './stream-tag.service';

describe('StreamTagService', () => {
  let service: StreamTagService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamTagService],
    }).compile();

    service = module.get<StreamTagService>(StreamTagService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
