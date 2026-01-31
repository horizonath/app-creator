/**
 * Day-boundary helpers using Asia/Jakarta semantics without relying on Intl time-zone conversions.
 * We use a fixed offset (+07:00) to compute "today" boundaries.
 * This matches your product requirement (timezone Asia/Jakarta).
 */
const JKT_OFFSET_MIN = 7 * 60;

export function nowUtc(): Date {
  return new Date();
}

export function toJakartaDateParts(d: Date): { y: number; m: number; day: number } {
  // convert UTC time to "Jakarta local" by adding offset minutes
  const ms = d.getTime() + JKT_OFFSET_MIN * 60_000;
  const j = new Date(ms);
  return { y: j.getUTCFullYear(), m: j.getUTCMonth() + 1, day: j.getUTCDate() };
}

export function startOfJakartaDayUtc(d: Date): Date {
  const { y, m, day } = toJakartaDateParts(d);
  // start of day in Jakarta local, convert back to UTC by subtracting offset
  const startJakartaAsUtc = Date.UTC(y, m - 1, day, 0, 0, 0);
  return new Date(startJakartaAsUtc - JKT_OFFSET_MIN * 60_000);
}

export function endOfJakartaDayUtc(d: Date): Date {
  const start = startOfJakartaDayUtc(d);
  return new Date(start.getTime() + 24 * 60 * 60_000);
}

export function dateKeyJakarta(d: Date): Date {
  // store date key as startOfJakartaDayUtc
  return startOfJakartaDayUtc(d);
}
