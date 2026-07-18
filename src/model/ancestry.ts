/**
 * True when `nodeId` is `ancestorId` or lies under it via `getParent` links.
 * Cycle-safe: a corrupt parent chain returns false instead of looping.
 */
export function isAncestorOf(
  getParent: (id: string) => string | undefined,
  ancestorId: string,
  nodeId: string,
): boolean {
  if (ancestorId === nodeId) return true;
  const seen = new Set<string>();
  let current: string | undefined = nodeId;
  while (current !== undefined) {
    if (seen.has(current)) return false;
    seen.add(current);
    const parent = getParent(current);
    if (parent === undefined) return false;
    if (parent === ancestorId) return true;
    current = parent;
  }
  return false;
}
