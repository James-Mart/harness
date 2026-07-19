import { Handle, Position } from "@xyflow/react";

import {
  execInHandleTop,
  execOutHandleTops,
} from "@/components/canvas/layoutTokens";
import { cn } from "@/lib/utils";
import { EXEC_IN_HANDLE, execOutHandleId } from "@/model/exec";

type ExecHandlesProps = {
  /**
   * Ordered exec-out branch slots (`undefined` = unbranched). Empty means no
   * outs (exec-in only) — used when a container's outs were re-routed onto
   * its body Exec helper.
   */
  branches: readonly (string | undefined)[];
  /** Y origin for the exec band (leaf: below title; container: header pad). */
  bandTop: number;
  /** When false, omit the exec-in handle (body Exec helpers are sources only). */
  showIn?: boolean;
};

/**
 * Synthetic exec-in / exec-out handles. Branch list comes from the harness
 * converter (`execOutBranchesForNode`) so pins match wired exec edges.
 */
export function ExecHandles({
  branches,
  bandTop,
  showIn = true,
}: ExecHandlesProps) {
  const layoutOutCount = Math.max(1, branches.length);
  const outTops =
    branches.length > 0 ? execOutHandleTops(branches.length, bandTop) : [];
  const inTop = execInHandleTop(layoutOutCount, bandTop);

  return (
    <>
      {showIn ? (
        <Handle
          id={EXEC_IN_HANDLE}
          type="target"
          position={Position.Left}
          className={cn(
            "!h-2 !w-2 !rounded-[1px] !border-0 !bg-foreground",
            "rotate-45",
          )}
          style={{ top: inTop }}
          data-testid="port-exec-in"
          data-exec="in"
          title="exec in"
        />
      ) : null}
      {branches.map((branch, index) => {
        const id = execOutHandleId(branch);
        return (
          <Handle
            key={id}
            id={id}
            type="source"
            position={Position.Right}
            className={cn(
              "!h-2 !w-2 !rounded-[1px] !border-0 !bg-foreground",
              "rotate-45",
            )}
            style={{ top: outTops[index]! }}
            data-testid={
              branch === undefined ? "port-exec-out" : `port-exec-out-${branch}`
            }
            data-exec="out"
            data-exec-branch={branch}
            title={branch === undefined ? "exec out" : `exec ${branch}`}
          />
        );
      })}
    </>
  );
}
