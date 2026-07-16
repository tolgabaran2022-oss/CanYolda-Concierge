import { useEffect, useState } from "react";

/**
 * Returns true only when promotedUntil is a valid future timestamp.
 * Invalid / null / expired → false.
 * This is the single source of truth for active promotion state on the client.
 */
export function isListingPromoted(
  promotedUntil: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!promotedUntil) return false;
  const ts = new Date(promotedUntil).getTime();
  if (Number.isNaN(ts)) return false;
  return ts > now.getTime();
}

/**
 * Formats remaining promotion time as a human-readable Turkish string.
 *
 * Rules (spec §6):
 *   ≥ 1 day          → "2 gün 4 saat kaldı"
 *   < 1 day, ≥ 1 hr  → "5 saat 18 dakika kaldı"
 *   < 1 hour          → "43 dakika kaldı"
 *   expired / invalid → null  (caller hides the label)
 *
 * Never returns negative strings.
 */
export function formatRemainingTime(
  promotedUntil: string | null | undefined,
  now: Date = new Date()
): string | null {
  if (!promotedUntil) return null;
  const ts = new Date(promotedUntil).getTime();
  if (Number.isNaN(ts)) return null;
  const diffMs = ts - now.getTime();
  if (diffMs <= 0) return null;

  const totalMinutes = Math.floor(diffMs / 60_000);
  const totalHours   = Math.floor(diffMs / 3_600_000);
  const days         = Math.floor(diffMs / 86_400_000);

  if (days >= 1) {
    const remHours = totalHours - days * 24;
    return remHours > 0
      ? `${days} gün ${remHours} saat kaldı`
      : `${days} gün kaldı`;
  }

  if (totalHours >= 1) {
    const remMins = totalMinutes - totalHours * 60;
    return remMins > 0
      ? `${totalHours} saat ${remMins} dakika kaldı`
      : `${totalHours} saat kaldı`;
  }

  return totalMinutes > 0 ? `${totalMinutes} dakika kaldı` : null;
}

/**
 * Hook: returns a Date that updates every `intervalMs` milliseconds.
 * Used at the section level so one interval drives all cards — not one per card.
 * Default interval: 60 seconds (minute-level accuracy for countdown labels).
 *
 * Cleans up on unmount.
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
