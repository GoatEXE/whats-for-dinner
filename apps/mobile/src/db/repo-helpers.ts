export function fromSqliteBoolean(value: number | boolean | null | undefined) {
  return Boolean(value);
}

export function toSqliteBoolean(value: boolean | null | undefined): 0 | 1 {
  return value ? 1 : 0;
}

export function buildPlaceholders(count: number) {
  return Array.from({ length: count }, () => "?").join(", ");
}

export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}
