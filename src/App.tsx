import { HarnessCanvas } from "@/components/canvas/HarnessCanvas";
import { Button } from "@/components/ui/button";

function App() {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="text-lg font-semibold">Harness</h1>
        <Button variant="outline" size="sm">
          Button
        </Button>
      </header>
      <main className="min-h-0 flex-1">
        <HarnessCanvas />
      </main>
    </div>
  );
}

export default App;
