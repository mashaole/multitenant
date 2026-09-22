/** Session GUC `app.is_org_reader` — SQL policies never name SUPER_ADMIN/MANAGER. */
export const ORG_READER_PERMS = new Set([
  'summary:read',
  'activity:read',
  'users:create',
  'users:delete',
  'orgs:update',
  'orgs:create',
  'modules:manage',
]);

export function isOrgReader(permissions: string[]): boolean {
  return permissions.some((p) => ORG_READER_PERMS.has(p));
}

export function canManageTenants(permissions: string[]): boolean {
  return permissions.includes('orgs:create');
}

export function assertPermissionSubset(actor: string[], target: string[]): boolean {
  const have = new Set(actor);
  return target.every((p) => have.has(p));
}

/** System roles (orgId null) are global. Custom roles stay in the creating org. */
export function isRoleAssignableToOrg(
  roleOrgId: string | null,
  targetOrgId: string,
): boolean {
  return roleOrgId === null || roleOrgId === targetOrgId;
}

export const MODULE_BY_DOMAIN: Record<string, string> = {
  surveys: 'surveys',
  responses: 'responses',
  summary: 'summary',
  activity: 'activity',
};
