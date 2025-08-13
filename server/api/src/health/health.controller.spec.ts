import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return health status', () => {
      const result = controller.check();
      
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(typeof result.uptime).toBe('number');
    });
  });

  describe('liveness', () => {
    it('should return liveness status', () => {
      const result = controller.liveness();
      
      expect(result).toHaveProperty('status', 'alive');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('readiness', () => {
    it('should return readiness status', () => {
      const result = controller.readiness();
      
      expect(result).toHaveProperty('status', 'ready');
      expect(result).toHaveProperty('timestamp');
    });
  });
});
