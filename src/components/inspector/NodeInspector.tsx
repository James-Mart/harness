import { Button } from "@/components/ui/button";
import { InspectorCard } from "@/components/inspector/inspectorChrome";
import { SignatureSection } from "@/components/inspector/SignatureSection";
import { StructuralParams } from "@/components/inspector/StructuralParams";
import { EditorSidebar } from "@/components/layout/EditorSidebar";
import type { Node, Port } from "@/model/types";

export type InspectorTarget =
  | { kind: "node"; node: Node }
  | { kind: "harness"; title: string; ports: Port[] }
  | null;

type NodeInspectorProps = {
  target: InspectorTarget;
  onDeleteNode?: (nodeId: string) => void;
};

export function NodeInspector({ target, onDeleteNode }: NodeInspectorProps) {
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
            <StructuralParams node={target.node} />
          </InspectorCard>
          {onDeleteNode ? (
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
            Select a node to see its typed signature and structural parameters.
          </p>
        </InspectorCard>
      )}
    </EditorSidebar>
  );
}
