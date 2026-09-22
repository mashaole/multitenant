/** First screen the signed-in user can actually open (permission + module). */
export function homePath(
  has: (permission: string) => boolean,
  hasModule: (moduleKey: string) => boolean,
): string {
  if (has('orgs:create')) {
    return '/orgs';
  }
  if (has('summary:read') && hasModule('summary')) {
    return '/summary';
  }
  if (has('responses:submit') && hasModule('responses')) {
    return '/survey';
  }
  if (has('activity:read') && hasModule('activity')) {
    return '/activity';
  }
  if (has('users:create')) {
    return '/people';
  }
  if (has('orgs:update')) {
    return '/settings';
  }
  return '/login';
}
