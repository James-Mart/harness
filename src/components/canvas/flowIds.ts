/**
 * Synthetic id for the harness body in edge endpoints and canvas helpers
 * (`$harness/$exec`, `$harness/$variables`, `$harness/$output`). Not a
 * rendered React Flow node — the boundary frame is gone; model `boundary`
 * ports surface on those helpers instead.
 */
export const HARNESS_FLOW_NODE_ID = "$harness" as const;
