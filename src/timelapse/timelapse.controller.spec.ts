import { Test, TestingModule } from '@nestjs/testing';
import { TimelapseController } from './timelapse.controller';

describe('TimelapseController', () => {
  let controller: TimelapseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimelapseController],
    }).compile();

    controller = module.get<TimelapseController>(TimelapseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
