/** Empty → undefined; otherwise floor ≥ 1. Used by structural and run-config fields. */
export function parseOptionalPositiveInt(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 1) return undefined;
  return Math.floor(parsed);
}
