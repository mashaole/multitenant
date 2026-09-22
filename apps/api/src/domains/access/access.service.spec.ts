jest.mock('../../shared/tenant/with-tenant', () => ({
  withTenant: (_prisma: unknown, _scope: unknown, work: (tx: unknown) => unknown) =>
    work({}),
}));

import { AccessService } from './access.service';
import { IAccessRepository } from './access.repository';
import { IActivityEmitter } from '../../shared/ports/activity.port';
import { AppError } from '../../shared/http/error-codes';

describe('AccessService', () => {
  const repo: IAccessRepository = {
    listPermissions: jest.fn(async () => [
      { key: 'roles:create', domain: 'access', description: 'Create roles' },
      { key: 'orgs:create', domain: 'admin', description: 'Create orgs' },
    ]),
    listRoles: jest.fn(),
    findPermissionsByKeys: jest.fn(async (keys: string[]) =>
      keys.map((key) => ({ id: key, key })),
    ),
    createRole: jest.fn(),
  };
  const activity: IActivityEmitter = { emit: jest.fn(), drain: jest.fn() };
  const service = new AccessService(repo, {} as never, activity);

  it('groups only permissions the actor already holds', async () => {
    const page = await service.listPermissions(['roles:create']);
    expect(page.total).toBe(1);
    expect(page.items).toHaveLength(1);
    expect(page.items[0].domain).toBe('access');
    expect(page.limit).toBe(20);
  });

  it('hides custom roles that belong to another org', async () => {
    const actor = {
      sub: 'u',
      orgId: 'org-a',
      roleId: 'r',
      roleName: 'MANAGER',
      permissions: ['roles:read', 'summary:read'],
      jti: 'j',
    };
    (repo.listRoles as jest.Mock).mockResolvedValue([
      {
        id: 'sys',
        name: 'MANAGER',
        isSystem: true,
        orgId: null,
        perms: [{ permission: { key: 'roles:read' } }],
      },
      {
        id: 'own',
        name: 'Lead',
        isSystem: false,
        orgId: 'org-a',
        perms: [{ permission: { key: 'summary:read' } }],
      },
      {
        id: 'foreign',
        name: 'Spy',
        isSystem: false,
        orgId: 'org-b',
        perms: [{ permission: { key: 'summary:read' } }],
      },
    ]);
    const page = await service.listRoles(actor);
    const names = page.items.map((role) => role.name);
    expect(names).toEqual(['MANAGER', 'Lead']);
  });

  it('refuses a grant the actor does not hold', async () => {
    await expect(
      service.createRole(
        {
          sub: 'u',
          orgId: 'o',
          roleId: 'r',
          roleName: 'MANAGER',
          permissions: ['roles:create'],
          jti: 'j',
        },
        'Evil',
        ['orgs:create'],
      ),
    ).rejects.toBeInstanceOf(AppError);
    expect(activity.emit).not.toHaveBeenCalled();
  });
});
