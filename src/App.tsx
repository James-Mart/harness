import { useMemo } from "react";

import {
  HARNESS_SEED_IDS,
  readHarnessBootstrap,
} from "@/app/harnessBootstrap";
import { useHarnessWorkspace } from "@/app/useHarnessWorkspace";
import { Button } from "@/components/ui/button";
import { EditorLayout } from "@/components/layout/EditorLayout";

function App() {
  const bootstrap = useMemo(() => readHarnessBootstrap(), []);
  const workspace = useHarnessWorkspace(bootstrap);
  const selectedHarness = workspace.selectedHarness;
  const selectedId = workspace.selectedId;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="text-lg font-semibold">Harness</h1>
        {bootstrap.demoHarness === undefined ? (
          <div
            className="inline-flex rounded-lg border p-0.5"
            role="group"
            aria-label="Harness seed"
            data-testid="harness-toggle"
          >
            <Button
              type="button"
              size="sm"
              variant={
                selectedId === HARNESS_SEED_IDS.tracker ? "default" : "ghost"
              }
              data-testid="harness-seed-tracker"
              aria-pressed={selectedId === HARNESS_SEED_IDS.tracker}
              onClick={() =>
                workspace.selectHarness(HARNESS_SEED_IDS.tracker)
              }
            >
              Tracker
            </Button>
            <Button
              type="button"
              size="sm"
              variant={
                selectedId === HARNESS_SEED_IDS.eunomio ? "default" : "ghost"
              }
              data-testid="harness-seed-eunomio"
              aria-pressed={selectedId === HARNESS_SEED_IDS.eunomio}
              onClick={() =>
                workspace.selectHarness(HARNESS_SEED_IDS.eunomio)
              }
            >
              Eunomio
            </Button>
          </div>
        ) : null}
      </header>
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
  );
}

export default App;
