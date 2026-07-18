import { useMemo, useState } from "react";

import {
  createHarnessForSeed,
  readHarnessBootstrap,
  type HarnessSeedKey,
} from "@/app/harnessBootstrap";
import { Button } from "@/components/ui/button";
import { EditorLayout } from "@/components/layout/EditorLayout";

function App() {
  const bootstrap = useMemo(() => readHarnessBootstrap(), []);
  const [seedKey, setSeedKey] = useState<HarnessSeedKey>(bootstrap.seedKey);
  const harness = useMemo(
    () => bootstrap.demoHarness ?? createHarnessForSeed(seedKey),
    [bootstrap.demoHarness, seedKey],
  );

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
              variant={seedKey === "tracker" ? "default" : "ghost"}
              data-testid="harness-seed-tracker"
              aria-pressed={seedKey === "tracker"}
              onClick={() => setSeedKey("tracker")}
            >
              Tracker
            </Button>
            <Button
              type="button"
              size="sm"
              variant={seedKey === "eunomio" ? "default" : "ghost"}
              data-testid="harness-seed-eunomio"
              aria-pressed={seedKey === "eunomio"}
              onClick={() => setSeedKey("eunomio")}
            >
              Eunomio
            </Button>
          </div>
        ) : null}
      </header>
      <main className="min-h-0 flex-1">
        <EditorLayout
          key={bootstrap.demoHarness?.id ?? seedKey}
          initialHarness={harness}
        />
      </main>
    </div>
  );
}

export default App;
