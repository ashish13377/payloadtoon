export function toDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function subtractDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() - days);
  return copy;
}

export function dateRangeKeys(days: number, endDate = new Date()): string[] {
  return Array.from({ length: days }, (_, index) => {
    const diff = days - index - 1;
    return toDateKey(subtractDays(endDate, diff));
  });
}
