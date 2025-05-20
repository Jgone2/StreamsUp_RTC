import { Test, TestingModule } from '@nestjs/testing';
import { StreamsGateway } from './streams.gateway';

describe('StreamsGateway', () => {
  let gateway: StreamsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamsGateway],
    }).compile();

    gateway = module.get<StreamsGateway>(StreamsGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
