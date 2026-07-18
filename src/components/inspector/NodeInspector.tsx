import { Button } from "@/components/ui/button";
import type { InspectorEdgeView } from "@/components/canvas/flowTypes";
import {
  DetailRow,
  InspectorCard,
} from "@/components/inspector/inspectorChrome";
import { RunConfigParams } from "@/components/inspector/RunConfigParams";
import { SignatureSection } from "@/components/inspector/SignatureSection";
import {
  StructuralParams,
  type AppendTarget,
} from "@/components/inspector/StructuralParams";
import { EditorSidebar } from "@/components/layout/EditorSidebar";
import type { NodeUpdate, RunConfigUpdate } from "@/model";
import type { Node, Port, RunConfig } from "@/model/types";

export type InspectorTarget =
  | { kind: "node"; node: Node }
  | { kind: "harness"; title: string; ports: Port[] }
  | { kind: "edge"; edge: InspectorEdgeView }
  | null;

type NodeInspectorProps = {
  target: InspectorTarget;
  runConfig?: RunConfig;
  onDeleteNode?: (nodeId: string) => void;
  onUpdateNode?: (nodeId: string, update: NodeUpdate) => void;
  onUpdateRunConfig?: (update: RunConfigUpdate) => void;
  onDeleteEdge?: (edgeId: string) => void;
  /** Live containers a leaf may append into. */
  appendTargets?: AppendTarget[];
  /** When true, disable edits and hide delete controls (Run mode). */
  readOnly?: boolean;
};

const EDGE_KIND_LABEL: Record<InspectorEdgeView["edgeKind"], string> = {
  data: "Data wire",
  exec: "Exec edge",
  append: "Append edge",
};

function handleLabel(handle?: string | null): string | null {
  return handle === undefined || handle === null ? null : handle;
}

export function NodeInspector({
  target,
  runConfig,
  onDeleteNode,
  onUpdateNode,
  onUpdateRunConfig,
  onDeleteEdge,
  appendTargets,
  readOnly = false,
}: NodeInspectorProps) {
  const selectedNode = target?.kind === "node" ? target.node : null;
  const canEdit = !readOnly;

  return (
    <EditorSidebar title="Inspector" side="right" data-testid="node-inspector">
      {target?.kind === "node" ? (
        <div className="space-y-4">
          <InspectorCard>
            <p className="text-sm font-medium" data-testid="inspector-title">
              {target.node.title}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {target.node.id}
            </p>
          </InspectorCard>
          <InspectorCard className="space-y-4">
            <SignatureSection ports={target.node.ports} />
            <StructuralParams
              node={target.node}
              onUpdateNode={onUpdateNode ?? (() => undefined)}
              appendTargets={appendTargets}
              readOnly={readOnly}
            />
          </InspectorCard>
          {canEdit && onDeleteNode ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="w-full"
              data-testid="inspector-delete"
              onClick={() => onDeleteNode(target.node.id)}
            >
              Delete node
            </Button>
          ) : null}
        </div>
      ) : target?.kind === "edge" ? (
        <div className="space-y-4" data-testid="inspector-edge">
          <InspectorCard>
            <p className="text-sm font-medium" data-testid="inspector-title">
              {EDGE_KIND_LABEL[target.edge.edgeKind]}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {target.edge.id}
            </p>
          </InspectorCard>
          <InspectorCard>
            <dl className="space-y-1.5 text-sm">
              <DetailRow label="From" testId="inspector-edge-source">
                {target.edge.source}
                {handleLabel(target.edge.sourceHandle)
                  ? ` · ${handleLabel(target.edge.sourceHandle)}`
                  : ""}
              </DetailRow>
              <DetailRow label="To" testId="inspector-edge-target">
                {target.edge.target}
                {handleLabel(target.edge.targetHandle)
                  ? ` · ${handleLabel(target.edge.targetHandle)}`
                  : ""}
              </DetailRow>
              {target.edge.branch !== undefined ? (
                <DetailRow label="Branch" testId="inspector-edge-branch">
                  {target.edge.branch}
                </DetailRow>
              ) : null}
            </dl>
          </InspectorCard>
          {canEdit && onDeleteEdge ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="w-full"
              data-testid="inspector-edge-delete"
              onClick={() => onDeleteEdge(target.edge.id)}
            >
              Delete edge
            </Button>
          ) : null}
        </div>
      ) : target?.kind === "harness" ? (
        <div className="space-y-4">
          <InspectorCard>
            <p className="text-sm font-medium" data-testid="inspector-title">
              {target.title}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">Harness</p>
          </InspectorCard>
          <InspectorCard>
            <SignatureSection ports={target.ports} />
          </InspectorCard>
        </div>
      ) : (
        <InspectorCard>
          <p className="text-muted-foreground text-sm">
            Select a node or edge to inspect.
          </p>
        </InspectorCard>
      )}
      {runConfig !== undefined && onUpdateRunConfig ? (
        <InspectorCard>
          <RunConfigParams
            runConfig={runConfig}
            selectedNode={selectedNode}
            onUpdateRunConfig={onUpdateRunConfig}
            readOnly={readOnly}
          />
        </InspectorCard>
      ) : null}
    </EditorSidebar>
  );
}
