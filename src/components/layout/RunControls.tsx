import { Button } from "@/components/ui/button";
import type { RunStatus } from "@/sim/engine";
import type { EditorMode } from "@/authoring/useRunSimulation";

export const SPEED_OPTIONS = [0.5, 1, 2, 4, 8] as const;

type RunControlsProps = {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  onStep: () => void;
  onReset: () => void;
  canStep: boolean;
  speed: number;
  onSpeedChange: (speed: number) => void;
  status?: RunStatus | null;
};

export function RunControls({
  mode,
  onModeChange,
  onStep,
  onReset,
  canStep,
  speed,
  onSpeedChange,
  status = null,
}: RunControlsProps) {
  const inRun = mode === "run";

  return (
    <div
      className="flex flex-wrap items-center gap-3 border-b px-3 py-2"
      data-testid="run-controls"
      data-editor-mode={mode}
      data-run-status={status ?? "none"}
    >
      <div
        className="inline-flex rounded-lg border p-0.5"
        role="group"
        aria-label="Editor mode"
      >
        <Button
          type="button"
          size="sm"
          variant={mode === "edit" ? "default" : "ghost"}
          data-testid="mode-edit"
          aria-pressed={mode === "edit"}
          onClick={() => onModeChange("edit")}
        >
          Edit
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "run" ? "default" : "ghost"}
          data-testid="mode-run"
          aria-pressed={mode === "run"}
          onClick={() => onModeChange("run")}
        >
          Run
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="run-step"
          disabled={!canStep}
          onClick={onStep}
        >
          Step
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="run-reset"
          disabled={!inRun}
          onClick={onReset}
        >
          Reset
        </Button>
        <label className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <span>Speed</span>
          <select
            className="border-input bg-background h-7 rounded-md border px-2 text-sm"
            data-testid="run-speed"
            disabled={!inRun}
            value={String(speed)}
            onChange={(event) => onSpeedChange(Number(event.target.value))}
            aria-label="Speed multiplier"
          >
            {SPEED_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}×
              </option>
            ))}
          </select>
        </label>
        {inRun && status ? (
          <span
            className="text-muted-foreground text-xs"
            data-testid="run-status-label"
          >
            {status}
          </span>
        ) : null}
      </div>
    </div>
  );
}
