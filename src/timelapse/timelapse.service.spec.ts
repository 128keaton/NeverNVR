import { Test, TestingModule } from '@nestjs/testing';
import { TimelapseService } from './timelapse.service';

describe('TimelapseService', () => {
  let service: TimelapseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TimelapseService],
    }).compile();

    service = module.get<TimelapseService>(TimelapseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
