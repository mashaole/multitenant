import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp } from '../src/create-app';
import { IDS } from '../prisma/ids';
import { ACTIVITY_EMITTER } from '../src/shared/ports/activity.port';
import { IActivityEmitter } from '../src/shared/ports/activity.port';
import { AppPrismaService } from '../src/shared/prisma/prisma.service';
import { withTenant } from '../src/shared/tenant/with-tenant';

describe('pulse api (e2e)', () => {
  let app: INestApplication;
  let drain: () => Promise<void>;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    drain = () => app.get<IActivityEmitter>(ACTIVITY_EMITTER).drain();
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(userId: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ userId })
      .expect(201);
    return res.body.token as string;
  }

  it('health', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });

  it('rejects TRACE', async () => {
    const res = await request(app.getHttpServer()).trace('/health');
    expect([404, 405]).toContain(res.status);
  });

  it('validation envelope has no stack', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ userId: 'not-a-uuid', extra: 'x' })
      .expect(422);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(JSON.stringify(res.body)).not.toMatch(/stack|prisma|SELECT/i);
  });

  it('cross-org survey is not found', async () => {
    const token = await login(IDS.user.maya);
    const res = await request(app.getHttpServer())
      .get(`/surveys/${IDS.survey.apex}/summary`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('apex manager is denied summary module', async () => {
    const token = await login(IDS.user.priya);
    const res = await request(app.getHttpServer())
      .get(`/surveys/${IDS.survey.apex}/summary`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    expect(res.body.error.code).toBe('FORBIDDEN_MODULE');
  });

  it('member cannot create a survey', async () => {
    const token = await login(IDS.user.liam);
    const res = await request(app.getHttpServer())
      .post('/surveys')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Nope',
        questions: [{ text: 'x', type: 'RATING', position: 1 }],
      })
      .expect(403);
    expect(res.body.error.code).toBe('FORBIDDEN_PERMISSION');
  });

  it('idempotent submit and conflict', async () => {
    const token = await login(IDS.user.liam);
    const payload = {
      answers: [
        { questionId: IDS.question.nw1, ratingValue: 5 },
        { questionId: IDS.question.nw2, yesNoValue: false },
      ],
    };
    const first = await request(app.getHttpServer())
      .post(`/surveys/${IDS.survey.northwind}/responses`)
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);
    const second = await request(app.getHttpServer())
      .post(`/surveys/${IDS.survey.northwind}/responses`)
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);
    expect(second.body.id).toBe(first.body.id);
    await request(app.getHttpServer())
      .post(`/surveys/${IDS.survey.northwind}/responses`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        answers: [
          { questionId: IDS.question.nw1, ratingValue: 1 },
          { questionId: IDS.question.nw2, yesNoValue: true },
        ],
      })
      .expect(409);
  });

  it('manager summary works', async () => {
    const token = await login(IDS.user.maya);
    const res = await request(app.getHttpServer())
      .get(`/surveys/${IDS.survey.northwind}/summary`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.completionCount).toBeGreaterThanOrEqual(1);
    expect(res.body.memberCount).toBeGreaterThanOrEqual(2);
  });

  it('manager cannot grant orgs:create via custom role', async () => {
    const token = await login(IDS.user.maya);
    const res = await request(app.getHttpServer())
      .post('/roles')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Evil', permissionKeys: ['orgs:create'] })
      .expect(403);
    expect(res.body.error.code).toBe('FORBIDDEN_PERMISSION');
  });

  it('manager can add another manager and does not see SUPER_ADMIN', async () => {
    const token = await login(IDS.user.maya);
    const roles = await request(app.getHttpServer())
      .get('/roles')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const names = (roles.body.items as Array<{ name: string }>).map((r) => r.name);
    expect(names).toContain('MANAGER');
    expect(names).not.toContain('SUPER_ADMIN');
    const created = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Riley Chen',
        email: `riley-${Date.now()}@northwind.local`,
        roleId: IDS.role.manager,
      })
      .expect(201);
    expect(created.body.roleId).toBe(IDS.role.manager);
  });

  it('second login revokes first at cap 1', async () => {
    const first = await login(IDS.user.owen);
    await login(IDS.user.owen);
    const res = await request(app.getHttpServer())
      .get('/surveys/active')
      .set('Authorization', `Bearer ${first}`)
      .expect(401);
    expect(res.body.error.code).toBe('AUTH_TOKEN_REVOKED');
  });

  it('logout then reuse is revoked', async () => {
    const token = await login(IDS.user.elise);
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    await request(app.getHttpServer())
      .get('/surveys/active')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('invalid answer rolls back the response row', async () => {
    const token = await login(IDS.user.elise);
    const bogus = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    await request(app.getHttpServer())
      .post(`/surveys/${IDS.survey.apex}/responses`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        answers: [
          { questionId: bogus, ratingValue: 3 },
          { questionId: IDS.question.ap2, yesNoValue: true },
        ],
      })
      .expect(422);
    const ok = await request(app.getHttpServer())
      .post(`/surveys/${IDS.survey.apex}/responses`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        answers: [
          { questionId: IDS.question.ap1, ratingValue: 3 },
          { questionId: IDS.question.ap2, yesNoValue: true },
        ],
      })
      .expect(201);
    expect(ok.body.id).toBeTruthy();
  });

  it('settings bounds', async () => {
    const token = await login(IDS.user.maya);
    await request(app.getHttpServer())
      .patch(`/orgs/${IDS.org.northwind}/settings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ maxSessionsPerUser: 0 })
      .expect(422);
    await request(app.getHttpServer())
      .patch(`/orgs/${IDS.org.apex}/settings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ maxSessionsPerUser: 2 })
      .expect(403);
  });

  it('duplicate email conflicts and soft-delete is idempotent', async () => {
    const token = await login(IDS.user.maya);
    const email = `kit-${Date.now()}@northwind.local`;
    const created = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Kit Rowe',
        email,
        roleId: IDS.role.member,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Kit Two',
        email,
        roleId: IDS.role.member,
      })
      .expect(409);
    await request(app.getHttpServer())
      .delete(`/users/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const second = await request(app.getHttpServer())
      .delete(`/users/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(second.body.unchanged).toBe(true);
  });

  it('member cannot see another member response through RLS', async () => {
    const prisma = app.get(AppPrismaService);
    const rows = await withTenant(
      prisma,
      {
        orgId: IDS.org.northwind,
        userId: IDS.user.liam,
        isOrgReader: false,
      },
      (tx) => tx.response.findMany({ where: { orgId: IDS.org.northwind } }),
    );
    expect(rows.every((row) => row.userId === IDS.user.liam)).toBe(true);
    expect(rows.some((row) => row.userId === IDS.user.nora)).toBe(false);
  });

  it('injection payload is not executed', async () => {
    const token = await login(IDS.user.maya);
    const res = await request(app.getHttpServer())
      .post('/surveys')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: "'; DROP TABLE surveys; --",
        questions: [{ text: "' OR 1=1", type: 'RATING', position: 1 }],
      })
      .expect(201);
    expect(res.body.title).toContain('DROP TABLE');
    await request(app.getHttpServer())
      .get('/health')
      .expect(200);
  });

  it('drains activity without secrets', async () => {
    await drain();
    const token = await login(IDS.user.maya);
    const res = await request(app.getHttpServer())
      .get('/activity')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/tokenHash|Bearer |@northwind/);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.limit).toBeLessThanOrEqual(100);
  });

  it('rejects out-of-range list limits and pages results', async () => {
    const token = await login(IDS.user.maya);
    await request(app.getHttpServer())
      .get('/users?limit=0')
      .set('Authorization', `Bearer ${token}`)
      .expect(422);
    await request(app.getHttpServer())
      .get('/users?limit=101')
      .set('Authorization', `Bearer ${token}`)
      .expect(422);
    const res = await request(app.getHttpServer())
      .get('/users?page=1&limit=1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(1);
    expect(res.body.total).toBeGreaterThan(1);
  });
});
