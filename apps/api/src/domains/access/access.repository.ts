import { TenantTx } from '../../shared/tenant/with-tenant';

export const ACCESS_REPOSITORY = Symbol('ACCESS_REPOSITORY');

export interface IAccessRepository {
  listPermissions(): Promise<Array<{ key: string; domain: string; description: string }>>;
  listRoles(
    tx: TenantTx,
    orgId: string,
  ): Promise<
    Array<{
      id: string;
      name: string;
      isSystem: boolean;
      orgId: string | null;
      perms: Array<{ permission: { key: string } }>;
    }>
  >;
  findPermissionsByKeys(keys: string[]): Promise<Array<{ id: string; key: string }>>;
  createRole(
    tx: TenantTx,
    data: { orgId: string; name: string; permissionIds: string[] },
  ): Promise<{ id: string; name: string }>;
  findRole(
    tx: TenantTx,
    id: string,
  ): Promise<{
    id: string;
    name: string;
    orgId: string | null;
    isSystem: boolean;
  } | null>;
  countUsersForRole(tx: TenantTx, roleId: string): Promise<number>;
  deleteRole(tx: TenantTx, id: string): Promise<void>;
}
