import { Test, TestingModule } from '@nestjs/testing';
import { GatewayEventsService } from './gateway-events.service';

describe('GatewayEventsService', () => {
  let service: GatewayEventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GatewayEventsService],
    }).compile();

    service = module.get<GatewayEventsService>(GatewayEventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
