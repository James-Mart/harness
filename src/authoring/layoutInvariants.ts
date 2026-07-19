import {
  containsRect,
  flowNodeRects,
  rectsOverlap,
  type FlowGeometryNode,
  type FlowRect,
} from "@/authoring/flowGeometry";

export type LayoutInvariantViolation =
  | {
      kind: "overlap";
      aId: string;
      bId: string;
      a: FlowRect;
      b: FlowRect;
    }
  | {
      kind: "escape";
      childId: string;
      parentId: string;
      child: FlowRect;
      parent: FlowRect;
    }
  | { kind: "missingRect"; nodeId: string }
  | { kind: "missingParent"; childId: string; parentId: string };

/** Group flow nodes by parent id (`undefined` = canvas roots, incl. harness). */
function siblingsByParent(
  nodes: readonly FlowGeometryNode[],
): Map<string | undefined, FlowGeometryNode[]> {
  const groups = new Map<string | undefined, FlowGeometryNode[]>();
  for (const node of nodes) {
    const key = node.parentId;
    const group = groups.get(key);
    if (group) group.push(node);
    else groups.set(key, [node]);
  }
  return groups;
}

export function formatLayoutViolation(
  violation: LayoutInvariantViolation,
): string {
  switch (violation.kind) {
    case "overlap":
      return (
        `siblings "${violation.aId}" and "${violation.bId}" overlap` +
        ` (${JSON.stringify(violation.a)} vs ${JSON.stringify(violation.b)})`
      );
    case "escape":
      return (
        `child "${violation.childId}" escapes parent "${violation.parentId}"` +
        ` (${JSON.stringify(violation.child)} not in ${JSON.stringify(violation.parent)})`
      );
    case "missingRect":
      return `missing rect for node "${violation.nodeId}"`;
    case "missingParent":
      return (
        `child "${violation.childId}" references missing parent` +
        ` "${violation.parentId}"`
      );
  }
}

/**
 * Layout violations over `harnessToFlowNodes` output: overlapping siblings, or
 * a child rectangle that escapes its parent.
 */
export function layoutInvariantViolations(
  nodes: readonly FlowGeometryNode[],
): LayoutInvariantViolation[] {
  const rects = flowNodeRects(nodes);
  const violations: LayoutInvariantViolation[] = [];

  for (const node of nodes) {
    if (!rects.has(node.id)) {
      violations.push({ kind: "missingRect", nodeId: node.id });
    }
  }

  for (const [, siblings] of siblingsByParent(nodes)) {
    for (let i = 0; i < siblings.length; i++) {
      for (let j = i + 1; j < siblings.length; j++) {
        const a = siblings[i]!;
        const b = siblings[j]!;
        const rectA = rects.get(a.id);
        const rectB = rects.get(b.id);
        // Missing entries are already reported above; skip pair checks.
        if (!rectA || !rectB) continue;
        if (rectsOverlap(rectA, rectB)) {
          violations.push({
            kind: "overlap",
            aId: a.id,
            bId: b.id,
            a: rectA,
            b: rectB,
          });
        }
      }
    }
  }

  for (const node of nodes) {
    if (node.parentId === undefined) continue;
    const childRect = rects.get(node.id);
    if (!childRect) continue;
    const parentRect = rects.get(node.parentId);
    if (!parentRect) {
      violations.push({
        kind: "missingParent",
        childId: node.id,
        parentId: node.parentId,
      });
      continue;
    }
    if (!containsRect(parentRect, childRect)) {
      violations.push({
        kind: "escape",
        childId: node.id,
        parentId: node.parentId,
        child: childRect,
        parent: parentRect,
      });
    }
  }

  return violations;
}

/** Assert no sibling overlap and every child stays inside its parent. */
export function assertLayoutInvariants(
  nodes: readonly FlowGeometryNode[],
): void {
  const violations = layoutInvariantViolations(nodes);
  if (violations.length === 0) return;
  throw new Error(
    `layout invariant failed:\n${violations
      .map((v) => `  - ${formatLayoutViolation(v)}`)
      .join("\n")}`,
  );
}
