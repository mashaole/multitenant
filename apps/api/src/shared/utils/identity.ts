export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeOrgName(name: string): string {
  return name.trim();
}
