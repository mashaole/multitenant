export function isoWeekStart(input: Date = new Date()): Date {
  const copy = new Date(
    Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()),
  );
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() - day + 1);
  return copy;
}

export function parseWeekStart(value?: string): Date {
  if (!value) {
    return isoWeekStart();
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return isoWeekStart();
  }
  return isoWeekStart(parsed);
}

export function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}
