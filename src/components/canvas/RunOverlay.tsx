import { useMemo } from "react";
import { Panel, ViewportPortal } from "@xyflow/react";

import type { HarnessFlowNode } from "@/components/canvas/flowTypes";
import {
  projectRunOverlay,
  type ContainerLedgerRow,
  type CursorToken,
} from "@/authoring/runOverlayModel";
import { cn } from "@/lib/utils";
import type { RunState } from "@/sim";

type RunOverlayProps = {
  runState: RunState;
  nodes: readonly HarnessFlowNode[];
};

/**
 * Run-mode simulation overlay (option B): in-flight items are drawn as N
 * concurrent cursor highlights over the single body template, animating to
 * their next node at staggered per-cursor rates. A pool ledger tracks each
 * container's ready/in-flight/done counts and a terminal fixpoint is called out.
 */
export function RunOverlay({ runState, nodes }: RunOverlayProps) {
  const { rects, tokens, ledger, doneIds } = useMemo(
    () => projectRunOverlay(runState, nodes),
    [runState, nodes],
  );
  const atFixpoint = runState.status === "fixpoint";

  return (
    <>
      <ViewportPortal>
        <div
          className="pointer-events-none absolute left-0 top-0"
          data-testid="run-overlay"
        >
          {doneIds.map((id) => {
            const rect = rects.get(id);
            if (!rect) return null;
            return (
              <div
                key={id}
                data-testid={`run-done-${id}`}
                className="bg-background/55 border-border/40 absolute rounded-xl border border-dashed"
                style={{
                  left: rect.x,
                  top: rect.y,
                  width: rect.width,
                  height: rect.height,
                }}
              />
            );
          })}
          {tokens.map((token) => (
            <CursorChip key={token.itemId} token={token} />
          ))}
        </div>
      </ViewportPortal>

      <Panel position="top-right">
        <div
          className="bg-card/95 text-card-foreground w-52 rounded-lg border p-2 text-xs shadow-md"
          data-testid="run-ledger"
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="font-medium">Work pools</span>
            {atFixpoint ? (
              <span
                className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-medium text-emerald-600 dark:text-emerald-400"
                data-testid="run-fixpoint"
              >
                fixpoint
              </span>
            ) : null}
          </div>
          <div className="text-muted-foreground grid grid-cols-[1fr_auto_auto_auto] gap-x-2 gap-y-0.5">
            <span className="sr-only">Container</span>
            <span className="text-right" title="ready">
              rdy
            </span>
            <span className="text-right" title="in flight">
              run
            </span>
            <span className="text-right" title="done">
              done
            </span>
            {ledger.map((row) => (
              <LedgerRow key={row.containerId} row={row} />
            ))}
          </div>
        </div>
      </Panel>
    </>
  );
}

function LedgerRow({ row }: { row: ContainerLedgerRow }) {
  return (
    <div className="contents" data-testid={`run-ledger-row-${row.containerId}`}>
      <span
        className={cn(
          "text-foreground truncate",
          row.fixpoint && row.done > 0 && "text-muted-foreground",
        )}
        data-testid={`run-ledger-${row.containerId}`}
        data-ready={row.ready}
        data-in-flight={row.inFlight}
        data-done={row.done}
        title={row.title}
      >
        {row.title}
      </span>
      <span className="text-right tabular-nums">{row.ready}</span>
      <span className="text-right tabular-nums">{row.inFlight}</span>
      <span className="text-right tabular-nums">{row.done}</span>
    </div>
  );
}

function CursorChip({ token }: { token: CursorToken }) {
  return (
    <div
      className="absolute"
      data-testid={`run-cursor-${token.itemId}`}
      data-phase={token.phase}
      data-progress={token.progress.toFixed(3)}
      style={{
        left: token.x,
        top: token.y,
        opacity: token.opacity,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div
        className={cn(
          "border-primary/70 bg-primary text-primary-foreground rounded-full border-2 px-2 py-0.5 text-[0.6rem] font-semibold whitespace-nowrap shadow-lg ring-2 ring-primary/25",
        )}
      >
        {token.label}
      </div>
    </div>
  );
}
