import { PrismaClient, QuestionType } from '@prisma/client';
import { IDS, SEED_PASSWORD } from './ids';
import { hashPassword } from '../src/shared/crypto/password-hash';

const prisma = new PrismaClient();

const PERMS: Array<{ key: string; domain: string; description: string }> = [
  { key: 'surveys:create', domain: 'surveys', description: 'Create surveys' },
  { key: 'surveys:read', domain: 'surveys', description: 'Read surveys' },
  { key: 'responses:submit', domain: 'responses', description: 'Submit responses' },
  { key: 'summary:read', domain: 'summary', description: 'Read weekly summary' },
  { key: 'roles:create', domain: 'access', description: 'Create roles' },
  { key: 'roles:read', domain: 'access', description: 'Read roles' },
  { key: 'users:create', domain: 'admin', description: 'Create users' },
  { key: 'users:delete', domain: 'admin', description: 'Soft-delete users' },
  { key: 'orgs:create', domain: 'admin', description: 'Create organizations' },
  { key: 'orgs:update', domain: 'admin', description: 'Update org settings' },
  { key: 'modules:manage', domain: 'admin', description: 'Grant org modules' },
  { key: 'activity:read', domain: 'activity', description: 'Read activity' },
];

const MODULES = [
  { key: 'surveys', name: 'Surveys' },
  { key: 'responses', name: 'Responses' },
  { key: 'summary', name: 'Summary' },
  { key: 'activity', name: 'Activity' },
];

async function main(): Promise<void> {
  await prisma.answer.deleteMany();
  await prisma.response.deleteMany();
  await prisma.question.deleteMany();
  await prisma.survey.deleteMany();
  await prisma.session.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.orgModule.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.module.deleteMany();

  const permissions = [];
  for (const p of PERMS) {
    permissions.push(await prisma.permission.create({ data: p }));
  }
  const byKey = Object.fromEntries(permissions.map((p) => [p.key, p.id]));

  const modules = [];
  for (const m of MODULES) {
    modules.push(await prisma.module.create({ data: m }));
  }
  const modByKey = Object.fromEntries(modules.map((m) => [m.key, m.id]));

  await prisma.organization.createMany({
    data: [
      { id: IDS.org.system, name: 'System', isSystem: true, maxSessionsPerUser: 1 },
      { id: IDS.org.northwind, name: 'Northwind Retail', maxSessionsPerUser: 1 },
      { id: IDS.org.apex, name: 'Apex Mining', maxSessionsPerUser: 1 },
    ],
  });

  const allModRows = modules.flatMap((m) => [
    { orgId: IDS.org.system, moduleId: m.id },
    { orgId: IDS.org.northwind, moduleId: m.id },
  ]);
  const apexMods = modules
    .filter((m) => m.key !== 'summary')
    .map((m) => ({ orgId: IDS.org.apex, moduleId: m.id }));
  await prisma.orgModule.createMany({ data: [...allModRows, ...apexMods] });

  const keys = (list: string[]) => list.map((k) => ({ permissionId: byKey[k] }));

  await prisma.role.create({
    data: {
      id: IDS.role.superAdmin,
      name: 'SUPER_ADMIN',
      isSystem: true,
      perms: { create: permissions.map((p) => ({ permissionId: p.id })) },
    },
  });
  await prisma.role.create({
    data: {
      id: IDS.role.manager,
      name: 'MANAGER',
      isSystem: true,
      perms: {
        create: keys([
          'surveys:create',
          'surveys:read',
          'responses:submit',
          'summary:read',
          'activity:read',
          'roles:create',
          'roles:read',
          'users:create',
          'users:delete',
          'orgs:update',
        ]),
      },
    },
  });
  await prisma.role.create({
    data: {
      id: IDS.role.member,
      name: 'MEMBER',
      isSystem: true,
      perms: { create: keys(['responses:submit', 'surveys:read']) },
    },
  });
  await prisma.role.create({
    data: {
      id: IDS.role.teamLead,
      orgId: IDS.org.northwind,
      name: 'Team Lead',
      isSystem: false,
      perms: { create: keys(['surveys:read', 'summary:read', 'responses:submit']) },
    },
  });

  const users = [
    { id: IDS.user.ava, orgId: IDS.org.system, roleId: IDS.role.superAdmin, name: 'Ava Stone', email: IDS.email.ava },
    { id: IDS.user.maya, orgId: IDS.org.northwind, roleId: IDS.role.manager, name: 'Maya Chen', email: IDS.email.maya },
    { id: IDS.user.liam, orgId: IDS.org.northwind, roleId: IDS.role.member, name: 'Liam Park', email: IDS.email.liam },
    { id: IDS.user.nora, orgId: IDS.org.northwind, roleId: IDS.role.member, name: 'Nora Vale', email: IDS.email.nora },
    { id: IDS.user.jordan, orgId: IDS.org.northwind, roleId: IDS.role.teamLead, name: 'Jordan Reed', email: IDS.email.jordan },
    { id: IDS.user.priya, orgId: IDS.org.apex, roleId: IDS.role.manager, name: 'Priya Shah', email: IDS.email.priya },
    { id: IDS.user.owen, orgId: IDS.org.apex, roleId: IDS.role.member, name: 'Owen Brooks', email: IDS.email.owen },
    { id: IDS.user.elise, orgId: IDS.org.apex, roleId: IDS.role.member, name: 'Elise Ng', email: IDS.email.elise },
  ];
  const passwordHash = await hashPassword(SEED_PASSWORD);
  await prisma.user.createMany({
    data: users.map((user) => ({ ...user, passwordHash })),
  });

  await prisma.survey.create({
    data: {
      id: IDS.survey.northwind,
      orgId: IDS.org.northwind,
      title: 'Northwind weekly pulse',
      isActive: true,
      questions: {
        create: [
          { id: IDS.question.nw1, orgId: IDS.org.northwind, text: 'How clear was this week?', type: QuestionType.RATING, position: 1 },
          { id: IDS.question.nw2, orgId: IDS.org.northwind, text: 'Did you use the new process?', type: QuestionType.YES_NO, position: 2 },
        ],
      },
    },
  });
  await prisma.survey.create({
    data: {
      id: IDS.survey.apex,
      orgId: IDS.org.apex,
      title: 'Apex weekly pulse',
      isActive: true,
      questions: {
        create: [
          { id: IDS.question.ap1, orgId: IDS.org.apex, text: 'Safety confidence this week', type: QuestionType.RATING, position: 1 },
          { id: IDS.question.ap2, orgId: IDS.org.apex, text: 'Did you complete the checklist?', type: QuestionType.YES_NO, position: 2 },
        ],
      },
    },
  });

  const weekStart = isoWeekStart(new Date());
  await prisma.response.create({
    data: {
      orgId: IDS.org.northwind,
      surveyId: IDS.survey.northwind,
      userId: IDS.user.nora,
      weekStart,
      answers: {
        create: [
          { orgId: IDS.org.northwind, questionId: IDS.question.nw1, ratingValue: 4 },
          { orgId: IDS.org.northwind, questionId: IDS.question.nw2, yesNoValue: true },
        ],
      },
    },
  });

  void modByKey;
}

function isoWeekStart(d: Date): Date {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() - day + 1);
  return copy;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
