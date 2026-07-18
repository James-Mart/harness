import type { NodeId } from "@/model/types";

/** One step along a scripted body traversal (node + optional exec branch). */
export type SimPathStep = { node: NodeId; branch?: string };

/** Fan-out: append items to a live pool when a body node is reached. */
export interface SimSpawn {
  /** Which body node triggers the spawn; omit to fire on path completion. */
  atNode?: NodeId;
  /** Target pool (self = recursion). */
  containerId: NodeId;
  /** SimItem ids appended when reached. */
  items: string[];
}

export interface SimItem {
  id: string;
  label: string;
  /** Pool this item belongs to. */
  containerId: NodeId;
  /** Ordered body traversal + exec branch taken. */
  path: SimPathStep[];
  spawns?: SimSpawn[];
}

export interface SimScript {
  /** Initial ready-set item ids. */
  roots: string[];
  items: Record<string, SimItem>;
}
