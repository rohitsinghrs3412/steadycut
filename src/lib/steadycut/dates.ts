export function toDateKey(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function formatDisplayDate(dateKey: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: options?.year ?? "numeric",
    ...options,
  }).format(new Date(`${dateKey}T12:00:00`));
}

export function formatShortDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateKey}T12:00:00`));
}

export function daysBetween(startDateKey: string, endDateKey: string) {
  const start = new Date(`${startDateKey}T12:00:00`).getTime();
  const end = new Date(`${endDateKey}T12:00:00`).getTime();

  return Math.max((end - start) / 86_400_000, 1);
}
