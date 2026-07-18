import { EditorLayout } from "@/components/layout/EditorLayout";
import {
  createWorkPoolCueDemoHarness,
  createWorkPoolSeedHarness,
  type Harness,
} from "@/model";

/** Dev-only seed switch for browser checks (`?seed=workpool` / `workpool-cues`). */
function initialHarnessFromSearch(): Harness | undefined {
  if (!import.meta.env.DEV) return undefined;
  const seed = new URLSearchParams(window.location.search).get("seed");
  if (seed === "workpool-cues") return createWorkPoolCueDemoHarness();
  if (seed === "workpool") return createWorkPoolSeedHarness();
  return undefined;
}

function App() {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="text-lg font-semibold">Harness</h1>
      </header>
      <main className="min-h-0 flex-1">
        <EditorLayout initialHarness={initialHarnessFromSearch()} />
      </main>
    </div>
  );
}

export default App;
