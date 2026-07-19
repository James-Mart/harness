import { useMemo } from "react";

import { readHarnessBootstrap } from "@/app/harnessBootstrap";
import { useHarnessWorkspace } from "@/app/useHarnessWorkspace";
import { EditorLayout } from "@/components/layout/EditorLayout";
import { HarnessSidebar } from "@/components/layout/HarnessSidebar";

function App() {
  const bootstrap = useMemo(() => readHarnessBootstrap(), []);
  const workspace = useHarnessWorkspace(bootstrap);
  const selectedHarness = workspace.selectedHarness;
  const showHarnessSidebar = bootstrap.demoHarness === undefined;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center border-b px-4 py-2">
        <h1 className="text-lg font-semibold" data-testid="harness-title">
          {selectedHarness?.title ?? "Harness"}
        </h1>
      </header>
      <div className="flex min-h-0 flex-1">
        {showHarnessSidebar ? (
          <HarnessSidebar
            harnesses={workspace.harnesses}
            selectedId={workspace.selectedId}
            onSelect={workspace.selectHarness}
            onAdd={workspace.addHarness}
            onRename={workspace.renameHarness}
            onDelete={workspace.deleteHarness}
          />
        ) : null}
        <main className="min-h-0 flex-1">
          {selectedHarness !== null ? (
            <EditorLayout
              key={selectedHarness.id}
              harness={selectedHarness}
              onHarnessChange={workspace.updateHarness}
            />
          ) : (
            <div
              className="text-muted-foreground flex h-full items-center justify-center text-sm"
              data-testid="harness-empty-state"
            >
              No harness selected
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
