export const ORG_READER_PERMS = new Set([
  'summary:read',
  'activity:read',
  'users:create',
  'users:delete',
  'roles:assign',
  'orgs:update',
  'orgs:create',
  'modules:manage',
]);

export function isOrgReader(permissions: string[]): boolean {
  return permissions.some((p) => ORG_READER_PERMS.has(p));
}

export function assertPermissionSubset(actor: string[], target: string[]): boolean {
  const have = new Set(actor);
  return target.every((p) => have.has(p));
}

export const MODULE_BY_DOMAIN: Record<string, string> = {
  surveys: 'surveys',
  responses: 'responses',
  summary: 'summary',
  activity: 'activity',
};
