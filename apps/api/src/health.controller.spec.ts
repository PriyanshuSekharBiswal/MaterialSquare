import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from './prisma/prisma.service';

describe('Health checks', () => {
  it('reports readiness only when the database responds', async () => {
    const query = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const controller = new HealthController({ $queryRaw: query } as unknown as PrismaService);
    expect(controller.live()).toEqual({status:'ok'});
    await expect(controller.ready()).resolves.toEqual({status:'ready'});
    query.mockRejectedValue(new Error('private database connection details'));
    await expect(controller.ready()).rejects.toThrow(ServiceUnavailableException);
    await expect(controller.ready()).rejects.toThrow('Service not ready');
  });
});
