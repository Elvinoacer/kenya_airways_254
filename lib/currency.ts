import { DateTime } from "luxon";

// Simple currency utils. Production should replace with real FX provider/cache.
function getUsdToKesRate(): number {
  const fromEnv =
    process.env.USD_TO_KES_RATE ?? process.env.NEXT_PUBLIC_USD_TO_KES_RATE;
  const parsed = Number(fromEnv);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return 150.0;
}

export function convertUsdToKes(amountUsd: number): number {
  const rate = getUsdToKesRate();
  return Math.round(amountUsd * rate * 100) / 100;
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
