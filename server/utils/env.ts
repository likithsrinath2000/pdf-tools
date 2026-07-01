/**
 * Parses an environment value as a positive integer, falling back to `fallback`
 * when unset, non-numeric, zero, or negative. Prevents NaN/invalid values from
 * silently disabling timeouts, retention windows, etc.
 */
export function positiveIntEnv(raw: string | undefined, fallback: number): number {
  const n = parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Parses an environment value as a non-negative integer (0 allowed), falling
 * back to `fallback` when unset, non-numeric, or negative.
 */
export function nonNegativeIntEnv(raw: string | undefined, fallback: number): number {
  const n = parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}
