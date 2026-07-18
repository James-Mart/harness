import {
  InspectorCheckbox,
  OptionalPositiveIntField,
} from "@/components/inspector/inspectorChrome";
import { isGateEnabled, type RunConfigUpdate } from "@/model";
import type { Node, RunConfig } from "@/model/types";

type RunConfigParamsProps = {
  runConfig: RunConfig;
  /** Currently selected graph node, when the inspector target is a node. */
  selectedNode?: Node | null;
  onUpdateRunConfig: (update: RunConfigUpdate) => void;
};

export function RunConfigParams({
  runConfig,
  selectedNode = null,
  onUpdateRunConfig,
}: RunConfigParamsProps) {
  const container =
    selectedNode?.kind === "container" ? selectedNode : null;
  const gate =
    selectedNode?.kind === "leaf" && selectedNode.isGate
      ? selectedNode
      : null;
  const showConcurrency =
    container !== null && container.concurrency.kind === "parallel";
  const override = container
    ? runConfig.perContainer[container.id]?.maxConcurrency
    : undefined;

  return (
    <section data-testid="inspector-run-config" className="space-y-2.5">
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Run config
      </h3>

      <OptionalPositiveIntField
        label="Depth bound"
        id="run-config-depth-bound"
        testId="run-config-depth-bound"
        placeholder="∞"
        value={runConfig.depthBound}
        onChange={(value) => onUpdateRunConfig({ field: "depthBound", value })}
      />

      {showConcurrency && container ? (
        <OptionalPositiveIntField
          label="Max concurrency (this run)"
          id="run-config-max-concurrency"
          testId="run-config-max-concurrency"
          placeholder="structural default"
          value={override}
          onChange={(value) =>
            onUpdateRunConfig({
              field: "containerMaxConcurrency",
              containerId: container.id,
              value,
            })
          }
        />
      ) : null}

      {gate ? (
        <InspectorCheckbox
          data-testid="run-config-gate-enabled"
          label="Gate enabled (this run)"
          checked={isGateEnabled(runConfig, gate.id)}
          onChange={(event) =>
            onUpdateRunConfig({
              field: "gateEnabled",
              gateId: gate.id,
              enabled: event.target.checked,
            })
          }
        />
      ) : null}
    </section>
  );
}
