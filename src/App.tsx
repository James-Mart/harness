import { EditorLayout } from "@/components/layout/EditorLayout";

function App() {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="text-lg font-semibold">Harness</h1>
      </header>
      <main className="min-h-0 flex-1">
        <EditorLayout />
      </main>
    </div>
  );
}

export default App;
