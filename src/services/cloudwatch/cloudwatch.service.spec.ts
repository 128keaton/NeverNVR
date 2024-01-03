import { Test, TestingModule } from '@nestjs/testing';
import { CloudwatchService } from './cloudwatch.service';

describe('CloudwatchService', () => {
  let service: CloudwatchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CloudwatchService],
    }).compile();

    service = module.get<CloudwatchService>(CloudwatchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
