import { describe, expect, it } from "vitest";

import type { Harness } from "@/model";
import { scriptForHarness } from "@/sim";

describe("scriptForHarness", () => {
  it("maps known seed harness ids to deterministic scripts", () => {
    expect(scriptForHarness({ id: "base-seed" } as Harness).roots).toEqual([
      "task-1",
      "task-2",
      "task-3",
    ]);
    expect(scriptForHarness({ id: "workpool-seed" } as Harness).roots).toEqual([
      "root-a",
      "root-b",
    ]);
    expect(scriptForHarness({ id: "branching-seed" } as Harness).roots).toEqual(
      ["task-1", "task-2", "task-3"],
    );
    expect(scriptForHarness({ id: "unknown" } as Harness).roots).toEqual([]);
  });
});
