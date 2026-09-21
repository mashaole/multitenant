import { assertPermissionSubset, canManageTenants, isOrgReader } from './permissions';

describe('assertPermissionSubset', () => {
  it('allows an empty grant', () => {
    expect(assertPermissionSubset(['orgs:create'], [])).toBe(true);
  });

  it('rejects a key the actor lacks', () => {
    expect(assertPermissionSubset(['roles:create'], ['orgs:create'])).toBe(false);
  });

  it('accepts a true subset', () => {
    expect(
      assertPermissionSubset(
        ['roles:create', 'roles:read', 'users:create'],
        ['roles:create', 'roles:read'],
      ),
    ).toBe(true);
  });
});

describe('canManageTenants', () => {
  it('is true only with orgs:create', () => {
    expect(canManageTenants(['orgs:update'])).toBe(false);
    expect(canManageTenants(['orgs:create'])).toBe(true);
  });
});

describe('isOrgReader', () => {
  it('is false for member-only permissions', () => {
    expect(isOrgReader(['responses:submit', 'surveys:read'])).toBe(false);
  });

  it('is true when a reader permission is present', () => {
    expect(isOrgReader(['summary:read'])).toBe(true);
  });
});
