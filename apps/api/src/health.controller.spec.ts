import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from './prisma/prisma.service';

const productionKeys = [
  'NODE_ENV', 'APP_ENV', 'CORS_ORIGINS', 'MSG91_AUTHKEY', 'AWS_S3_BUCKET',
  'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_PUBLIC_URL', 'AWS_S3_ENDPOINT',
] as const;

describe('Health checks', () => {
  const previous = new Map<string, string | undefined>();
  beforeEach(() => {
    for (const key of productionKeys) previous.set(key, process.env[key]);
  });
  afterEach(() => {
    for (const key of productionKeys) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('reports readiness only when the database responds', async () => {
    const query = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const controller = new HealthController({ $queryRaw: query } as unknown as PrismaService);
    expect(controller.live()).toEqual({status:'ok'});
    await expect(controller.ready()).resolves.toEqual({status:'ready'});
    query.mockRejectedValue(new Error('private database connection details'));
    await expect(controller.ready()).rejects.toThrow(ServiceUnavailableException);
    await expect(controller.ready()).rejects.toThrow('Service not ready');
  });

  it('keeps production unready until OTP, exact HTTPS origins, and image storage are configured', async () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_ENV = 'production';
    process.env.CORS_ORIGINS = 'https://shop.example.test,https://staff.example.test';
    delete process.env.MSG91_AUTHKEY;
    delete process.env.AWS_S3_BUCKET;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_S3_PUBLIC_URL;
    delete process.env.AWS_S3_ENDPOINT;
    const controller = new HealthController({
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaService);
    await expect(controller.ready()).rejects.toThrow('Service not ready');

    process.env.MSG91_AUTHKEY = 'test-only-authkey';
    process.env.AWS_S3_BUCKET = 'catalogue-images';
    process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.AWS_S3_PUBLIC_URL = 'https://cdn.example.test/material-square';
    await expect(controller.ready()).resolves.toEqual({ status: 'ready' });
  });

  it('requires a configured S3-compatible endpoint to use HTTPS', async () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_ENV = 'production';
    process.env.CORS_ORIGINS = 'https://shop.example.test,https://staff.example.test';
    process.env.MSG91_AUTHKEY = 'test-only-authkey';
    process.env.AWS_S3_BUCKET = 'catalogue-images';
    process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.AWS_S3_PUBLIC_URL = 'https://cdn.example.test/material-square';
    const controller = new HealthController({
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaService);
    process.env.AWS_S3_ENDPOINT = 'http://127.0.0.1:9000';
    await expect(controller.ready()).rejects.toThrow(ServiceUnavailableException);
    process.env.AWS_S3_ENDPOINT = 'https://storage.example.test';
    await expect(controller.ready()).resolves.toEqual({ status: 'ready' });
  });

  it('does not accept localhost or non-HTTPS origins for a production readiness check', async () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_ENV = 'production';
    process.env.CORS_ORIGINS = 'http://localhost:5173';
    process.env.MSG91_AUTHKEY = 'test-only-authkey';
    process.env.AWS_S3_BUCKET = 'catalogue-images';
    process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.AWS_S3_PUBLIC_URL = 'https://cdn.example.test/material-square';
    const controller = new HealthController({
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaService);
    await expect(controller.ready()).rejects.toThrow(ServiceUnavailableException);
  });

  it('keeps the explicitly isolated demo deployment healthy without production integrations', async () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_ENV = 'demo';
    delete process.env.CORS_ORIGINS;
    delete process.env.MSG91_AUTHKEY;
    delete process.env.AWS_S3_BUCKET;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_S3_PUBLIC_URL;
    const controller = new HealthController({
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaService);
    await expect(controller.ready()).resolves.toEqual({ status: 'ready' });
  });
});
