import { EditorSidebar } from "@/components/layout/EditorSidebar";

type NodeInspectorProps = {
  selectedNodeId: string | null;
};

export function NodeInspector({ selectedNodeId }: NodeInspectorProps) {
  return (
    <EditorSidebar title="Inspector" side="right" data-testid="node-inspector">
      {selectedNodeId ? (
        <div className="bg-card text-card-foreground rounded-lg border p-3">
          <p className="text-sm font-medium">Node {selectedNodeId}</p>
          <p className="text-muted-foreground mt-2 text-sm">
            Typed signature and parameters will appear here once the model
            lands.
          </p>
        </div>
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border p-3">
          <p className="text-muted-foreground text-sm">
            Select a node to edit its widgets and see its typed signature.
          </p>
        </div>
      )}
    </EditorSidebar>
  );
}
