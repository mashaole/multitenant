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
    const grouped = await service.listPermissions(['roles:create']);
    expect(Object.keys(grouped)).toEqual(['access']);
    expect(grouped.access).toHaveLength(1);
    expect(grouped.admin).toBeUndefined();
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
