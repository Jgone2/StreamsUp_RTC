import { Test, TestingModule } from '@nestjs/testing';
import { StreamTagController } from './stream-tag.controller';
import { StreamTagService } from './stream-tag.service';

describe('StreamTagController', () => {
  let controller: StreamTagController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StreamTagController],
      providers: [StreamTagService],
    }).compile();

    controller = module.get<StreamTagController>(StreamTagController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
