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
        <h1 className="text-lg font-semibold">Harness</h1>
      </header>
      <div className="flex min-h-0 flex-1">
        {showHarnessSidebar ? (
          <HarnessSidebar
            harnesses={workspace.harnesses}
            selectedId={workspace.selectedId}
            onSelect={workspace.selectHarness}
            onAdd={workspace.addHarness}
          />
        ) : null}
        <main className="min-h-0 flex-1">
          {selectedHarness !== null ? (
            <EditorLayout
              key={selectedHarness.id}
              harness={selectedHarness}
              onHarnessChange={workspace.updateHarness}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}

export default App;
