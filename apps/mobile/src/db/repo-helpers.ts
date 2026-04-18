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

function padIsoNumber(value: number) {
  return String(value).padStart(2, "0");
}

function formatLocalIsoDate(date: Date) {
  return `${date.getFullYear()}-${padIsoNumber(date.getMonth() + 1)}-${padIsoNumber(date.getDate())}`;
}

export function getWeekStartIsoDate(referenceDate = new Date()) {
  const date = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + diff);

  return formatLocalIsoDate(date);
}

export function addDaysToIsoDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function addWeeksToIsoDate(value: string, weeks: number) {
  return addDaysToIsoDate(value, weeks * 7);
}
