import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp } from '../src/create-app';

describe('rate limits (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.THROTTLE_TTL_MS = '60000';
    process.env.THROTTLE_LIMIT = '40';
    process.env.THROTTLE_LOGIN_LIMIT = '3';
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    process.env.THROTTLE_LIMIT = '10000';
    process.env.THROTTLE_LOGIN_LIMIT = '10000';
  });

  it('returns 429 on the login bucket', async () => {
    const body = {
      email: 'nobody@pulse.local',
      password: 'Pulse!dev1',
      organization: 'Nowhere',
    };
    for (let i = 0; i < 3; i += 1) {
      await request(app.getHttpServer()).post('/auth/login').send(body);
    }
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send(body)
      .expect(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.headers['retry-after']).toBeDefined();
    expect(JSON.stringify(res.body)).not.toMatch(/stack|prisma|SELECT/i);
  });

  it('returns 429 on the global bucket', async () => {
    let last = await request(app.getHttpServer()).get('/health');
    for (let i = 0; i < 40; i += 1) {
      last = await request(app.getHttpServer()).get('/health');
    }
    expect(last.status).toBe(429);
    expect(last.body.error.code).toBe('RATE_LIMITED');
  });
});
