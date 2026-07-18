import { describe, expect, it } from "vitest";

import { EUNOMIO_HARNESS_ID, TRACKER_HARNESS_ID, type Harness } from "@/model";
import {
  EUNOMIO_PARTITION_ROOTS,
  scriptForHarness,
  TRACKER_STRESS_ROOTS,
} from "@/sim";

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
    expect(
      scriptForHarness({ id: TRACKER_HARNESS_ID } as Harness).roots,
    ).toEqual([...TRACKER_STRESS_ROOTS]);
    expect(
      scriptForHarness({ id: EUNOMIO_HARNESS_ID } as Harness).roots,
    ).toEqual([...EUNOMIO_PARTITION_ROOTS]);
    expect(scriptForHarness({ id: "branching-seed" } as Harness).roots).toEqual(
      ["task-1", "task-2", "task-3"],
    );
    expect(scriptForHarness({ id: "unknown" } as Harness).roots).toEqual([]);
  });
});
