import { Handle, Position } from "@xyflow/react";

import { FLOW_LAYOUT } from "@/components/canvas/layoutTokens";
import {
  portsByDirection,
  schemaAccent,
} from "@/components/canvas/portVisuals";
import { cn } from "@/lib/utils";
import { schemaCompatKey } from "@/model/schema";
import type { Port } from "@/model/types";

type NodePortHandlesProps = {
  ports: readonly Port[];
  /** Pixel Y centers for `count` ports — from shared layout tokens. */
  handleTops: (count: number) => number[];
  /** When false, skip inline name/type labels (handles only). */
  showLabels?: boolean;
};

export function NodePortHandles({
  ports,
  handleTops,
  showLabels = true,
}: NodePortHandlesProps) {
  const { inputs, outputs } = portsByDirection(ports);
  const inputTops = handleTops(inputs.length);
  const outputTops = handleTops(outputs.length);

  return (
    <>
      {inputs.map((port, index) => (
        <PortHandle
          key={port.id}
          port={port}
          type="target"
          position={Position.Left}
          topPx={inputTops[index]!}
          showLabel={showLabels}
        />
      ))}
      {outputs.map((port, index) => (
        <PortHandle
          key={port.id}
          port={port}
          type="source"
          position={Position.Right}
          topPx={outputTops[index]!}
          showLabel={showLabels}
        />
      ))}
    </>
  );
}

type PortHandleProps = {
  port: Port;
  type: "source" | "target";
  position: Position;
  topPx: number;
  showLabel: boolean;
};

function PortHandle({
  port,
  type,
  position,
  topPx,
  showLabel,
}: PortHandleProps) {
  const accent = schemaAccent(port.schema);
  const typeName = schemaCompatKey(port.schema);
  const isInput = port.direction === "in";
  const top = `${topPx}px`;
  const labelInset = `${FLOW_LAYOUT.portLabelInsetX}px`;

  return (
    <>
      <Handle
        id={port.id}
        type={type}
        position={position}
        className={cn(
          "!h-2.5 !w-2.5 !border-2 !bg-card",
          isInput && port.required !== true && "!border-dashed",
        )}
        style={{ top, borderColor: accent, backgroundColor: "var(--card)" }}
        data-testid={`port-${port.id}`}
        data-port-direction={port.direction}
        data-port-type={typeName}
        data-iterable={port.iterable ? "true" : undefined}
        title={`${port.name}: ${typeName}`}
      />
      {showLabel ? (
        <span
          className={cn(
            "pointer-events-none absolute text-[0.6rem] leading-none",
            isInput ? "text-left" : "text-right",
          )}
          style={{
            top,
            transform: "translateY(-50%)",
            color: accent,
            ...(isInput ? { left: labelInset } : { right: labelInset }),
          }}
          data-testid={`port-label-${port.id}`}
        >
          <span className="text-foreground/80 font-medium">{port.name}</span>
          {isInput && port.required !== true ? (
            <span className="text-muted-foreground">?</span>
          ) : null}
          <span className="text-muted-foreground"> · {typeName}</span>
        </span>
      ) : null}
    </>
  );
}
