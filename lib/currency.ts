import { DateTime } from "luxon";

// Simple currency utils. Production should replace with real FX provider/cache.
const DEFAULT_USD_TO_KES = Number(process.env.USD_TO_KES_RATE) || 150.0;

export function convertUsdToKes(amountUsd: number): number {
  return Math.round(amountUsd * DEFAULT_USD_TO_KES * 100) / 100;
}

export function formatCurrency(
  amount: number,
  currency = "USD",
  locale = "en-US",
) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    amount,
  );
}

export function formatFlightTime(iso: string, tz?: string) {
  const dt = tz
    ? DateTime.fromISO(iso, { zone: "utc" }).setZone(tz)
    : DateTime.fromISO(iso).toLocal();
  return dt.toFormat("yyyy-LL-dd HH:mm z") + ` (${dt.toFormat("ZZ")})`;
}
